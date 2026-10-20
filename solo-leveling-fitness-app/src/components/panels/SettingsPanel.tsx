"use client";

import { useEffect, useState } from "react";
import { ATTRS, minutesToClock } from "@/lib/game";
import type { SystemState } from "@/lib/api-types";
import { SysButton, SysWindow, SectionTitle, Divider } from "../SystemUI";

export function SettingsPanel({
  state,
  post,
  refresh,
}: {
  state: SystemState;
  post: (path: string, body: unknown) => Promise<Record<string, unknown> | null>;
  refresh: () => Promise<void>;
}) {
  const s = state.settings;
  const [name, setName] = useState(state.hunter.name);
  const [task, setTask] = useState(s.dailyTask);
  const [prompt, setPrompt] = useState(s.taskPrompt);
  const [category, setCategory] = useState(s.primaryCategory);
  const [deadline, setDeadline] = useState(
    `${String(Math.floor(s.deadlineMinutes / 60)).padStart(2, "0")}:${String(s.deadlineMinutes % 60).padStart(2, "0")}`,
  );
  const [reminder, setReminder] = useState(
    `${String(Math.floor(s.reminderMinutes / 60)).padStart(2, "0")}:${String(s.reminderMinutes % 60).padStart(2, "0")}`,
  );
  const [mode, setMode] = useState(s.verificationMode);
  const [timerMin, setTimerMin] = useState(s.timerMinimumMinutes);
  const [blocked, setBlocked] = useState<string[]>(s.blockedApps);
  const [essential, setEssential] = useState<string[]>(s.essentialApps);
  const [newBlocked, setNewBlocked] = useState("");
  const [newEssential, setNewEssential] = useState("");
  const [holidayDates, setHolidayDates] = useState<string[]>(state.schedule.holidayDates);
  const [newHoliday, setNewHoliday] = useState("");
  const [guardEnabled, setGuardEnabled] = useState(s.guardEnabled);
  const [guardDelay, setGuardDelay] = useState(s.guardDisableDelaySec);
  const [title, setTitle] = useState(state.hunter.activeTitle ?? "");
  const [week, setWeek] = useState(s.weekIndex);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(state.hunter.name);
    setTask(s.dailyTask);
    setPrompt(s.taskPrompt);
    setCategory(s.primaryCategory);
    setMode(s.verificationMode);
    setTimerMin(s.timerMinimumMinutes);
    setBlocked(s.blockedApps);
    setEssential(s.essentialApps);
    setGuardEnabled(s.guardEnabled);
    setGuardDelay(s.guardDisableDelaySec);
    setWeek(s.weekIndex);
    setTitle(state.hunter.activeTitle ?? "");
    setHolidayDates(state.schedule.holidayDates);
  }, [state, s]);

  const toMin = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  async function save() {
    setBusy(true);
    await post("/api/settings", {
      name,
      dailyTask: task,
      taskPrompt: prompt,
      primaryCategory: category,
      deadlineMinutes: toMin(deadline),
      reminderMinutes: toMin(reminder),
      verificationMode: mode,
      timerMinimumMinutes: timerMin,
      blockedApps: blocked,
      essentialApps: essential,
      guardEnabled,
      guardDisableDelaySec: guardDelay,
      weekIndex: week,
      activeTitle: title || null,
      holidayDates,
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
    await refresh();
  }

  return (
    <div className="space-y-4">
      <SysWindow title="DAILY QUEST CONFIGURATION" tag="SYSTEM">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="sys-label">HUNTER NAME</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span className="sys-label">PRIMARY ATTRIBUTE</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as typeof ATTRS[number])}>
                {ATTRS.map((a) => (
                  <option key={a} value={a}>
                    {a}
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
            <span className="sys-label">AI VERIFIER PROMPT (DESCRIBES VALID PROOF)</span>
            <textarea
              className="resize-none"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="sys-label">DEADLINE</span>
              <input type="time" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </label>
            <label>
              <span className="sys-label">REMINDER</span>
              <input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} />
            </label>
          </div>
          <div>
            <span className="sys-label">VERIFICATION METHOD</span>
            <div className="mt-1 grid gap-2 sm:grid-cols-3">
              {[
                { k: "photo", t: "PHOTO + AI" },
                { k: "ask", t: "PHOTO OR TIMER" },
                { k: "timer", t: "TIMER ONLY" },
              ].map((o) => (
                <button
                  key={o.k}
                  onClick={() => setMode(o.k)}
                  className="border p-2 font-display text-[0.7rem] tracking-widest"
                  style={{
                    borderColor: mode === o.k ? "#3fd2ff" : "rgba(63,210,255,.22)",
                    background: mode === o.k ? "rgba(63,210,255,.1)" : "transparent",
                    color: mode === o.k ? "#fff" : "#8fb6c8",
                  }}
                >
                  {o.t}
                </button>
              ))}
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
          <div className="font-mono text-[0.6rem] text-sys-soft/50">
            TIMEZONE: {s.timezone} · DEADLINE {minutesToClock(toMin(deadline))} · CHECKBOX-ONLY
            LOGGING IS DISABLED BY DESIGN.
          </div>
        </div>
      </SysWindow>

      <SysWindow title="DISTRACTION & ESSENTIAL APPS" tag="BLOCKER LISTS">
        <div className="space-y-3">
          <SectionTitle tone="danger">BLOCKED DURING PUNISHMENT</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {blocked.map((app) => (
              <button
                key={app}
                onClick={() => setBlocked(blocked.filter((a) => a !== app))}
                className="border border-danger/40 bg-danger/8 px-2 py-1 font-mono text-[0.62rem] tracking-widest text-danger/90"
              >
                {app.toUpperCase()} ✕
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newBlocked}
              onChange={(e) => setNewBlocked(e.target.value)}
              placeholder="add app or website name"
            />
            <SysButton
              ghost
              onClick={() => {
                if (newBlocked.trim()) setBlocked([...blocked, newBlocked.trim()]);
                setNewBlocked("");
              }}
            >
              ADD
            </SysButton>
          </div>

          <Divider />

          <SectionTitle>ESSENTIAL — NEVER BLOCKED</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {essential.map((app) => (
              <button
                key={app}
                onClick={() => setEssential(essential.filter((a) => a !== app))}
                className="border border-sys/40 bg-sys/8 px-2 py-1 font-mono text-[0.62rem] tracking-widest text-sys-soft/90"
              >
                {app.toUpperCase()} ✕
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newEssential}
              onChange={(e) => setNewEssential(e.target.value)}
              placeholder="add essential app (banking, medical, family…)"
            />
            <SysButton
              ghost
              onClick={() => {
                if (newEssential.trim()) setEssential([...essential, newEssential.trim()]);
                setNewEssential("");
              }}
            >
              ADD
            </SysButton>
          </div>
          <div className="font-mono text-[0.58rem] text-sys-soft/50">
            PHONE / DIALER, SMS, AND EMERGENCY CONTACTS ARE HARD-CODED AS NEVER BLOCKED AND CANNOT BE
            REMOVED FROM THE EXCEPTION LIST.
          </div>
        </div>
      </SysWindow>

      <SysWindow title="GUARD & BYPASS RESISTANCE" tag="BLOCKER">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setGuardEnabled(!guardEnabled)}
              className="border px-3 py-1 font-display text-[0.7rem] tracking-widest"
              style={{
                borderColor: guardEnabled ? "#3fd2ff" : "#ff2f45",
                color: guardEnabled ? "#fff" : "#ff9aa6",
                background: guardEnabled ? "rgba(63,210,255,.12)" : "rgba(255,47,69,.1)",
              }}
            >
              GUARD: {guardEnabled ? "ARMED" : "DISARMED"}
            </button>
            <span className="font-mono text-[0.6rem] text-sys-soft/55">
              DISABLING DURING PUNISHMENT REQUIRES A {Math.round(guardDelay / 60)}-MINUTE WARNING PLUS A TYPED SENTENCE.
            </span>
          </div>
          <label className="block">
            <span className="sys-label">WARNING PERIOD (SECONDS — 300 FOR THE REAL RULE)</span>
            <input
              type="number"
              min={15}
              max={600}
              step={15}
              value={guardDelay}
              onChange={(e) => setGuardDelay(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="sys-label">PROGRAM WEEK (SETS TRAINING TIER)</span>
            <input
              type="number"
              min={1}
              max={52}
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="sys-label">EQUIPPED TITLE</span>
            <select value={title} onChange={(e) => setTitle(e.target.value)}>
              <option value="">NONE</option>
              {state.titles
                .filter((t) => t.unlocked)
                .map((t) => (
                  <option key={t.key} value={t.name}>
                    {t.name} (+{t.bonusPct}% XP)
                  </option>
                ))}
            </select>
          </label>
        </div>
      </SysWindow>

      <SysWindow title="HOLIDAYS — HELL PROTOCOL TRIGGERS" tag="SUNDAYS AUTO">
        <div className="space-y-2">
          <p className="font-mono text-[0.66rem] leading-relaxed text-sys-soft/70">
            ON THESE DATES (PLUS EVERY SUNDAY) THE SYSTEM ASKS "SCHOOL OR HELL PROTOCOL?" AT FIRST
            CONTACT. ADD MOVABLE HOLIDAYS HERE (DIWALI, HOLI, EID…). FIXED-DATE INDIAN GOVERNMENT
            HOLIDAYS ARE PRE-LOADED.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {holidayDates.map((d) => (
              <button
                key={d}
                onClick={() => setHolidayDates(holidayDates.filter((x) => x !== d))}
                className="border border-violet/40 bg-violet/10 px-2 py-0.5 font-mono text-[0.6rem] tracking-widest text-violet/90"
              >
                {d} ✕
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="date" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} />
            <SysButton
              ghost
              onClick={() => {
                if (newHoliday && !holidayDates.includes(newHoliday)) {
                  setHolidayDates([...holidayDates, newHoliday].sort());
                }
                setNewHoliday("");
              }}
            >
              ADD DATE
            </SysButton>
          </div>
        </div>
      </SysWindow>

      <SysWindow title="AI VERIFICATION" tag="GEMINI · FREE TIER">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="sys-chip">{state.ai.hasKey ? "KEY PRESENT" : "NO KEY — HONOR FALLBACK"}</span>
            <span className="sys-chip">FALLBACK: RETRY → GROQ → HONOR MODE</span>
          </div>
          <p className="font-mono text-[0.66rem] leading-relaxed text-sys-soft/70">
            PHOTO PROOF IS SENT TO A FREE-TIER VISION MODEL WITH THE PROMPT “RESPOND ONLY WITH
            VERIFIED OR NOT_VERIFIED AND A ONE-LINE REASON”. THE IMAGE HASH IS STORED LOCALLY AND
            REUSED PHOTOS ARE REJECTED BEFORE ANY API CALL. PHOTOS THEMSELVES ARE NEVER STORED ON THE
            SERVER AND ARE PURGED FROM THE DEVICE AFTER 7 DAYS. IF THE API FAILS, THE LOG DEGRADES TO
            HONOR MODE — IT IS NEVER PERMANENTLY BLOCKED.
          </p>
        </div>
      </SysWindow>

      <div className="sticky bottom-3 z-10 flex items-center gap-2 border border-sys/30 bg-black/85 p-2 backdrop-blur">
        <SysButton solid disabled={busy} onClick={save}>
          {busy ? "SAVING…" : saved ? "SAVED ✓" : "SAVE CONFIGURATION"}
        </SysButton>
        <span className="font-mono text-[0.6rem] text-sys-soft/50">
          THE SYSTEM RE-EVALUATES THE DEADLINE ON EVERY SAVE.
        </span>
      </div>
    </div>
  );
}
