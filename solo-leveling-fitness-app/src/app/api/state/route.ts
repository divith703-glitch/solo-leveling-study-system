import { getSnapshot, safeTimezone } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tz = safeTimezone(url.searchParams.get("tz") ?? undefined);
  try {
    if (tz) {
      const { updateSettings } = await import("@/lib/state");
      await updateSettings({ timezone: tz });
    }
    const state = await getSnapshot();
    return Response.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("state error", err);
    return Response.json({ ok: false, error: "System fault" }, { status: 500 });
  }
}
