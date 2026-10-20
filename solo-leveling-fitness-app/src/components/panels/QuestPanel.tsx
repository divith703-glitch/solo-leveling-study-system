"use client";

import { useEffect, useState } from "react";
import { BONUS_PRESETS, ATTRS, type Attr } from "@/lib/game";
import { JEENIUS_INTENT, JEENIUS_PACKAGE, JEENIUS_PLAY_STORE } from "@/lib/schedule";
import type { QuestView, SystemState } from "@/lib/api-types";
import { Divider, SysButton, SysWindow, SectionTitle } from "../SystemUI";

function openJeenius() {
  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  if (isAndroid) {
    window.location.href = JEENIUS_INTENT;
  } else {
    window.open(JEENIUS_PLAY_STORE, "_blank", "noopener");
  }
}

function SubwayCard({
  q,
  busy,
  onToggle,
}: {
  q: QuestView;
  busy: boolean;
  onToggle: (id: number, idx: number) => void;
}) {
  const done = q.goals.length > 0 && q.goals.every((g) => g.done);
  return (
    <SysWindow title="SUBWAY — MIT PREP ROUTE" tag="DAILY TRANSIT" tone="violet">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-sm tracking-[0.14em] text-violet glow-text">
              {q.title}
            </div>
            <p className="mt-1 font-mono text-[0.7rem] leading-relaxed text-sys-soft/75">
              {q.description}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-[0.7rem] text-violet">+{q.xpReward} XP</div>
            <div className="font-mono text-[0.58rem] text-sys-soft/50">+1 {q.statReward}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {["PYQ SETS", "CHAPTER DRILLS", "REVISION QUEUE", "DOUBT AI"].map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="sys-chip" style={{ borderColor: "rgba(179,136,255,.4)", color: "#d8c6ff" }}>
                {s}
              </span>
              {i < 3 ? <span className="font-mono text-[0.6rem] text-violet/60">→</span> : null}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SysButton tone="violet" solid onClick={openJeenius}>
            ▶ OPEN JEENIUS APP
          </SysButton>
          <span className="font-mono text-[0.56rem] tracking-widest text-sys-soft/45">
            {JEENIUS_PACKAGE} · ANDROID · PLAY STORE
          </span>
        </div>

        <div className="space-y-1.5">
          {q.goals.map((g, i) => (
            <button
              key={g.label}
              disabled={busy || q.status !== "active"}
              onClick={() => onToggle(q.id, i)}
              className="flex w-full items-center gap-3 border border-violet/30 bg-violet/5 p-2 text-left transition hover:border-violet/70"
            >
              <span
                className="grid h-4 w-4 place-items-center border font-mono text-[0.6rem]"
                style={{
                  borderColor: g.done ? "#7ee0a3" : "#b388ff",
                  color: g.done ? "#7ee0a3" : "transparent",
                  background: g.done ? "rgba(126,224,163,.15)" : "transparent",
                }}
              >
                ✓
              </span>
              <span className="font-mono text-[0.72rem] text-sys-soft/90">{g.label}</span>
              {done ? <span className="ml-auto font-mono text-[0.58rem] text-[#7ee0a3]">COMPLETE</span> : null}
            </button>
          ))}
        </div>
      </div>
    </SysWindow>
  );
}

function useTick() {
  const [, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
}

export function QuestPanel({
  state,
  post,
  refresh,
  flash,
}: {
  state: SystemState;
  post: (path: string, body: unknown) => Promise<Record<string, unknown> | null>;
  refresh: () => Promise<void>;
  flash: (kind: string, payload: Record<string, unknown>) => void;
}) {
  useTick();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [xp, setXp] = useState(35);
  const [attr, setAttr] = useState<Attr>("STR");

  async function act(body: Record<string, unknown>, expectLevelUp = true) {
    setBusy(true);
    const res = await post("/api/quest", body);
    setBusy(false);
    if (res?.ok && expectLevelUp) {
      const payload = res as unknown as { level?: number; levelsGained?: number };
      if (Number(payload.levelsGained ?? 0) > 0) {
        flash("level_up", { to: Number(payload.level ?? 1), gained: Number(payload.levelsGained) });
      }
    }
    await refresh();
  }

  return (
    <div className="space-y-4">
      {state.quests.penalty.map((q) => (
        <SysWindow key={q.id} title="PENALTY QUEST — RECOVERY" tag="BLOCKER LINKED" tone="danger">
          <div className="space-y-2">
            <div className="font-display text-sm tracking-[0.14em] text-danger glow-text">
              {q.title}
            </div>
            <p className="font-mono text-[0.7rem] leading-relaxed text-danger/85">{q.description}</p>
            <div className="space-y-1.5">
              {q.goals.map((g, i) => (
                <button
                  key={g.label}
                  disabled={busy}
                  onClick={() => act({ action: "toggle_goal", id: q.id, goalIndex: i })}
                  className="flex w-full items-center gap-3 border border-danger/25 bg-danger/5 p-2 text-left transition hover:border-danger/60"
                >
                  <span
                    className="grid h-4 w-4 place-items-center border font-mono text-[0.6rem]"
                    style={{
                      borderColor: g.done ? "#3fd2ff" : "#ff2f45",
                      color: g.done ? "#3fd2ff" : "transparent",
                    }}
                  >
                    ✓
                  </span>
                  <span className="font-mono text-[0.72rem] text-sys-soft/90">{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        </SysWindow>
      ))}

      {state.quests.emergency.map((q) => (
        <SysWindow key={q.id} title="SUDDEN QUEST" tag="TIME LIMITED" tone="magenta">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="font-display text-sm tracking-[0.14em] text-magenta glow-text">
                {q.title}
              </div>
              <div className="shrink-0 border border-magenta/50 bg-magenta/10 px-2 py-1 font-mono text-sm text-magenta">
                {q.secondsLeft !== null
                  ? `${String(Math.floor(q.secondsLeft / 60)).padStart(2, "0")}:${String(q.secondsLeft % 60).padStart(2, "0")}`
                  : "--:--"}
              </div>
            </div>
            <p className="font-mono text-[0.7rem] leading-relaxed text-sys-soft/80">{q.description}</p>
            <div className="space-y-1.5">
              {q.goals.map((g, i) => (
                <button
                  key={g.label}
                  disabled={busy || q.status !== "active"}
                  onClick={() => act({ action: "toggle_goal", id: q.id, goalIndex: i })}
                  className="flex w-full items-center gap-3 border border-magenta/25 bg-magenta/5 p-2 text-left transition hover:border-magenta/60"
                >
                  <span
                    className="grid h-4 w-4 place-items-center border font-mono text-[0.6rem]"
                    style={{
                      borderColor: g.done ? "#3fd2ff" : "#ff45d0",
                      color: g.done ? "#3fd2ff" : "transparent",
                    }}
                  >
                    ✓
                  </span>
                  <span className="font-mono text-[0.72rem] text-sys-soft/90">{g.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 font-mono text-[0.62rem] text-magenta/80">
              REWARD: {q.xpReward} XP · +1 {q.statReward}
            </div>
          </div>
        </SysWindow>
      ))}

      {state.quests.emergency.length === 0 ? (
        <SysWindow title="SUDDEN QUEST" tag="STANDBY">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[0.7rem] text-sys-soft/70">
              NO EMERGENCY QUEST ACTIVE. THE SYSTEM OFFERS THEM AT RANDOM — RARE, HIGH-XP, TIME LIMITED.
            </span>
            <SysButton ghost disabled={busy} onClick={() => act({ action: "accept_emergency" }, false)}>
              REQUEST CHALLENGE
            </SysButton>
          </div>
        </SysWindow>
      ) : null}

      <SysWindow title="BONUS QUESTS" tag={`${state.quests.bonus.length} ACTIVE`}>
        <div className="space-y-2">
          {(() => {
            const subway = state.quests.bonus.find((q) => q.key?.startsWith("subway-jeenius"));
            return subway ? (
              <SubwayCard
                q={subway}
                busy={busy}
                onToggle={(id, idx) => act({ action: "toggle_goal", id, goalIndex: idx })}
              />
            ) : null;
          })()}
          {state.quests.bonus.filter((q) => !(q.key?.startsWith("subway-jeenius"))).length === 0 ? (
            <div className="font-mono text-[0.7rem] text-sys-soft/60">
              NO EXTRA BONUS QUESTS. ADD YOUR OWN BELOW OR PICK A PRESET.
            </div>
          ) : null}
          {state.quests.bonus.filter((q) => !(q.key?.startsWith("subway-jeenius"))).map((q) => (
            <div key={q.id} className="border border-sys/20 bg-black/40 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display text-[0.76rem] tracking-wider text-white">
                    {q.title}
                  </div>
                  <div className="font-mono text-[0.62rem] text-sys-soft/60">{q.description}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-[0.66rem] text-sys">+{q.xpReward} XP</div>
                  <div className="font-mono text-[0.58rem] text-sys-soft/50">{q.statReward}</div>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {q.goals.map((g, i) => (
                  <button
                    key={g.label}
                    disabled={busy}
                    onClick={() => act({ action: "toggle_goal", id: q.id, goalIndex: i })}
                    className="flex w-full items-center gap-2 border border-sys/20 p-1.5 text-left transition hover:border-sys/60"
                  >
                    <span
                      className="grid h-4 w-4 place-items-center border font-mono text-[0.6rem]"
                      style={{
                        borderColor: g.done ? "#3fd2ff" : "rgba(63,210,255,.4)",
                        color: g.done ? "#3fd2ff" : "transparent",
                      }}
                    >
                      ✓
                    </span>
                    <span className="font-mono text-[0.7rem] text-sys-soft/85">{g.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 text-right">
                <SysButton ghost tone="danger" disabled={busy} onClick={() => act({ action: "remove", id: q.id }, false)}>
                  REMOVE
                </SysButton>
              </div>
            </div>
          ))}

          <Divider />
          <SectionTitle>CREATE BONUS QUEST</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 50 push-ups"
            />
            <input
              type="number"
              min={5}
              max={200}
              value={xp}
              onChange={(e) => setXp(Number(e.target.value))}
            />
            <select value={attr} onChange={(e) => setAttr(e.target.value as Attr)}>
              {ATTRS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <SysButton
              solid
              disabled={busy || !title.trim()}
              onClick={async () => {
                await act(
                  { action: "add", title, description: "User-defined bonus quest.", xpReward: xp, statReward: attr },
                  false,
                );
                setTitle("");
              }}
            >
              ADD
            </SysButton>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {BONUS_PRESETS.map((p, i) => (
              <button
                key={p.title}
                disabled={busy}
                onClick={() => act({ action: "preset", index: i }, false)}
                className="border border-sys/25 px-2 py-1 font-mono text-[0.6rem] tracking-widest text-sys-soft/80 transition hover:border-sys/70 hover:text-white"
              >
                + {p.title} ({p.xpReward} XP)
              </button>
            ))}
          </div>
        </div>
      </SysWindow>

      <SysWindow title="QUEST RECORD" tag="COMPLETED">
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: "BONUS CLEARED", v: state.stats.bonusCompleted },
            { k: "EMERGENCY CLEARED", v: state.stats.emergencyCompleted },
            { k: "RECOVERIES", v: state.stats.recoveries },
          ].map((s) => (
            <div key={s.k} className="border border-sys/20 bg-black/40 p-2 text-center">
              <div className="font-display text-xl text-sys glow-text">{s.v}</div>
              <div className="mt-1 font-mono text-[0.54rem] tracking-widest text-sys-soft/55">
                {s.k}
              </div>
            </div>
          ))}
        </div>
      </SysWindow>
    </div>
  );
}
