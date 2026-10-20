"use client";

import { useEffect, useState } from "react";
import { FORCE_DISABLE_SENTENCE, minutesToClock } from "@/lib/game";
import type { SystemState } from "@/lib/api-types";
import { SysButton, SysWindow } from "./SystemUI";

/* ------------------------------ LEVEL UP --------------------------------- */
export function LevelUpOverlay({
  payload,
  onClose,
}: {
  payload: { from?: number; to?: number; gained?: number };
  onClose: () => void;
}) {
  const to = payload.to ?? 0;
  useEffect(() => {
    const t = setTimeout(onClose, 4200);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/88 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sys/20 blur-[90px]" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-sys/40 pulse-ring" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-magenta/30 pulse-ring [animation-delay:600ms]" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-sys to-transparent" />
      </div>
      <div className="rise-in relative select-none text-center">
        <div className="font-display text-[13vw] leading-[0.9] font-black tracking-[0.08em] text-white glow-text sm:text-7xl">
          LEVEL UP!
        </div>
        <div className="mt-3 font-display text-3xl font-bold tracking-[0.35em] text-sys glow-text">
          LV. {to}
        </div>
        <div className="mt-2 font-mono text-[0.7rem] tracking-[0.3em] text-sys-soft/70">
          {payload.gained && payload.gained > 1 ? `+${payload.gained} LEVELS · ` : ""}+3 STAT POINTS
        </div>
        <div className="mt-6">
          <SysButton solid>CONTINUE</SysButton>
        </div>
      </div>
    </div>
  );
}

/* -------------------------- SYSTEM NOTIFICATION -------------------------- */
export function SystemNotification({
  title,
  lines,
  tone = "sys",
  confirm = "CONFIRM",
  onClose,
}: {
  title: string;
  lines: string[];
  tone?: "sys" | "danger" | "gold" | "violet";
  confirm?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-[2px]">
      <SysWindow title="NOTIFICATION" tag="SYSTEM" tone={tone} className="w-full max-w-lg rise-in">
        <div className="space-y-2">
          <div className="font-display text-sm tracking-[0.16em] text-white glow-text">{title}</div>
          {lines.map((l, i) => (
            <p key={i} className="font-mono text-[0.76rem] leading-relaxed text-sys-soft/85">
              {l}
            </p>
          ))}
          <div className="pt-3">
            <SysButton solid tone={tone} onClick={onClose}>
              {confirm}
            </SysButton>
          </div>
        </div>
      </SysWindow>
    </div>
  );
}

/* --------------------------- PUNISHMENT SCREEN --------------------------- */
export function PunishmentScreen({
  state,
  onToggleGoal,
  onOpenDisable,
  submitting,
}: {
  state: SystemState;
  onToggleGoal: (questId: number, goalIndex: number) => void;
  onOpenDisable: () => void;
  submitting: boolean;
}) {
  const p = state.punishment;
  if (!p) return null;
  const penaltyQuest = state.quests.penalty[0];
  const clock = minutesToClock(state.settings.deadlineMinutes);
  return (
    <div className="fixed inset-0 z-[75] overflow-y-auto bg-[#0a0002]/97 p-3 sm:p-6">
      <div className="pointer-events-none fixed inset-0 hatch-danger opacity-70" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(700px_400px_at_50%_0%,rgba(255,47,69,0.22),transparent_70%)]" />
      <div className="relative mx-auto max-w-2xl space-y-4">
        <div className="text-center">
          <div className="font-mono text-[0.66rem] tracking-[0.42em] text-danger/80 blink">
            ⚠ CONSEQUENCE ACTIVE ⚠
          </div>
          <h1 className="shake mt-2 font-display text-[10vw] leading-none font-black tracking-[0.04em] text-danger glow-text sm:text-5xl">
            STREAK BROKEN
          </h1>
          <div className="mt-1 font-display text-sm tracking-[0.3em] text-danger/90">
            CONSEQUENCE ACTIVE
          </div>
        </div>

        <SysWindow
          title="PUNISHMENT MODE — RECOVERY REQUIREMENTS"
          tag="BLOCKER ENGAGED"
          tone="danger"
          className="rise-in"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { k: "MISSED LOGS", v: p.missedCount },
              { k: "CURRENT STREAK", v: state.hunter.currentStreak },
              { k: "BLOCKED APPS", v: state.guard.blocked.length },
              { k: "ESCAPE ATTEMPTS", v: state.hunter.escapeAttempts },
            ].map((s) => (
              <div key={s.k} className="border border-danger/30 bg-black/50 p-2 text-center">
                <div className="font-display text-xl font-bold text-danger glow-text">{s.v}</div>
                <div className="mt-1 font-mono text-[0.55rem] tracking-[0.16em] text-danger/70">
                  {s.k}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 font-mono text-[0.74rem] leading-relaxed text-danger/90">
            THE DAILY LOG WAS NOT COMPLETED BY {clock}. YOU DO NOT NEGOTIATE WITH THE CONSEQUENCE.
            YOU COMPLETE THE REQUIREMENT, EARN YOUR ACCESS BACK, AND MOVE FORWARD.
          </p>

          <div className="mt-3 space-y-2">
            {p.requirements.map((r, i) => {
              const done =
                i === 0 ? p.recoveryLogDone : i === 1 ? p.penaltyDone : state.hunter.currentStreak >= 1;
              return (
                <div
                  key={r}
                  className="flex items-start gap-3 border p-2"
                  style={{
                    borderColor: done ? "#3fd2ff55" : "#ff2f4555",
                    background: done ? "rgba(63,210,255,.06)" : "rgba(255,47,69,.06)",
                  }}
                >
                  <span
                    className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center border font-mono text-[0.6rem]"
                    style={{
                      borderColor: done ? "#3fd2ff" : "#ff2f45",
                      color: done ? "#3fd2ff" : "#ff2f45",
                    }}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className="font-mono text-[0.74rem] text-sys-soft/85">{r}</span>
                  {done ? (
                    <span className="ml-auto font-mono text-[0.6rem] tracking-widest text-sys">DONE</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-3 border border-danger/40 bg-black/60 p-3">
            <div className="sys-label text-danger/80">{p.penaltyLabel}</div>
            <div className="mt-2 space-y-1.5">
              {p.penaltyGoals.map((g, i) => (
                <button
                  key={g.label}
                  disabled={submitting || !penaltyQuest}
                  onClick={() => penaltyQuest && onToggleGoal(penaltyQuest.id, i)}
                  className="flex w-full items-center gap-3 border border-danger/25 bg-danger/5 p-2 text-left transition hover:border-danger/60 disabled:opacity-50"
                >
                  <span
                    className="grid h-4 w-4 shrink-0 place-items-center border font-mono text-[0.6rem]"
                    style={{
                      borderColor: g.done ? "#3fd2ff" : "#ff2f45",
                      color: g.done ? "#3fd2ff" : "transparent",
                      background: g.done ? "rgba(63,210,255,.2)" : "transparent",
                    }}
                  >
                    ✓
                  </span>
                  <span className="font-mono text-[0.74rem] text-sys-soft/90">{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SysButton tone="danger" solid onClick={onOpenDisable}>
              DISABLE BLOCKER (5 MIN WARNING)
            </SysButton>
            <span className="font-mono text-[0.6rem] tracking-widest text-danger/60">
              THE DAY WILL BE MARKED FAILED — PERMANENTLY
            </span>
          </div>
        </SysWindow>

        <div className="text-center font-mono text-[0.6rem] tracking-[0.24em] text-danger/50">
          NO DATA IS DELETED · NO DEVICE DAMAGE · EMERGENCY & ESSENTIAL APPS REMAIN ACCESSIBLE
        </div>
      </div>
    </div>
  );
}

/* --------------------------- BLOCKED APP OVERLAY -------------------------- */
export function BlockedAppOverlay({
  app,
  state,
  onReturn,
}: {
  app: string;
  state: SystemState;
  onReturn: () => void;
}) {
  const [wait, setWait] = useState(8);
  useEffect(() => {
    const t = setInterval(() => setWait((w) => (w > 0 ? w - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const p = state.punishment;
  return (
    <div className="fixed inset-0 z-[85] grid place-items-center bg-[#0a0002]/98 p-4">
      <div className="pointer-events-none fixed inset-0 hatch-danger opacity-60" />
      <div className="relative w-full max-w-md text-center rise-in">
        <div className="font-mono text-[0.6rem] tracking-[0.4em] text-danger/80">
          FOREGROUND APP DETECTOR
        </div>
        <div className="mt-3 font-display text-3xl font-black tracking-[0.1em] text-danger glow-text">
          ACCESS DENIED
        </div>
        <div className="mt-2 border border-danger/40 bg-black/70 p-4">
          <div className="font-display text-lg text-white">{app.toUpperCase()}</div>
          <div className="mt-1 font-mono text-[0.7rem] tracking-[0.2em] text-danger/80">
            BLOCKED WHILE CONSEQUENCE IS ACTIVE
          </div>
          <div className="mt-4 space-y-1 text-left font-mono text-[0.7rem] text-sys-soft/80">
            <div className="text-sys-soft/60">RECOVERY REQUIREMENT:</div>
            <div>› COMPLETE THE MISSED DAILY LOG (PROOF REQUIRED)</div>
            <div>› {p?.penaltyLabel ?? "PENALTY QUEST"}</div>
            <div>› RE-ESTABLISH A 1-DAY STREAK</div>
          </div>
        </div>
        <div className="mt-4">
          <SysButton tone="danger" solid disabled={wait > 0} onClick={onReturn}>
            {wait > 0 ? `RETURN TO THE SYSTEM (${wait})` : "RETURN TO THE SYSTEM"}
          </SysButton>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- ESCAPE ATTEMPT ------------------------------ */
export function EscapeOverlay({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="fixed inset-0 z-[84] grid place-items-center bg-[#0a0002]/96 p-4">
      <div className="pointer-events-none fixed inset-0 hatch-danger opacity-50" />
      <div className="relative max-w-md text-center rise-in">
        <div className="font-display text-2xl font-black tracking-[0.08em] text-danger glow-text">
          YOU LEFT THE SYSTEM
        </div>
        <p className="mt-3 font-mono text-[0.74rem] leading-relaxed text-sys-soft/80">
          THE GUARD DETECTED THAT YOU SWITCHED AWAY DURING PUNISHMENT MODE. THE ATTEMPT HAS BEEN
          LOGGED. LEAVING DOES NOT CLEAR THE CONSEQUENCE — ONLY THE RECOVERY REQUIREMENT DOES.
        </p>
        <div className="mt-4">
          <SysButton tone="danger" solid onClick={onReturn}>
            ACKNOWLEDGE
          </SysButton>
        </div>
      </div>
    </div>
  );
}

/* ------------------ SCHOOL OR HELL PROTOCOL CHOICE ----------------------- */
export function HellProtocolModal({
  isSunday,
  dateLabel,
  onChoose,
  busy,
}: {
  isSunday: boolean;
  dateLabel: string;
  onChoose: (mode: "school" | "hell") => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[86] grid place-items-center bg-black/90 p-4">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(600px_300px_at_50%_0%,rgba(179,136,255,0.16),transparent_70%)]" />
      <div className="relative w-full max-w-lg rise-in">
        <div className="text-center">
          <div className="font-mono text-[0.62rem] tracking-[0.36em] text-violet blink">
            {isSunday ? "SUNDAY DETECTED" : "GOVERNMENT HOLIDAY DETECTED"} · {dateLabel.toUpperCase()}
          </div>
          <h2 className="mt-2 font-display text-2xl font-black tracking-[0.08em] text-white glow-text sm:text-3xl">
            SCHOOL OR <span className="text-violet">HELL PROTOCOL</span>?
          </h2>
          <p className="mt-2 font-mono text-[0.7rem] leading-relaxed text-sys-soft/75">
            THE SYSTEM MUST KNOW TODAY&apos;S OPERATING MODE BEFORE IT OPENS THE MISSION CLOCK. THIS
            CHOICE IS LOGGED FOR THE WHOLE DAY.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            disabled={busy}
            onClick={() => onChoose("school")}
            className="group border border-sys/50 bg-sys/8 p-4 text-left transition hover:border-sys hover:bg-sys/15"
          >
            <div className="font-display text-sm tracking-[0.2em] text-sys glow-text">SCHOOL TODAY</div>
            <div className="mt-1 font-mono text-[0.62rem] leading-relaxed text-sys-soft/70">
              SESSION 1 → WORKOUT → BUS @07:00 → SESSION 3 (CHEMISTRY) @19:00 → DINNER → EARNED ANIME → LIGHTS OUT
            </div>
          </button>
          <button
            disabled={busy}
            onClick={() => onChoose("hell")}
            className="group border border-violet/60 bg-violet/10 p-4 text-left transition hover:border-violet hover:bg-violet/18"
          >
            <div className="font-display text-sm tracking-[0.2em] text-violet glow-text">HELL PROTOCOL</div>
            <div className="mt-1 font-mono text-[0.62rem] leading-relaxed text-violet/80">
              NO SCHOOL. FULL HOME DAY: SESSION 1 → WORKOUT → SANSKRIT 30 MIN → ENGLISH 0.5 HRS → SESSION 3 → EARNED ANIME
            </div>
          </button>
        </div>
        <div className="mt-3 text-center font-mono text-[0.58rem] tracking-[0.22em] text-sys-soft/45">
          THE POPUP RETURNS TOMORROW. YOU CAN SWITCH MODE FROM THE TIMETABLE.
        </div>
      </div>
    </div>
  );
}

/* ----------------------- FORCE-DISABLE (BYPASS) -------------------------- */
export function DisableGuardModal({
  delaySec,
  onCancel,
  onConfirm,
}: {
  delaySec: number;
  onCancel: () => void;
  onConfirm: (sentence: string, startedAt: number) => Promise<string | null>;
}) {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [sentence, setSentence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const elapsed = (now - startedAt) / 1000;
  const remaining = Math.max(0, Math.ceil(delaySec - elapsed));
  const ready = remaining <= 0;
  const match = sentence.trim().toLowerCase() === FORCE_DISABLE_SENTENCE.toLowerCase();

  return (
    <div className="fixed inset-0 z-[88] grid place-items-center bg-black/90 p-4">
      <SysWindow title="WARNING — BLOCKER DISABLE" tag="IRREVERSIBLE" tone="danger" className="w-full max-w-lg rise-in">
        <div className="space-y-3">
          <div className="border border-danger/40 bg-danger/5 p-3">
            <div className="font-display text-2xl font-black text-danger glow-text">
              {ready ? "WARNING PERIOD COMPLETE" : `WARNING: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
            </div>
            <p className="mt-2 font-mono text-[0.72rem] leading-relaxed text-danger/85">
              YOU ARE ABOUT TO DISABLE THE CONSEQUENCE. THIS CANNOT BE UNDONE FOR TODAY. THE DAY WILL
              BE MARKED AS <b>FAILED — PERMANENTLY</b>. THE CONSEQUENCE IS CONSIDERED SERVED, AND YOUR
              STREAK CANNOT BE RECOVERED FOR THIS DATE.
            </p>
          </div>
          <div>
            <div className="sys-label mb-1">TYPE EXACTLY</div>
            <div className="mb-2 font-mono text-sm text-white">“{FORCE_DISABLE_SENTENCE}”</div>
            <input
              type="text"
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder="type the sentence"
              disabled={busy}
            />
          </div>
          {error ? (
            <div className="border border-danger/40 bg-danger/10 p-2 font-mono text-[0.7rem] text-danger">
              {error}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <SysButton ghost onClick={onCancel} disabled={busy}>
              KEEP THE GUARD ON
            </SysButton>
            <SysButton
              tone="danger"
              solid
              disabled={!ready || !match || busy}
              onClick={async () => {
                setBusy(true);
                const err = await onConfirm(sentence, startedAt);
                setBusy(false);
                if (err) setError(err);
              }}
            >
              {busy ? "PROCESSING…" : "I ACCEPT THE PERMANENT FAIL"}
            </SysButton>
          </div>
        </div>
      </SysWindow>
    </div>
  );
}
