import { guardAttempt, guardEscape, guardForceDisable } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    if (action === "attempt") {
      const result = await guardAttempt(String(body.app ?? ""));
      return Response.json({ ok: true, ...result });
    }
    if (action === "escape") {
      await guardEscape();
      return Response.json({ ok: true });
    }
    if (action === "force_disable") {
      const result = await guardForceDisable(
        String(body.sentence ?? ""),
        Number(body.requestedAt ?? Date.now()),
      );
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }
    return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("guard error", err);
    return Response.json({ ok: false, error: "Guard fault" }, { status: 500 });
  }
}
