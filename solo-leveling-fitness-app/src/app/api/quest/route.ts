import {
  acceptEmergency,
  addBonusQuest,
  addPresetBonus,
  removeQuest,
  toggleQuestGoal,
} from "@/lib/state";
import type { Attr } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    switch (action) {
      case "add":
        await addBonusQuest(
          String(body.title ?? "BONUS QUEST").slice(0, 60),
          String(body.description ?? "").slice(0, 200),
          Math.min(200, Math.max(5, Math.round(Number(body.xpReward ?? 30)))),
          (String(body.statReward ?? "STR") as Attr) ?? "STR",
        );
        return Response.json({ ok: true });
      case "preset":
        await addPresetBonus(Math.round(Number(body.index ?? 0)));
        return Response.json({ ok: true });
      case "remove":
        await removeQuest(Math.round(Number(body.id)));
        return Response.json({ ok: true });
      case "toggle_goal":
        await toggleQuestGoal(Math.round(Number(body.id)), Math.round(Number(body.goalIndex)));
        return Response.json({ ok: true });
      case "accept_emergency":
        await acceptEmergency();
        return Response.json({ ok: true });
      default:
        return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("quest error", err);
    return Response.json({ ok: false, error: "Quest board fault" }, { status: 500 });
  }
}
