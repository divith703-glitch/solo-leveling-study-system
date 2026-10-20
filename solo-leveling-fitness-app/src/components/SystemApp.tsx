"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { minutesToClock } from "@/lib/game";
import type { SystemState } from "@/lib/api-types";
import { SysBar, SysButton } from "./SystemUI";
import {
  BlockedAppOverlay,
  DisableGuardModal,
  EscapeOverlay,
  HellProtocolModal,
  LevelUpOverlay,
  PunishmentScreen,
  SystemNotification,
} from "./Overlays";
import { Awakening } from "./Awakening";
import { StatusPanel } from "./panels/StatusPanel";
import { DailyPanel } from "./panels/DailyPanel";
import { QuestPanel } from "./panels/QuestPanel";
import { SchedulePanel } from "./panels/SchedulePanel";
import { TrainingPanel } from "./panels/TrainingPanel";
import { GuardPanel } from "./panels/GuardPanel";
import { SettingsPanel } from "./panels/SettingsPanel";

type Tab = "status" | "daily" | "timetable" | "quests" | "training" | "guard" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "status", label: "STATUS" },
  { key: "daily", label: "DAILY" },
  { key: "timetable", label: "TIMETABLE" },
  { key: "quests", label: "QUESTS" },
  { key: "training", label: "TRAINING" },
  { key: "guard", label: "GUARD" },
  { key: "settings", label: "SYSTEM" },
];

function notifyBrowser(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    /* ignore */
  }
}

export function SystemApp() {
  const [state, setState] = useState<SystemState | null>(null);
  const [tab, setTab] = useState<Tab>("daily");
  const [levelUp, setLevelUp] = useState<{ to?: number; gained?: number } | null>(null);
  const [notif, setNotif] = useState<{ title: string; lines: string[]; tone: "sys" | "danger" | "gold" | "violet" } | null>(null);
  const [blockedApp, setBlockedApp] = useState<string | null>(null);
  const [escape, setEscape] = useState(false);
  const [showPunish, setShowPunish] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const tzRef = useRef<string | null>(null);
  const firedRef = useRef<Set<string>>(new Set());
  const hiddenAtRef = useRef<number | null>(null);
  const punishSeenRef = useRef<number | null>(null);
  const protocolSeenRef = useRef<string | null>(null);

  useEffect(() => {
    tzRef.current = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }, []);

  const post = useCallback(async (path: string, body: unknown): Promise<Record<string, unknown> | null> => {
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return (await res.json()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, []);

  const flash = useCallback((kind: string, payload: Record<string, unknown>) => {
    if (kind === "level_up") setLevelUp(payload as { to?: number; gained?: number });
  }, []);

  const notify = useCallback(
    (title: string, lines: string[], tone: "sys" | "danger" | "gold" | "violet" = "sys") => {
      setNotif({ title, lines, tone });
    },
    [],
  );

  const handleEvents = useCallback(
    (events: { kind: string; payload: Record<string, unknown> }[]) => {
      for (const e of events) {
        if (e.kind === "level_up") {
          setLevelUp(e.payload as { to?: number; gained?: number });
        } else if (e.kind === "title") {
          notify(
            "NEW TITLE ACQUIRED",
            [
              `YOU HAVE EARNED THE TITLE “${String(e.payload.name ?? "").toUpperCase()}”.`,
              `PERMANENT XP BONUS: +${String(e.payload.bonusPct ?? 0)}%`,
              "EQUIP IT FROM SYSTEM → GUARD & BYPASS RESISTANCE.",
            ],
            "gold",
          );
        } else if (e.kind === "punishment") {
          setShowPunish(true);
          notifyBrowser(
            "⚠ STREAK BROKEN — CONSEQUENCE ACTIVE",
            "The daily quest was not completed. Blocked apps are now locked."
          );
        } else if (e.kind === "punishment_cleared") {
          notify("CONSEQUENCE LIFTED", [
            "THE RECOVERY REQUIREMENT HAS BEEN MET.",
            "NORMAL ACCESS RESTORED. THE STREAK IS RE-ESTABLISHED AT 1 DAY.",
          ]);
        } else if (e.kind === "emergency_quest") {
          notify("SUDDEN QUEST ISSUED", [
            `“${String(e.payload.title ?? "")}”`,
            `TIME LIMIT: ${String(e.payload.windowMinutes ?? 0)} MINUTES. THE REWARD EXPIRES WITH THE TIMER.`,
          ], "violet");
        } else if (e.kind === "force_disabled") {
          notify("DAY MARKED AS FAILED — PERMANENT", [
            "YOU DISABLED THE BLOCKER DURING PUNISHMENT MODE.",
            "THE CONSEQUENCE IS CONSIDERED SERVED. ACCESS IS RESTORED, BUT THIS DATE CANNOT BE RECOVERED.",
          ], "danger");
        } else if (e.kind === "proof_queued") {
          notify("PROOF QUEUED", [
            "THE VERIFIER WAS UNREACHABLE. YOUR STREAK IS SAFE AND THE XP IS HELD.",
            "IT WILL RESOLVE AUTOMATICALLY — WORST CASE IT DEGRADES TO HONOR MODE.",
          ], "gold");
        }
      }
    },
    [notify],
  );

  const refresh = useCallback(async () => {
    const q = tzRef.current ? `?tz=${encodeURIComponent(tzRef.current)}` : "";
    try {
      const res = await fetch(`/api/state${q}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as SystemState;
      setState(data);
      handleEvents(data.events ?? []);
    } catch {
      /* offline: keep last state */
    }
  }, [handleEvents]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 20000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---------------- scheduled client-side reminders ---------------- */
  useEffect(() => {
    if (!state) return;
    const nowMin = clock.getHours() * 60 + clock.getMinutes();
    const key = (k: string) => `${k}:${state.today.localDate}:${clock.getHours()}`;
    if (!state.today.completedToday) {
      const msLeft = (state.settings.deadlineMinutes - nowMin) * 60000;
      if (msLeft > 0 && msLeft <= 3600000 && !firedRef.current.has(key("warn"))) {
        firedRef.current.add(key("warn"));
        notify("⚠ QUEST EXPIRES SOON", [
          `THE DAILY QUEST EXPIRES AT ${minutesToClock(state.settings.deadlineMinutes)}.`,
          "COMPLETING IT TAKES MINUTES. THE CONSEQUENCE LASTS UNTIL YOU RECOVER.",
        ], "gold");
        notifyBrowser("⚠ QUEST EXPIRES SOON", "Complete the daily quest now.");
      }
      if (
        nowMin >= state.settings.reminderMinutes &&
        nowMin < state.settings.reminderMinutes + 2 &&
        !firedRef.current.has(key("remind"))
      ) {
        firedRef.current.add(key("remind"));
        notify("DAILY QUEST AVAILABLE", [
          `[${state.settings.dailyTask.toUpperCase()}]`,
          `DEADLINE ${minutesToClock(state.settings.deadlineMinutes)} · REWARD 100 XP + 3 STAT POINTS`,
        ]);
      }
    }
    if (state.punishment && punishSeenRef.current !== state.punishment.id) {
      punishSeenRef.current = state.punishment.id;
      setShowPunish(true);
    }
    if (state.schedule.requiresChoice && protocolSeenRef.current !== state.today.localDate) {
      protocolSeenRef.current = state.today.localDate;
      setShowProtocol(true);
    }
  }, [state, clock, notify]);

  const chooseProtocol = useCallback(
    async (mode: "school" | "hell") => {
      setBusy(true);
      await post("/api/schedule", { action: "set_mode", mode });
      setBusy(false);
      setShowProtocol(false);
      await refresh();
      if (mode === "hell") {
        notify(
          "HELL PROTOCOL ACTIVATED",
          [
            "NO SCHOOL. THE ANNEX IS ISSUED:",
            "· SANSKRIT STUDY — 30 MIN (12:30–13:00)",
            "· ENGLISH STUDY — 0.5 HRS (13:00–13:30)",
            "TODAY'S DAILY QUEST, WORKOUT AND SESSION 3 REMAIN ENFORCED.",
          ],
          "violet",
        );
      }
    },
    [post, refresh, notify],
  );

  /* ---------------- guard: escape detection ---------------- */
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenFor = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;
      if (hiddenFor > 5000 && state?.punishment) {
        void post("/api/guard", { action: "escape" });
        setEscape(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [state?.punishment, post]);

  /* ---------------- guard: unload resistance ---------------- */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state?.punishment) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state?.punishment]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  const attemptApp = useCallback(
    async (app: string) => {
      setBusy(true);
      const res = await post("/api/guard", { action: "attempt", app });
      setBusy(false);
      if (!res) return;
      if (res.blocked) {
        setBlockedApp(app);
        notifyBrowser("ACCESS DENIED", `${app} is blocked until the recovery requirement is met.`);
      } else if (res.delayed) {
        notify("SETTINGS — 30 SECOND DELAY", [
          "THE SETTINGS APP IS GATED DURING PUNISHMENT MODE BECAUSE EMERGENCY ACTIONS LIVE THERE.",
          "YOUR ENTRY HAS BEEN LOGGED.",
        ], "gold");
      } else {
        notify("ACCESS ALLOWED", [String(res.reason ?? "")]);
      }
      await refresh();
    },
    [post, refresh, notify],
  );

  if (!state) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="font-mono text-[0.7rem] tracking-[0.3em] text-sys/70">
          CONNECTING TO THE SYSTEM <span className="blink">█</span>
        </div>
      </main>
    );
  }

  if (!state.onboarded) {
    return (
      <Awakening
        post={post}
        onDone={async () => {
          await refresh();
          setTab("daily");
        }}
      />
    );
  }

  const nowMin = clock.getHours() * 60 + clock.getMinutes();
  const secsLeft = state.settings.deadlineMinutes * 60 - (nowMin * 60 + clock.getSeconds());

  return (
    <div className="min-h-screen pb-10">
      {/* ---------------- HEADER ---------------- */}
      <header className="sticky top-0 z-40 border-b border-sys/25 bg-black/85 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-display text-sm font-black tracking-[0.34em] text-sys glow-text">
              SYSTEM
            </span>
            <span className="font-mono text-[0.66rem] tracking-[0.18em] text-white/85">
              {state.hunter.name} · LV.{state.hunter.level}
            </span>
            <span className="sys-chip">{state.rank.letter}-RANK</span>
            <span className="sys-chip">🔥 {state.hunter.currentStreak}D</span>
            <span className={`sys-chip ${state.punishment ? "border-danger/60 text-danger" : ""}`}>
              {state.punishment ? "CONSEQUENCE ACTIVE" : "NORMAL MODE"}
            </span>
            <span className="sys-chip hidden sm:inline-block">
              {state.today.completedToday
                ? "LOG COMPLETE"
                : secsLeft <= 0
                  ? "EXPIRED"
                  : `${String(Math.floor(secsLeft / 3600)).padStart(2, "0")}:${String(
                      Math.floor((secsLeft % 3600) / 60),
                    ).padStart(2, "0")} LEFT`}
            </span>
            <span className="ml-auto font-mono text-[0.62rem] text-sys-soft/50">
              {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <SysBar pct={state.xp.pct} className="flex-1" />
            <span className="shrink-0 font-mono text-[0.6rem] text-sys-soft/60">
              {state.xp.into}/{state.xp.need} XP
            </span>
          </div>
          <nav className="mt-2 flex gap-1 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.key}
                className="tab-btn"
                data-active={tab === t.key}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {state.punishment ? (
        <div className="mx-auto max-w-5xl px-3 pt-3">
          <button
            onClick={() => setShowPunish(true)}
            className="w-full border border-danger/60 bg-danger/12 p-2 text-left"
          >
            <span className="font-display text-[0.72rem] tracking-[0.22em] text-danger glow-text">
              ⚠ STREAK BROKEN — CONSEQUENCE ACTIVE · {state.punishment.missedCount} MISSED ·{" "}
              {state.punishment.penaltyLabel}
            </span>
            <span className="ml-2 font-mono text-[0.6rem] text-danger/70">
              TAP TO OPEN THE RECOVERY REQUIREMENT
            </span>
          </button>
        </div>
      ) : null}

      <main className="mx-auto max-w-5xl px-3 py-4">
        {tab === "status" ? <StatusPanel state={state} /> : null}
        {tab === "daily" ? (
          <DailyPanel state={state} post={post} refresh={refresh} notify={notify} flash={flash} />
        ) : null}
        {tab === "timetable" ? (
          <SchedulePanel state={state} post={post} refresh={refresh} notify={notify} flash={flash} />
        ) : null}
        {tab === "quests" ? (
          <QuestPanel state={state} post={post} refresh={refresh} flash={flash} />
        ) : null}
        {tab === "training" ? (
          <TrainingPanel state={state} post={post} refresh={refresh} flash={flash} />
        ) : null}
        {tab === "guard" ? (
          <GuardPanel
            state={state}
            onAttempt={attemptApp}
            onOpenDisable={() => setShowDisable(true)}
            busy={busy}
          />
        ) : null}
        {tab === "settings" ? (
          <SettingsPanel state={state} post={post} refresh={refresh} />
        ) : null}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-sys/15 pt-3">
          <span className="font-mono text-[0.58rem] tracking-[0.18em] text-sys-soft/40">
            THE SYSTEM · LOCAL FIRST · STREAK HISTORY IS IMMUTABLE
          </span>
          <a
            href="/docs"
            className="font-mono text-[0.58rem] tracking-[0.18em] text-sys/60 underline decoration-dotted hover:text-sys"
          >
            ARCHITECTURE / STATE MACHINE / EDGE CASES →
          </a>
        </footer>
      </main>

      {/* ---------------- OVERLAYS ---------------- */}
      {levelUp ? <LevelUpOverlay payload={levelUp} onClose={() => setLevelUp(null)} /> : null}
      {notif ? (
        <SystemNotification
          title={notif.title}
          lines={notif.lines}
          tone={notif.tone}
          onClose={() => setNotif(null)}
        />
      ) : null}
      {showPunish && state.punishment ? (
        <PunishmentScreen
          state={state}
          submitting={busy}
          onToggleGoal={async (id, i) => {
            setBusy(true);
            await post("/api/quest", { action: "toggle_goal", id, goalIndex: i });
            setBusy(false);
            await refresh();
          }}
          onOpenDisable={() => {
            setShowPunish(false);
            setShowDisable(true);
          }}
        />
      ) : null}
      {blockedApp ? (
        <BlockedAppOverlay app={blockedApp} state={state} onReturn={() => setBlockedApp(null)} />
      ) : null}
      {escape ? <EscapeOverlay onReturn={() => setEscape(false)} /> : null}
      {showProtocol && state.onboarded ? (
        <HellProtocolModal
          isSunday={state.schedule.isSunday}
          dateLabel={state.today.dayLabel}
          busy={busy}
          onChoose={(mode) => void chooseProtocol(mode)}
        />
      ) : null}
      {showDisable && state.punishment ? (
        <DisableGuardModal
          delaySec={state.guard.disableDelaySec}
          onCancel={() => setShowDisable(false)}
          onConfirm={async (sentence, startedAt) => {
            const res = await post("/api/guard", {
              action: "force_disable",
              sentence,
              requestedAt: startedAt,
            });
            if (!res || !res.ok) return String(res?.error ?? "DISABLE FAILED");
            setShowDisable(false);
            await refresh();
            return null;
          }}
        />
      ) : null}
      {showPunish && state.punishment ? (
        <div className="fixed bottom-3 left-1/2 z-[76] -translate-x-1/2">
          <SysButton
            tone="danger"
            solid
            onClick={() => {
              setShowPunish(false);
              setTab("daily");
            }}
          >
            OPEN RECOVERY PANEL
          </SysButton>
        </div>
      ) : null}
    </div>
  );
}
