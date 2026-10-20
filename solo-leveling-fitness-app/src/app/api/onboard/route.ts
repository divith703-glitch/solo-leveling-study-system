import { onboardHunter } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    await onboardHunter({
      name: String(body.name ?? "HUNTER"),
      dailyTask: String(body.dailyTask ?? "Complete today's prescribed training"),
      taskPrompt: body.taskPrompt ? String(body.taskPrompt) : "",
      timezone: typeof body.timezone === "string" ? body.timezone : undefined,
      deadlineMinutes: Number(body.deadlineMinutes ?? 1380),
      reminderMinutes: Number(body.reminderMinutes ?? 540),
      verificationMode: String(body.verificationMode ?? "photo"),
      timerMinimumMinutes: Number(body.timerMinimumMinutes ?? 20),
      primaryCategory: (body.primaryCategory as never) ?? "STR",
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("onboard error", err);
    return Response.json({ ok: false, error: "Awakening failed" }, { status: 500 });
  }
}
