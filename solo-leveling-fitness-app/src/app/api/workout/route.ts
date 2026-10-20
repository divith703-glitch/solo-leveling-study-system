import { toggleExercise } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { exerciseId?: string };
    if (!body.exerciseId) {
      return Response.json({ ok: false, error: "exerciseId required" }, { status: 400 });
    }
    const result = await toggleExercise(body.exerciseId);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("workout error", err);
    return Response.json({ ok: false, error: "Training log fault" }, { status: 500 });
  }
}
