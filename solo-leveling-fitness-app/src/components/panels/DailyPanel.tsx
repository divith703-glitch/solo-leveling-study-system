"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { minutesToClock } from "@/lib/game";
import type { SystemState } from "@/lib/api-types";
import { ExerciseGlyph } from "../ExerciseGlyph";
import { SysButton, SysWindow, Divider } from "../SystemUI";

async function compressImage(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 760;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("read failed"));
      fr.readAsDataURL(file);
    });
  }
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function DailyPanel({
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
  const clock = useClock();
  const [photo, setPhoto] = useState<string | null>(null);
  const [gps, setGps] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "sys" | "danger" | "gold"; text: string } | null>(
    null,
  );
  const [honorUnlocked, setHonorUnlocked] = useState(false);
  const [rejections, setRejections] = useState(0);

  // ---- timer verification (presence-enforced) ----
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    if (!timerRunning) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [timerRunning]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now();
      } else if (hiddenAt.current && Date.now() - hiddenAt.current > 20000 && timerRunning) {
        setTimerRunning(false);
        setFeedback({
          tone: "danger",
          text: "TIMER PAUSED — YOU LEFT THE SYSTEM FOR MORE THAN 20 SECONDS. THE TIMER ONLY COUNTS WHILE YOU ARE PRESENT.",
        });
      }
      hiddenAt.current = null;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [timerRunning]);

  const secsLeft = useCallback(() => {
    const d = new Date(clock);
    const cur = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    return state.settings.deadlineMinutes * 60 - cur;
  }, [clock, state.settings.deadlineMinutes])();

  const fmt = (s: number) =>
    `${String(Math.floor(Math.abs(s) / 3600)).padStart(2, "0")}:${String(
      Math.floor((Math.abs(s) % 3600) / 60),
    ).padStart(2, "0")}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

  const allowPhoto = state.today.requiredMethod !== "timer";
  const allowTimer = state.today.requiredMethod !== "photo";

  useEffect(() => {
    setHonorUnlocked(rejections >= 3);
  }, [rejections]);

  async function takePhoto(file: File | null) {
    if (!file) return;
    const dataUrl = await compressImage(file);
    setPhoto(dataUrl);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps(`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`),
        () => setGps(null),
        { timeout: 4000 },
      );
    }
  }

  async function submit(method: "photo" | "timer" | "honor") {
    setBusy(true);
    const res = await post("/api/daily-log", {
      method,
      photoDataUrl: method === "photo" ? photo : undefined,
      durationSec: method === "timer" ? elapsed : undefined,
      gps: gps ?? undefined,
    });
    setBusy(false);
    if (!res) return;
    if (res.ok) {
      const levelsGained = Number(res.levelsGained ?? 0);
      setFeedback({
        tone: "sys",
        text: `${String(res.message)} · +${Number(res.xpGained ?? 0)} XP · STREAK ${Number(res.streak ?? 0)} DAY${
          Number(res.streak ?? 0) === 1 ? "" : "S"
        }`,
      });
      setPhoto(null);
      setTimerRunning(false);
      setElapsed(0);
      if (levelsGained > 0) flash("level_up", { to: Number(res.level ?? 1), gained: levelsGained });
      else notify("DAILY LOG RECORDED", [String(res.message), `+${Number(res.xpGained ?? 0)} XP AWARDED.`]);
      await refresh();
      return;
    }
    const code = String(res.code ?? "");
    if (code === "HONOR_MODE_AVAILABLE") {
      setRejections(Number(res.rejections ?? 3));
      setHonorUnlocked(true);
      setFeedback({ tone: "gold", text: String(res.error) });
    } else if (code === "NOT_VERIFIED") {
      setRejections(Number(res.rejections ?? 1));
      setFeedback({ tone: "danger", text: String(res.error) });
      setPhoto(null);
    } else {
      setFeedback({ tone: "danger", text: String(res.error) });
    }
  }

  async function toggleExercise(id: string) {
    setBusy(true);
    const res = await post("/api/workout", { exerciseId: id });
    setBusy(false);
    if (res?.ok && Number(res.levelsGained ?? 0) > 0) {
      flash("level_up", { to: Number(res.level ?? 1), gained: Number(res.levelsGained) });
    }
    await refresh();
  }

  const q = state.quests.daily;
  const completed = state.today.completedToday;
  const logStatus = state.today.logStatus;

  return (
    <div className="space-y-4">
      <SysWindow
        title={q.title}
        tag={completed ? "COMPLETE" : "REQUIRED"}
        tone={completed ? "sys" : state.punishment ? "danger" : "sys"}
        right={completed ? "✓" : undefined}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="sys-chip">{state.today.dayLabel}</span>
            <span className="sys-chip">{state.training.day.title}</span>
            <span className="sys-chip">+{q.xpReward} XP BASE</span>
            <span className="sys-chip">+3 STAT POINTS</span>
            <span className="sys-chip">DEADLINE {minutesToClock(state.settings.deadlineMinutes)}</span>
          </div>

          <div
            className={`flex items-center justify-between border px-3 py-2 ${
              secsLeft <= 3600 && secsLeft > 0
                ? "border-gold/50 bg-gold/10"
                : secsLeft <= 0
                  ? "border-danger/50 bg-danger/10"
                  : "border-sys/25 bg-black/40"
            }`}
          >
            <span className="sys-label">
              {secsLeft <= 0 ? "QUEST EXPIRED — RECOVERY REQUIRED" : "TIME REMAINING"}
            </span>
            <span
              className={`font-mono text-lg tracking-widest ${
                secsLeft <= 0 ? "text-danger glow-text" : "text-sys glow-text"
              }`}
            >
              {secsLeft <= 0 ? `-${fmt(secsLeft)}` : fmt(secsLeft)}
            </span>
          </div>

          <Divider />

          <div className="sys-label">GOALS</div>
          <div className="space-y-1.5">
            {q.goals.map((g) => (
              <button
                key={g.id}
                disabled={busy}
                onClick={() => toggleExercise(g.id)}
                className="flex w-full items-center gap-3 border border-sys/20 bg-black/40 p-2 text-left transition hover:border-sys/60"
                style={{ opacity: g.done ? 1 : 0.86 }}
              >
                <ExerciseGlyph glyph={g.glyph} done={g.done} size={56} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[0.78rem] tracking-wider text-white">
                    {g.label.toUpperCase()}
                  </span>
                  <span className="block font-mono text-[0.62rem] text-sys-soft/60">
                    {g.sets} · {g.attr} · {g.cue}
                  </span>
                </span>
                <span
                  className="grid h-5 w-5 shrink-0 place-items-center border font-mono text-[0.65rem]"
                  style={{
                    borderColor: g.done ? "#3fd2ff" : "rgba(63,210,255,.35)",
                    color: g.done ? "#3fd2ff" : "transparent",
                    background: g.done ? "rgba(63,210,255,.18)" : "transparent",
                  }}
                >
                  ✓
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {q.baseline.map((b) => (
              <button
                key={b.id}
                disabled={busy}
                onClick={() => toggleExercise(b.id)}
                className="flex flex-col items-center gap-1 border border-sys/20 bg-black/40 p-2 transition hover:border-sys/60"
              >
                <ExerciseGlyph glyph={b.glyph} done={b.done} size={44} />
                <span className="font-mono text-[0.58rem] tracking-widest text-sys-soft/75">
                  {b.label}
                </span>
              </button>
            ))}
          </div>

          <div className="border border-danger/40 bg-danger/8 p-2">
            <span className="font-mono text-[0.66rem] leading-relaxed tracking-wider text-danger">
              WARNING: FAILURE TO COMPLETE THE DAILY QUEST WILL BRING ABOUT THE APPROPRIATE PENALTY.
              THE CONSEQUENCE ACTIVATES IMMEDIATELY AT THE DEADLINE.
            </span>
          </div>

          <Divider />

          {logStatus === "pending" ? (
            <div className="border border-gold/50 bg-gold/8 p-3">
              <div className="font-display text-sm tracking-[0.2em] text-gold glow-text">
                PROOF QUEUED — XP HELD
              </div>
              <div className="mt-1 font-mono text-[0.68rem] leading-relaxed text-gold/85">
                YOUR STREAK IS SAFE. THE VERIFIER COULD NOT BE REACHED, SO THE XP IS HELD UNTIL THE
                PROOF RESOLVES. IF IT CANNOT RESOLVE WITHIN 12 HOURS IT DEGRADES TO HONOR MODE — THE
                LOG IS NEVER PERMANENTLY BLOCKED.
              </div>
            </div>
          ) : completed ? (
            <div className="border border-sys/40 bg-sys/8 p-3">
              <div className="font-display text-sm tracking-[0.2em] text-sys glow-text">
                QUEST COMPLETE — {String(logStatus ?? "").toUpperCase()}
              </div>
              <div className="mt-1 font-mono text-[0.68rem] text-sys-soft/70">
                THE REQUIREMENT HAS BEEN MET. XP AWARDED. STREAK SECURED.
              </div>
              {logStatus === "honor" ? (
                <div className="mt-2 font-mono text-[0.66rem] text-gold">
                  HONOR MODE ENTRY — RECORDED PERMANENTLY IN YOUR HISTORY.
                </div>
              ) : null}
              {logStatus === "recovered" ? (
                <div className="mt-2 font-mono text-[0.66rem] text-sys-soft/80">
                  RECOVERY LOG ACCEPTED. FINISH THE PENALTY GOALS TO LIFT THE CONSEQUENCE.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="sys-label">LOG VERIFICATION</div>
              {state.settings.verificationMode !== "timer" ? (
                <div className="space-y-2 border border-sys/25 bg-black/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="sys-label">PHOTO PROOF + AI VERIFICATION</span>
                    <span className="sys-chip">
                      {state.ai.hasKey ? "VERIFIER ONLINE" : "VERIFIER OFFLINE → HONOR FALLBACK"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => takePhoto(e.target.files?.[0] ?? null)}
                      />
                      <span className="sys-btn sys-btn-solid inline-block">
                        {photo ? "RETAKE PHOTO" : "CAPTURE PROOF"}
                      </span>
                    </label>
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt="proof"
                        className="h-20 w-28 border border-sys/50 object-cover"
                      />
                    ) : (
                      <span className="font-mono text-[0.64rem] text-sys-soft/50">
                        NO IMAGE — PHOTO IS HASHED, REJECTED IF REUSED, PURGED AFTER 7 DAYS
                      </span>
                    )}
                    {gps ? (
                      <span className="sys-chip">GPS {gps}</span>
                    ) : null}
                    <SysButton
                      solid
                      disabled={!photo || busy || !allowPhoto}
                      onClick={() => submit("photo")}
                    >
                      {busy ? "VERIFYING…" : "SUBMIT FOR VERIFICATION"}
                    </SysButton>
                  </div>
                </div>
              ) : null}

              {state.settings.verificationMode !== "photo" ? (
                <div className="space-y-2 border border-sys/25 bg-black/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="sys-label">TIMER PROOF</span>
                    <span className="sys-chip">MIN {state.settings.timerMinimumMinutes} MIN</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-2xl tracking-widest text-sys glow-text">
                      {fmt(elapsed)}
                    </span>
                    <SysButton ghost onClick={() => setTimerRunning((r) => !r)} disabled={!allowTimer}>
                      {timerRunning ? "PAUSE" : elapsed > 0 ? "RESUME" : "START TIMER"}
                    </SysButton>
                    <SysButton
                      solid
                      disabled={
                        busy ||
                        elapsed < state.settings.timerMinimumMinutes * 60 ||
                        timerRunning ||
                        !allowTimer
                      }
                      onClick={() => submit("timer")}
                    >
                      SUBMIT TIMER LOG
                    </SysButton>
                    <span className="font-mono text-[0.62rem] text-sys-soft/50">
                      TIMER PAUSES IF YOU LEAVE THE SYSTEM
                    </span>
                  </div>
                </div>
              ) : null}

              {honorUnlocked ? (
                <div className="border border-gold/40 bg-gold/8 p-3">
                  <div className="sys-label text-gold">MANUAL REVIEW — HONOR MODE</div>
                  <p className="mt-1 font-mono text-[0.66rem] text-gold/85">
                    THREE CONSECUTIVE FAILED VERIFICATIONS. YOU MAY LOG IN HONOR MODE: NO XP
                    MULTIPLIER, AND THE ENTRY IS PERMANENTLY FLAGGED IN YOUR STREAK HISTORY.
                  </p>
                  <div className="mt-2">
                    <SysButton tone="gold" solid disabled={busy} onClick={() => submit("honor")}>
                      LOG IN HONOR MODE
                    </SysButton>
                  </div>
                </div>
              ) : null}

              {feedback ? (
                <div
                  className="border p-2 font-mono text-[0.7rem] leading-relaxed"
                  style={{
                    borderColor:
                      feedback.tone === "danger"
                        ? "#ff2f4577"
                        : feedback.tone === "gold"
                          ? "#ffd16677"
                          : "#3fd2ff77",
                    color:
                      feedback.tone === "danger"
                        ? "#ff9aa6"
                        : feedback.tone === "gold"
                          ? "#ffd166"
                          : "#a9e9ff",
                    background: "rgba(0,0,0,.45)",
                  }}
                >
                  {feedback.text}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </SysWindow>
    </div>
  );
}
