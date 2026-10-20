/**
 * ============================================================================
 *  AI PHOTO VERIFICATION — free-tier only (Gemini -> Groq -> honor mode)
 * ============================================================================
 *  Fallback chain: retry with backoff -> next Gemini model -> Groq -> UNAVAILABLE
 *  (UNAVAILABLE means the log degrades to honor mode; it never blocks the log.)
 * ============================================================================
 */
import { createHash } from "node:crypto";

export type Verdict = "VERIFIED" | "NOT_VERIFIED" | "UNAVAILABLE";
export type VerifyResult = {
  verdict: Verdict;
  reason: string;
  provider: string;
  model: string | null;
};

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function geminiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    null
  );
}
function groqKey(): string | null {
  return process.env.GROQ_API_KEY || null;
}
export function hasVisionKey(): boolean {
  return Boolean(geminiKey() || groqKey());
}

const GEMINI_MODELS = [
  process.env.GEMINI_VISION_MODEL,
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
].filter(Boolean) as string[];

const GROQ_MODELS = [
  process.env.GROQ_VISION_MODEL,
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.2-11b-vision-preview",
].filter(Boolean) as string[];

export function buildPrompt(taskName: string, taskPrompt: string): string {
  return [
    "You are the anti-cheat verification unit of a discipline-tracking system.",
    `The user's declared daily task is: "${taskName}".`,
    taskPrompt
      ? `Task details: ${taskPrompt}`
      : "No extra details were provided.",
    "Decide whether the photo is plausible evidence that the user actually performed this task today.",
    "Be strict about obvious cheating (stock images, screenshots, unrelated objects, a plate of food instead of a gym).",
    "Do not judge image quality harshly — a real blurry gym photo is still valid evidence.",
    "Respond ONLY in this exact format, nothing else:",
    "VERIFIED: <one short line of evidence>",
    "or",
    "NOT_VERIFIED: <one short line explaining what is wrong>",
  ].join("\n");
}

function parseVerdict(text: string): { verdict: Verdict; reason: string } {
  const clean = (text || "").trim().toUpperCase();
  const line = clean.split("\n").find((l) => l.includes("VERIFIED")) ?? clean;
  const reason = line.replace(/^(NOT_)?VERIFIED:?\s*/i, "").trim() || line.slice(0, 120);
  if (clean.includes("NOT_VERIFIED")) return { verdict: "NOT_VERIFIED", reason };
  if (clean.includes("VERIFIED")) return { verdict: "VERIFIED", reason };
  return { verdict: "UNAVAILABLE", reason: "Unparseable verifier response" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(
  model: string,
  prompt: string,
  base64: string,
  mimeType: string,
): Promise<{ ok: boolean; text: string; status: number }> {
  const key = geminiKey();
  if (!key) return { ok: false, text: "no key", status: 0 };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 60 },
      }),
    },
  );
  if (!res.ok) return { ok: false, text: await res.text(), status: res.status };
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return { ok: true, text, status: res.status };
}

async function callGroq(
  model: string,
  prompt: string,
  base64: string,
  mimeType: string,
): Promise<{ ok: boolean; text: string; status: number }> {
  const key = groqKey();
  if (!key) return { ok: false, text: "no key", status: 0 };
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 60,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) return { ok: false, text: await res.text(), status: res.status };
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return { ok: true, text: json.choices?.[0]?.message?.content ?? "", status: res.status };
}

export async function verifyPhoto(input: {
  base64: string;
  mimeType: string;
  taskName: string;
  taskPrompt: string;
}): Promise<VerifyResult> {
  const prompt = buildPrompt(input.taskName, input.taskPrompt);
  const key = geminiKey();

  if (key) {
    // backoff retry, then walk the model list (free-tier model names rotate)
    for (const model of GEMINI_MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await callGemini(model, prompt, input.base64, input.mimeType);
          if (r.ok) {
            const parsed = parseVerdict(r.text);
            if (parsed.verdict !== "UNAVAILABLE") {
              return { ...parsed, provider: "gemini", model };
            }
          }
          if (r.status === 400 || r.status === 404) break; // try next model
          await sleep(400 * (attempt + 1));
        } catch {
          await sleep(400 * (attempt + 1));
        }
      }
    }
  }

  if (groqKey()) {
    for (const model of GROQ_MODELS) {
      try {
        const r = await callGroq(model, prompt, input.base64, input.mimeType);
        if (r.ok) {
          const parsed = parseVerdict(r.text);
          if (parsed.verdict !== "UNAVAILABLE") {
            return { ...parsed, provider: "groq", model };
          }
        }
      } catch {
        /* keep falling back */
      }
    }
  }

  return {
    verdict: "UNAVAILABLE",
    reason: key
      ? "Verifier unreachable (rate limit / network). Proof queued — streak safe, XP held."
      : "No AI verification key present. Proof queued for later verification.",
    provider: key ? "gemini" : "none",
    model: null,
  };
}
