"use client";

import { useEffect, useState } from "react";
import type { SystemState } from "@/lib/api-types";
import { ExerciseGlyph } from "../ExerciseGlyph";
import { Divider, SectionTitle, SysButton, SysWindow, StatusPill } from "../SystemUI";

function fmtHMS(s: number) {
  const v = Math.max(0, Math.floor(s));
  return `${String(Math.floor(v / 3600)).padStart(2, "0")}:${String(Math.floor((v % 3600) / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

function BreakTimer({ onFinish, onAbort }: { onFinish: () => void; onAbort: () => void }) {
  const [left, setLeft] = useState(120);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left <= 0) onFinish();
  }, [left, onFinish]);
  const pct = ((120 - left) / 120) * 100;
  return (
    <div className="fixed inset-0 z-[82] grid place-items-center bg-black/90 p-4">
      <SysWindow title="THE 2-MINUTE BREAK" tag="TIMER LOCKED" tone="gold" className="w-full max-w-sm rise-in">
        <div className="text-center">
          <div className="font-display text-6xl font-black tracking-widest text-gold glow-text">
            {left > 0 ? fmtHMS(left).slice(3) : "00:00"}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden border border-gold/40 bg-black">
            <div className="h-full bg-gold transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 font-mono text-[0.66rem] leading-relaxed text-gold/85">
            YOU EARNED EXACTLY 120 SECONDS. WHEN THE TIMER ENDS, THE SYSTEM RESUMES — STUDY SESSION 3,
            CHEMISTRY, 19:00.
          </p>
          <div className="mt-3">
            <SysButton tone="gold" ghost onClick={onAbort}>
              END BREAK EARLY
            </SysButton>
          </div>
        </div>
      </SysWindow>
    </div>
  );
}

export function SchedulePanel({
  state,
  post,
  refresh,
  notify,
  flash,
}: {
  state: SystemState;
  post: (path: string, body: unknown) => Promise<Record<string, unknown> | null>;
  refresh: () => Promise<void>;
  notify: (title: string, lines: string[], tone?: "sys" | "danger" | "gold" | "violet") => void;
  flash: (kind: string, payload: Record<string, unknown>) => void;
}) {
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [breakRunning, setBreakRunning] = useState(false);
  const s = state.schedule;

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function toggleBlock(blockId: string) {
    setBusy(true);
    const res = (await post("/api/schedule", { action: "toggle_block", blockId })) as
      | ({ ok: true; levelsGained?: number; level?: number; done?: boolean; xpGained?: number })
      | { ok: false; error?: string }
      | null;
    setBusy(false);
    if (!res) return;
    if (!res.ok) {
      notify("ACCESS DENIED", [String((res as { error?: string }).error ?? "")], "danger");
      return;
    }
    if (Number(res.xpGained ?? 0) > 0) {
      notify("BLOCK LOGGED", [`+${Number(res.xpGained)} XP · TIMETABLE CHECK-IN RECORDED.`]);
    }
    if (Number(res.levelsGained ?? 0) > 0) {
      flash("level_up", { to: Number(res.level ?? 1), gained: Number(res.levelsGained) });
    }
    await refresh();
  }

  async function switchMode(mode: "school" | "hell") {
    setBusy(true);
    await post("/api/schedule", { action: "set_mode", mode });
    setBusy(false);
    notify(
      mode === "hell" ? "HELL PROTOCOL ACTIVATED" : "SCHOOL MODE ACTIVATED",
      mode === "hell"
        ? [
            "NO SCHOOL TODAY. ANNEX BLOCKS ISSUED:",
            "· SANSKRIT STUDY — 30 MIN (12:30)",
            "· ENGLISH STUDY — 0.5 HRS (13:00)",
            "EVERYTHING ELSE ON THE MISSION CLOCK REMAINS ENFORCED.",
          ]
        : ["NORMAL SCHOOL-DAY PROTOCOL RESTORED FOR TODAY."],
      mode === "hell" ? "violet" : "sys",
    );
    await refresh();
  }

  const activeBlock = s.blocks.find((bl) => bl.active);
  const xpToday = s.blocks.filter((bl) => bl.done).length;
  const hell = s.effectiveMode === "hell";

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------ MISSION CLOCK ---- */}
      <SysWindow
        title="MISSION CLOCK"
        tag={hell ? "HELL PROTOCOL" : "SCHOOL DAY"}
        tone={hell ? "violet" : "sys"}
        right={activeBlock ? "LIVE" : "STANDBY"}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              text={hell ? "MODE: HELL PROTOCOL" : "MODE: SCHOOL DAY"}
              tone={hell ? "violet" : "sys"}
            />
            {s.isSunday ? <StatusPill text="SUNDAY" tone="gold" /> : null}
            {s.isHoliday && !s.isSunday ? <StatusPill text="GOVT HOLIDAY" tone="gold" /> : null}
            <StatusPill text={`${xpToday}/${s.blocks.length} BLOCKS LOGGED`} tone="sys" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-sys/25 bg-black/50 p-3">
              <div className="sys-label">CURRENT BLOCK</div>
              {activeBlock ? (
                <>
                  <div className="mt-1 font-display text-[0.95rem] tracking-wider text-white glow-text">
                    {activeBlock.label}
                  </div>
                  <div className="mt-1 font-mono text-[0.62rem] text-sys-soft/60">
                    {activeBlock.startLabel} – {activeBlock.endLabel} · {activeBlock.attr}
                  </div>
                  <div className="mt-1 font-mono text-sm tracking-widest text-sys glow-text flicker">
                    {s.secondsLeftInCurrent !== null ? fmtHMS(s.secondsLeftInCurrent) : "--:--:--"} LEFT
                  </div>
                </>
              ) : (
                <div className="mt-1 font-mono text-[0.7rem] text-sys-soft/55">
                  BETWEEN BLOCKS — FREE TRAVEL WINDOW
                </div>
              )}
            </div>
            <div className="border border-sys/25 bg-black/50 p-3">
              <div className="sys-label">NEXT BLOCK</div>
              {(() => {
                const nb = s.blocks.find((bl) => bl.next);
                return nb ? (
                  <>
                    <div className="mt-1 font-display text-[0.95rem] tracking-wider text-white">
                      {nb.label}
                    </div>
                    <div className="mt-1 font-mono text-[0.62rem] text-sys-soft/60">
                      STARTS {nb.startLabel}
                    </div>
                    <div className="mt-1 font-mono text-sm tracking-widest text-sys/85">
                      IN {s.secondsToNext !== null ? fmtHMS(s.secondsToNext) : "--:--:--"}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 font-mono text-[0.7rem] text-sys-soft/55">
                    DAY CYCLE COMPLETE — NOTHING SCHEDULED UNTIL 03:00
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SysButton
              ghost
              disabled={busy || s.mode === "school"}
              onClick={() => switchMode("school")}
            >
              SCHOOL MODE
            </SysButton>
            <SysButton
              tone="violet"
              ghost
              disabled={busy || s.mode === "hell"}
              onClick={() => switchMode("hell")}
            >
              HELL PROTOCOL
            </SysButton>
            <span className="font-mono text-[0.58rem] text-sys-soft/50">
              {s.requiresChoice
                ? "PROTOCOL NOT CHOSEN FOR TODAY"
                : `CHOICE LOGGED: ${String(s.mode ?? "auto").toUpperCase()}`}
            </span>
          </div>
        </div>
      </SysWindow>

      {/* ------------------------------------------------ TIMETABLE -------- */}
      <SysWindow
        title={`TODAY'S TIMETABLE — ${hell ? "HELL PROTOCOL" : "SCHOOL PROTOCOL"}`}
        tag="03:00 → 23:00"
        tone={hell ? "violet" : "sys"}
      >
        <div className="space-y-2">
          {s.blocks.map((bl) => {
            const toneColor = bl.locked ? "#ff2f45" : bl.active ? "#3fd2ff" : bl.done ? "#7ee0a3" : "#274a5e";
            return (
              <div
                key={bl.id}
                className="flex items-center gap-3 border p-2"
                style={{
                  borderColor: `${toneColor}66`,
                  background: bl.active ? "rgba(63,210,255,.08)" : bl.locked ? "rgba(255,47,69,.06)" : "rgba(0,0,0,.35)",
                  boxShadow: bl.active ? "0 0 16px rgba(63,210,255,.18)" : "none",
                }}
              >
                <ExerciseGlyph glyph={bl.glyph} done={bl.done} size={52} tone={bl.locked ? "#ff2f45" : undefined} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-display text-[0.74rem] tracking-wider text-white">
                      {bl.label}
                    </span>
                    {bl.active ? <span className="sys-chip blink">NOW</span> : null}
                    {bl.next && !bl.active ? <span className="sys-chip">NEXT</span> : null}
                    {bl.locked ? (
                      <span className="border border-danger/50 bg-danger/10 px-1.5 py-0.5 font-mono text-[0.55rem] tracking-widest text-danger">
                        LOCKED
                      </span>
                    ) : null}
                  </div>
                  <div className="font-mono text-[0.6rem] text-sys-soft/60">
                    {bl.startLabel} – {bl.endLabel} · {bl.attr} · {bl.xp > 0 ? `+${bl.xp} XP` : bl.kind.toUpperCase()}
                  </div>
                  <div className="font-mono text-[0.56rem] leading-snug text-sys-soft/45">{bl.sub}</div>
                  {bl.locked ? (
                    <div className="mt-1 font-mono text-[0.58rem] text-danger/85">
                      EARN IT: COMPLETE TODAY'S DAILY QUEST AND THE ANIME OPENS.
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {bl.kind === "break" ? (
                    <>
                      <SysButton
                        tone="gold"
                        disabled={busy || bl.done || bl.locked}
                        onClick={() => setBreakRunning(true)}
                      >
                        {bl.done ? "DONE" : "START 2:00"}
                      </SysButton>
                    </>
                  ) : bl.kind === "passive" ? (
                    <button
                      disabled={busy}
                      onClick={() => toggleBlock(bl.id)}
                      className="grid h-6 w-6 place-items-center border font-mono text-[0.7rem]"
                      style={{
                        borderColor: bl.done ? "#3fd2ff" : "rgba(63,210,255,.35)",
                        color: bl.done ? "#3fd2ff" : "transparent",
                        background: bl.done ? "rgba(63,210,255,.18)" : "transparent",
                      }}
                    >
                      ✓
                    </button>
                  ) : (
                    <button
                      disabled={busy || bl.locked}
                      onClick={() => toggleBlock(bl.id)}
                      className="grid h-6 w-6 place-items-center border font-mono text-[0.7rem] disabled:opacity-40"
                      style={{
                        borderColor: bl.done ? "#3fd2ff" : "rgba(63,210,255,.35)",
                        color: bl.done ? "#3fd2ff" : "transparent",
                        background: bl.done ? "rgba(63,210,255,.18)" : "transparent",
                      }}
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <Divider />
        <div className="font-mono text-[0.58rem] leading-relaxed text-sys-soft/50">
          EVERY CHECK-IN RAISES ITS LINKED ATTRIBUTE. THE 2-MINUTE BREAK IS TIMER-ENFORCED. THE ANIME
          BLOCK IS A REWARD: THE SYSTEM DOES NOT OPEN IT UNTIL THE DAILY QUEST IS COMPLETE. HELL
          PROTOCOL ADDS SANSKRIT AND ENGLISH BLOCKS ON NO-SCHOOL DAYS.
        </div>
      </SysWindow>

      {/* ---------------------------------------------- WEEK PROTOCOL ------ */}
      <SysWindow title="PROTOCOL RULES" tag="SUNDAYS & HOLIDAYS">
        <div className="space-y-1.5">
          <SectionTitle>HOW THE CHOICE WORKS</SectionTitle>
          <p className="font-mono text-[0.68rem] leading-relaxed text-sys-soft/75">
            ON SUNDAYS AND GOVERNMENT HOLIDAYS THE SYSTEM ASKS AT FIRST CONTACT: SCHOOL OR HELL
            PROTOCOL? IF THERE IS NO SCHOOL, THE HELL ANNEX IS ISSUED — SANSKRIT 30 MIN AND ENGLISH
            0.5 HRS — AND SUNDAYS ALSO CARRY THE MIT + JEE LEVEL TESTS FROM THE TRAINING PROGRAM.
            YOUR HOLIDAY LIST IS CONFIGURABLE IN SYSTEM → HOLIDAYS (DIWALI, HOLI, ETC. MOVE EVERY
            YEAR).
          </p>
        </div>
      </SysWindow>

      {breakRunning ? (
        <BreakTimer
          onFinish={async () => {
            setBreakRunning(false);
            await toggleBlock("break-2min");
            notify("BREAK OVER — THE SYSTEM RESUMES", [
              "120 SECONDS SPENT. NEXT: STUDY SESSION 3 — CHEMISTRY AT 19:00.",
            ]);
          }}
          onAbort={() => setBreakRunning(false)}
        />
      ) : null}
    </div>
  );
}
