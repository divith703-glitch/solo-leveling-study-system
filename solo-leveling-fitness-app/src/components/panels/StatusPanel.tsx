"use client";

import { DAY_STATUS_META, RANK_META, TITLES, formatLocalDate } from "@/lib/game";
import type { SystemState } from "@/lib/api-types";
import { Divider, RankEmblem, Row, SysBar, SysButton, SysWindow, SectionTitle } from "../SystemUI";

export function StatusPanel({ state }: { state: SystemState }) {
  const h = state.hunter;
  const activeTitle = TITLES.find((t) => t.key === h.activeTitle);
  const days = state.history.slice().reverse();
  const fatigue = Math.min(100, state.stats.missedTotal * 12 + state.hunter.escapeAttempts * 3);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SysWindow title="STATUS" tag="HUNTER" className="lg:col-span-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <RankEmblem letter={state.rank.letter} size={92} />
            <div>
              <div className="font-display text-2xl font-black tracking-[0.12em] text-white glow-text">
                {h.name}
              </div>
              <div className="mt-1 font-mono text-[0.68rem] tracking-[0.22em] text-sys/80">
                LV. {h.level} · JOB: PLAYER · {state.rank.letter}-RANK
              </div>
              <div className="mt-1 font-mono text-[0.62rem] tracking-[0.18em] text-sys-soft/60">
                TITLE: {h.activeTitle ? h.activeTitle.replace(/-/g, " ").toUpperCase() : "NONE"}
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-2 sm:min-w-[240px]">
            <div className="flex items-center justify-between font-mono text-[0.62rem] tracking-widest text-sys-soft/70">
              <span>EXPERIENCE</span>
              <span>
                {state.xp.into} / {state.xp.need}
              </span>
            </div>
            <SysBar pct={state.xp.pct} />
            <div className="flex items-center justify-between font-mono text-[0.62rem] tracking-widest text-sys-soft/70">
              <span>FATIGUE</span>
              <span>{fatigue}</span>
            </div>
            <SysBar pct={fatigue} tone={fatigue > 60 ? "danger" : "gold"} danger={fatigue > 60} />
          </div>
        </div>

        <Divider />

        <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
          <Row label="STREAK" value={`${h.currentStreak} DAY${h.currentStreak === 1 ? "" : "S"}`} />
          <Row label="BEST STREAK" value={h.bestStreak} />
          <Row label="TOTAL XP" value={h.totalXp} />
          <Row label="STAT POINTS" value={h.statPoints} tone="gold" />
          <Row label="LOGS" value={h.totalLogs} />
          <Row label="MISSED" value={h.missedTotal} tone={h.missedTotal ? "danger" : "sys"} />
          <Row label="HONOR ENTRIES" value={h.honorCount} tone={h.honorCount ? "gold" : "sys"} />
          <Row label="CONSISTENCY" value={`${state.stats.verifiedPct}%`} />
        </div>
      </SysWindow>

      <SysWindow title="ATTRIBUTES" tag="AUTO-LEVELLED">
        <div className="space-y-3">
          {state.attributes.map((a) => (
            <div key={a.key}>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[0.74rem] tracking-[0.16em] text-white">
                  {a.key} · {a.label}
                </span>
                <span className="font-mono text-[0.7rem] text-sys">
                  LV.{a.level} <span className="text-sys-soft/50">({a.into}/{a.needed})</span>
                </span>
              </div>
              <SysBar pct={a.pct} className="mt-1" />
              <div className="mt-1 font-mono text-[0.58rem] tracking-widest text-sys-soft/45">
                {a.tracked.toUpperCase()}
              </div>
            </div>
          ))}
          <div className="font-mono text-[0.58rem] leading-relaxed text-sys-soft/45">
            ATTRIBUTES LEVEL THEMSELVES FROM YOUR LOGGED DATA. NO MANUAL EDITING. NO MANUAL EDITING
            OF PAST DAYS EITHER — THE STREAK HISTORY IS IMMUTABLE.
          </div>
        </div>
      </SysWindow>

      <SysWindow title="RANK" tag={state.rank.weeks}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <RankEmblem letter={state.rank.letter} size={64} />
            <div>
              <div className="font-display text-lg tracking-[0.14em] text-white glow-text">
                {state.rank.letter}-RANK · {state.rank.name}
              </div>
              <div className="mt-1 font-mono text-[0.62rem] leading-relaxed text-sys-soft/70">
                {state.rank.focus}
              </div>
            </div>
          </div>
          <Divider />
          <div className="space-y-1">
            {state.rank.gates.map((g) => (
              <div
                key={g.letter}
                className="flex items-center gap-3 border px-2 py-1.5"
                style={{
                  borderColor: g.unlocked ? `${RANK_META[g.letter].color}55` : "rgba(63,210,255,.14)",
                  background: g.unlocked ? `${RANK_META[g.letter].color}12` : "transparent",
                }}
              >
                <span
                  className="font-display text-sm font-black"
                  style={{ color: RANK_META[g.letter].color }}
                >
                  {g.letter}
                </span>
                <span className="font-mono text-[0.6rem] text-sys-soft/60">
                  LV.{g.lvlReq} + STREAK {g.stkReq}
                </span>
                <span className="ml-auto font-mono text-[0.6rem] tracking-widest">
                  <span style={{ color: g.lvlOk ? "#3fd2ff" : "#ff2f45" }}>
                    LV {g.lvlOk ? "✓" : "✗"}
                  </span>{" "}
                  <span style={{ color: g.stkOk ? "#3fd2ff" : "#ff2f45" }}>
                    STK {g.stkOk ? "✓" : "✗"}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="font-mono text-[0.58rem] text-sys-soft/45">
            RANK IS THE LOWER OF YOUR LEVEL-RANK AND YOUR STREAK-RANK. CONSISTENCY GATES POWER.
          </div>
        </div>
      </SysWindow>

      <SysWindow title="TITLES" tag={`${state.titles.filter((t) => t.unlocked).length}/${TITLES.length}`} className="lg:col-span-2">
        <SectionTitle>PERMANENT XP BONUSES</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {state.titles.map((t) => (
            <div
              key={t.key}
              className="border p-2"
              style={{
                borderColor: t.unlocked ? "#ffd16666" : "rgba(63,210,255,.16)",
                background: t.unlocked ? "rgba(255,209,102,.07)" : "transparent",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="font-display text-[0.72rem] tracking-[0.14em]"
                  style={{ color: t.unlocked ? "#ffd166" : "#5f7f92" }}
                >
                  {t.unlocked ? "★" : "☆"} {t.name}
                </span>
                <span className="font-mono text-[0.6rem] text-gold/80">+{t.bonusPct}% XP</span>
              </div>
              <div className="mt-1 font-mono text-[0.58rem] text-sys-soft/50">{t.requirement}</div>
            </div>
          ))}
        </div>
      </SysWindow>

      <SysWindow title="STREAK HISTORY" tag="IMMUTABLE · 90 DAYS" className="lg:col-span-2">
        <div className="flex flex-wrap gap-1">
          {days.map((d) => {
            const meta = DAY_STATUS_META[d.status] ?? DAY_STATUS_META.pending;
            return (
              <div
                key={d.localDate}
                title={`${formatLocalDate(d.localDate)} — ${meta.label}${d.note ? ` · ${d.note}` : ""}`}
                className="h-4 w-4 border"
                style={{
                  borderColor: `${meta.color}66`,
                  background: d.status === "missed" || d.status === "failed" ? `${meta.color}` : `${meta.color}33`,
                  boxShadow: d.status === "verified" ? `0 0 8px ${meta.color}88` : "none",
                }}
              />
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {Object.entries(DAY_STATUS_META).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 font-mono text-[0.58rem] text-sys-soft/60">
              <span className="h-3 w-3 border" style={{ borderColor: `${v.color}66`, background: `${v.color}33` }} />
              {v.label}
            </span>
          ))}
        </div>
        <Divider />
        <div className="space-y-1">
          {state.guard.events.slice(0, 5).map((e, i) => (
            <div key={i} className="flex items-center justify-between font-mono text-[0.6rem] text-sys-soft/60">
              <span>{e.appName.toUpperCase()}</span>
              <span style={{ color: e.action === "blocked" ? "#ff2f45" : "#3fd2ff" }}>
                {e.action.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
          ))}
          {state.guard.events.length === 0 ? (
            <div className="font-mono text-[0.6rem] text-sys-soft/40">NO BLOCKER EVENTS RECORDED.</div>
          ) : null}
        </div>
      </SysWindow>

      <div className="hidden">{activeTitle ? activeTitle.key : null}</div>
    </div>
  );
}

export function StatPointsBadge({ state }: { state: SystemState }) {
  return (
    <SysButton ghost disabled>
      STAT POINTS {state.hunter.statPoints}
    </SysButton>
  );
}
