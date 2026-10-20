import { setHolidays, updateSettings } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (Array.isArray(body.holidayDates)) {
      await setHolidays(body.holidayDates as string[]);
    }
    await updateSettings(body);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("settings error", err);
    return Response.json({ ok: false, error: "Could not save settings" }, { status: 500 });
  }
}
