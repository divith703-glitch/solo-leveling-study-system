import { submitDailyLog } from "@/lib/state";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      method?: string;
      photoDataUrl?: string;
      durationSec?: number;
      gps?: string;
      note?: string;
    };
    const result = await submitDailyLog({
      method: body.method,
      photoDataUrl: body.photoDataUrl,
      durationSec: body.durationSec,
      gps: body.gps,
      note: body.note,
    });
    if (result.ok) return Response.json(result);
    const status =
      result.code === "ALREADY_LOGGED"
        ? 409
        : result.code === "PHOTO_REUSE"
          ? 409
          : result.code === "NOT_VERIFIED" || result.code === "HONOR_MODE_AVAILABLE"
            ? 422
            : 400;
    return Response.json(result, { status });
  } catch (err) {
    console.error("daily-log error", err);
    return Response.json(
      { ok: false, error: "Verification pipeline fault", code: "INVALID_PHOTO" },
      { status: 500 },
    );
  }
}
