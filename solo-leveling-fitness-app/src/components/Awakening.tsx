"use client";

import { useEffect, useState } from "react";
import { ATTRS, minutesToClock } from "@/lib/game";
import { SysButton, SysWindow } from "./SystemUI";

const BOOT_LINES = [
  "> establishing connection to the system…",
  "> scanning hunter aptitude…",
  "> aptitude confirmed: PLAYER",
  "> binding interface…",
];

export function Awakening({
  post,
  onDone,
}: {
  post: (path: string, body: unknown) => Promise<Record<string, unknown> | null>;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<"boot" | "offer" | "setup">("boot");
  const [bootIdx, setBootIdx] = useState(0);
  const [refused, setRefused] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [task, setTask] = useState("Complete today's prescribed training");
  const [prompt, setPrompt] = useState(
    "Photo must show you actually training: the gym, the equipment, or you mid-set.",
  );
  const [deadline, setDeadline] = useState("23:00");
  const [reminder, setReminder] = useState("09:00");
  const [mode, setMode] = useState("photo");
  const [timerMin, setTimerMin] = useState(20);
  const [category, setCategory] = useState("STR");
  const [tz, setTz] = useState("UTC");

  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  useEffect(() => {
    if (stage !== "boot") return;
    const t = setInterval(() => {
      setBootIdx((i) => {
        if (i >= BOOT_LINES.length) {
          clearInterval(t);
          setTimeout(() => setStage("offer"), 500);
          return i;
        }
        return i + 1;
      });
    }, 520);
    return () => clearInterval(t);
  }, [stage]);

  const toMinutes = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  if (stage === "boot") {
    return (
      <main className="relative grid min-h-screen place-items-center p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage: "url(/images/gate.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "radial-gradient(circle at 50% 50%, black, transparent 72%)",
          }}
        />
        <div className="relative w-full max-w-md">
          <div className="mb-4 text-center font-display text-xl font-black tracking-[0.4em] text-sys glow-text">
            SYSTEM
          </div>
          <div className="space-y-1 font-mono text-[0.72rem] text-sys/80">
            {BOOT_LINES.slice(0, bootIdx).map((l) => (
              <div key={l} className="flicker">
                {l}
              </div>
            ))}
            <span className="blink">█</span>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "offer") {
    return (
      <main className="grid min-h-screen place-items-center p-4">
        <SysWindow title="NOTIFICATION" tag="SYSTEM" className="w-full max-w-lg rise-in">
          <div className="space-y-4 text-center">
            <div className="font-mono text-[0.62rem] tracking-[0.34em] text-sys/70">
              [ YOU HAVE ACQUIRED THE QUALIFICATIONS TO BE A PLAYER. ]
            </div>
            <p className="font-mono text-[0.8rem] leading-relaxed text-sys-soft">
              FROM THIS POINT FORWARD, ONE ACTION IS REQUIRED EVERY DAY. MISSING IT ACTIVATES A
              CONSEQUENCE THAT CANNOT BE IGNORED. YOUR DISCIPLINE WILL BE MEASURED, RANKED AND
              RECORDED PERMANENTLY.
            </p>
            {refused ? (
              <p className="border border-danger/50 bg-danger/10 p-2 font-mono text-[0.72rem] text-danger">
                REFUSAL RECORDED. THE OFFER REMAINS OPEN — BUT NOTHING ABOUT THE REQUIREMENT CHANGES.
              </p>
            ) : null}
            <div className="flex justify-center gap-3 pt-2">
              <SysButton
                solid
                onClick={() => {
                  setRefused(true);
                }}
              >
                NO
              </SysButton>
              <SysButton solid onClick={() => setStage("setup")}>
                YES
              </SysButton>
            </div>
          </div>
        </SysWindow>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl p-4 sm:p-8">
      <SysWindow title="PLAYER REGISTRATION" tag="STEP 1 / 1" className="rise-in">
        <div className="space-y-4">
          <p className="font-mono text-[0.72rem] leading-relaxed text-sys-soft/80">
            DEFINE THE ONE ACTION THE SYSTEM WILL ENFORCE. THIS BECOMES YOUR DAILY QUEST. THE
            DEADLINE IS ABSOLUTE — IT IS EVALUATED IN YOUR LOCAL TIMEZONE ({tz}).
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="sys-label">HUNTER NAME</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="HUNTER" />
            </label>
            <label className="block">
              <span className="sys-label">PRIMARY ATTRIBUTE</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {ATTRS.map((a) => (
                  <option key={a} value={a}>
                    {a} — {a === "STR" ? "WORKOUTS" : a === "INT" ? "STUDY" : a === "VIT" ? "SLEEP/WATER" : a === "AGI" ? "HIIT" : "STREAK"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="sys-label">REQUIRED DAILY ACTION</span>
            <input value={task} onChange={(e) => setTask(e.target.value)} />
          </label>
          <label className="block">
            <span className="sys-label">PROOF DESCRIPTION (SENT TO THE AI VERIFIER)</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="sys-label">DEADLINE</span>
              <input type="time" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </label>
            <label className="block">
              <span className="sys-label">DAILY REMINDER</span>
              <input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} />
            </label>
          </div>

          <div>
            <span className="sys-label">VERIFICATION METHOD</span>
            <div className="mt-1 grid gap-2 sm:grid-cols-3">
              {[
                { k: "photo", t: "PHOTO + AI", d: "Recommended. Anti-cheat." },
                { k: "ask", t: "PHOTO OR TIMER", d: "Choose per day." },
                { k: "timer", t: "TIMER ONLY", d: "Minimum duration." },
              ].map((o) => (
                <button
                  key={o.k}
                  onClick={() => setMode(o.k)}
                  className="border p-2 text-left transition"
                  style={{
                    borderColor: mode === o.k ? "#3fd2ff" : "rgba(63,210,255,.25)",
                    background: mode === o.k ? "rgba(63,210,255,.1)" : "transparent",
                  }}
                >
                  <div className="font-display text-[0.7rem] tracking-widest text-white">{o.t}</div>
                  <div className="font-mono text-[0.6rem] text-sys-soft/60">{o.d}</div>
                </button>
              ))}
            </div>
            <div className="mt-2 font-mono text-[0.6rem] text-sys-soft/50">
              CHECKBOX-ONLY LOGGING IS NOT PERMITTED — IT IS TOO EASY TO FAKE.
            </div>
          </div>

          {mode !== "photo" ? (
            <label className="block">
              <span className="sys-label">MINIMUM TIMER DURATION (MINUTES)</span>
              <input
                type="number"
                min={5}
                max={180}
                value={timerMin}
                onChange={(e) => setTimerMin(Number(e.target.value))}
              />
            </label>
          ) : null}

          <div className="border border-sys/25 bg-black/40 p-3 font-mono text-[0.68rem] text-sys-soft/70">
            DEADLINE: {minutesToClock(toMinutes(deadline))} · REMINDER: {minutesToClock(toMinutes(reminder))} ·
            MODE: {mode === "photo" ? "PHOTO + AI VERIFICATION" : mode === "timer" ? "TIMER" : "ASK"}
          </div>

          <div className="flex gap-2">
            <SysButton
              solid
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await post("/api/onboard", {
                  name,
                  dailyTask: task,
                  taskPrompt: prompt,
                  timezone: tz,
                  deadlineMinutes: toMinutes(deadline),
                  reminderMinutes: toMinutes(reminder),
                  verificationMode: mode,
                  timerMinimumMinutes: timerMin,
                  primaryCategory: category,
                });
                setBusy(false);
                onDone();
              }}
            >
              {busy ? "BINDING…" : "ACCEPT AND AWAKEN"}
            </SysButton>
          </div>
        </div>
      </SysWindow>
    </main>
  );
}
