"use client";

import { NEVER_BLOCKED, SETTINGS_APP } from "@/lib/game";
import type { SystemState } from "@/lib/api-types";
import { Divider, SysButton, SysWindow, SectionTitle, StatusPill } from "../SystemUI";

const APP_ICONS: Record<string, string> = {
  Instagram: "◎",
  Reddit: "◉",
  WhatsApp: "✆",
  YouTube: "▶",
  TikTok: "♪",
  "X (Twitter)": "✕",
  Chrome: "◍",
  Snapchat: "◇",
  Netflix: "▶",
  Discord: "◈",
};

export function GuardPanel({
  state,
  onAttempt,
  onOpenDisable,
  busy,
}: {
  state: SystemState;
  onAttempt: (app: string) => void;
  onOpenDisable: () => void;
  busy: boolean;
}) {
  const p = state.punishment;
  return (
    <div className="space-y-4">
      <SysWindow
        title={p ? "APP BLOCKER — ENGAGED" : "APP BLOCKER — STANDBY"}
        tag="FOREGROUND DETECTOR"
        tone={p ? "danger" : "sys"}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill text={p ? "PUNISHMENT MODE" : "NORMAL MODE"} tone={p ? "danger" : "sys"} />
            <StatusPill text={`GUARD ${state.guard.enabled ? "ON" : "OFF"}`} tone={state.guard.enabled ? "sys" : "danger"} />
            <StatusPill text={`MISSED ${state.stats.missedTotal}`} tone={state.stats.missedTotal ? "danger" : "sys"} />
            <StatusPill text={`ESCAPES ${state.hunter.escapeAttempts}`} tone={state.hunter.escapeAttempts ? "gold" : "sys"} />
          </div>
          <p className="font-mono text-[0.7rem] leading-relaxed text-sys-soft/75">
            {p
              ? "TAP ANY APP BELOW TO SIMULATE LAUNCHING IT. THE FOREGROUND DETECTOR INTERCEPTS THE LAUNCH AND RAISES THE FULL-SCREEN BLOCKING UI. NOTHING IS DELETED, NO DEVICE DAMAGE, AND EMERGENCY APPS STAY OPEN."
              : "IN NORMAL MODE NOTHING IS BLOCKED. THE BLOCKER ONLY ENGAGES AFTER A MISSED DAILY LOG, AND IT ACTIVATES IMMEDIATELY AT THE DEADLINE."}
          </p>

          <Divider />

          <SectionTitle tone="danger">DISTRACTION LIST — BLOCKED DURING PUNISHMENT</SectionTitle>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {state.guard.blocked.map((app) => (
              <button
                key={app}
                disabled={busy}
                onClick={() => onAttempt(app)}
                className="flex flex-col items-center gap-1 border border-danger/30 bg-danger/5 p-2 transition hover:border-danger/80 hover:bg-danger/10"
              >
                <span className="text-xl text-danger">{APP_ICONS[app] ?? "▣"}</span>
                <span className="text-center font-mono text-[0.56rem] leading-tight tracking-widest text-sys-soft/80">
                  {app.toUpperCase()}
                </span>
              </button>
            ))}
            <button
              disabled={busy}
              onClick={() => onAttempt(SETTINGS_APP)}
              className="flex flex-col items-center gap-1 border border-gold/40 bg-gold/5 p-2 transition hover:border-gold/80"
            >
              <span className="text-xl text-gold">⚙</span>
              <span className="text-center font-mono text-[0.56rem] leading-tight tracking-widest text-sys-soft/80">
                SETTINGS (30s DELAY)
              </span>
            </button>
          </div>

          <Divider />

          <SectionTitle tone="sys">ESSENTIAL / EMERGENCY — NEVER BLOCKED</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {[...NEVER_BLOCKED, ...state.settings.essentialApps.filter((a) => !NEVER_BLOCKED.includes(a))].map(
              (app) => (
                <button
                  key={app}
                  disabled={busy}
                  onClick={() => onAttempt(app)}
                  className="border border-sys/40 bg-sys/5 px-2 py-1 font-mono text-[0.6rem] tracking-widest text-sys-soft/85 transition hover:border-sys"
                >
                  {app.toUpperCase()} ✓
                </button>
              ),
            )}
          </div>
          <div className="font-mono text-[0.58rem] leading-relaxed text-sys-soft/50">
            TRADEOFF (DOCUMENTED): THE SETTINGS APP IS NOT HARD-BLOCKED BECAUSE EMERGENCY ACTIONS
            (AIRPLANE MODE, ACCESSIBILITY, BATTERY) LIVE THERE. DURING PUNISHMENT IT IS GATED BY A
            30-SECOND DELAY AND EVERY ENTRY IS LOGGED. THE ACCESSIBILITY SERVICE RESTARTS ITSELF IF
            KILLED, AND DISABLING IT REQUIRES A TIMED WARNING PLUS A TYPED SENTENCE.
          </div>

          <Divider />

          <div className="flex flex-wrap items-center gap-2">
            <SysButton tone="danger" solid disabled={!p || busy} onClick={onOpenDisable}>
              DISABLE BLOCKER (5 MIN WARNING)
            </SysButton>
            {!p ? (
              <span className="font-mono text-[0.6rem] text-sys-soft/50">
                NO CONSEQUENCE ACTIVE — NOTHING TO DISABLE.
              </span>
            ) : (
              <span className="font-mono text-[0.6rem] text-danger/70">
                THE DAY WILL BE MARKED FAILED — PERMANENTLY.
              </span>
            )}
          </div>
        </div>
      </SysWindow>

      <SysWindow title="BLOCKER EVENT LOG" tag="AUDIT">
        <div className="space-y-1">
          {state.guard.events.length === 0 ? (
            <div className="font-mono text-[0.64rem] text-sys-soft/50">NO EVENTS RECORDED.</div>
          ) : null}
          {state.guard.events.map((e, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 border-b border-sys/10 py-1 font-mono text-[0.64rem] last:border-0"
            >
              <span className="text-white/85">{e.appName.toUpperCase()}</span>
              <span
                style={{
                  color:
                    e.action === "blocked"
                      ? "#ff2f45"
                      : e.action === "escape_attempt" || e.action === "force_disable"
                        ? "#ffd166"
                        : "#3fd2ff",
                }}
              >
                {e.action.replace(/_/g, " ").toUpperCase()}
              </span>
              <span className="text-sys-soft/40">
                {new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </SysWindow>
    </div>
  );
}
