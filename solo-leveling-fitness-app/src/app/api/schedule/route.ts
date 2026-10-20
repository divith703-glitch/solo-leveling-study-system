import { setDayMode, setHolidays, toggleScheduleBlock } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    if (action === "set_mode") {
      const result = await setDayMode(String(body.mode ?? ""));
      return Response.json(result);
    }
    if (action === "toggle_block") {
      const result = await toggleScheduleBlock(String(body.blockId ?? ""));
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }
    if (action === "holidays") {
      const result = await setHolidays(
        Array.isArray(body.dates) ? (body.dates as string[]) : [],
      );
      return Response.json(result);
    }
    return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("schedule error", err);
    return Response.json({ ok: false, error: "Mission clock fault" }, { status: 500 });
  }
}
