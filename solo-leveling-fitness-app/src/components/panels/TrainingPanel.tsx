"use client";

import { useState } from "react";
import { RANK_META, WEEKDAYS, type RankLetter } from "@/lib/game";
import type { SystemState } from "@/lib/api-types";
import { ExerciseGlyph } from "../ExerciseGlyph";
import { Divider, SysButton, SysWindow, SectionTitle } from "../SystemUI";

const TIERS: { letter: RankLetter; week: number }[] = [
  { letter: "E", week: 1 },
  { letter: "D", week: 3 },
  { letter: "C", week: 5 },
  { letter: "B", week: 9 },
  { letter: "A", week: 13 },
  { letter: "S", week: 25 },
];

export function TrainingPanel({
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
  const [busy, setBusy] = useState(false);
  const t = state.training;

  async function toggle(id: string) {
    setBusy(true);
    const res = await post("/api/workout", { exerciseId: id });
    setBusy(false);
    if (res?.ok && Number(res.levelsGained ?? 0) > 0) {
      flash("level_up", { to: Number(res.level ?? 1), gained: Number(res.levelsGained) });
    }
    await refresh();
  }

  async function setWeek(w: number) {
    setBusy(true);
    await post("/api/settings", { weekIndex: w });
    setBusy(false);
    await refresh();
  }

  const allDone = t.day.exercises.length > 0 && t.day.exercises.every((e) => e.done);

  return (
    <div className="space-y-4">
      <SysWindow title={`TRAINING PROTOCOL — ${t.rank}-RANK`} tag={t.weeks}>
        <div className="space-y-3">
          <div className="font-display text-lg tracking-[0.14em] text-white glow-text">
            {t.rank}-RANK · {t.tierName}
          </div>
          <p className="font-mono text-[0.7rem] leading-relaxed text-sys-soft/75">{t.focus}</p>

          <div>
            <SectionTitle>PROGRAM WEEK</SectionTitle>
            <div className="flex flex-wrap items-center gap-2">
              <SysButton ghost disabled={busy || state.settings.weekIndex <= 1} onClick={() => setWeek(state.settings.weekIndex - 1)}>
                ◀
              </SysButton>
              <span className="border border-sys/40 bg-black/50 px-3 py-1 font-mono text-sm tracking-widest text-sys">
                WEEK {state.settings.weekIndex}
              </span>
              <SysButton ghost disabled={busy || state.settings.weekIndex >= 52} onClick={() => setWeek(state.settings.weekIndex + 1)}>
                ▶
              </SysButton>
              <span className="ml-2 font-mono text-[0.6rem] text-sys-soft/50">
                TIER AUTO-SCALES WITH PROGRAM WEEK
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TIERS.map((tier) => (
                <button
                  key={tier.letter}
                  disabled={busy}
                  onClick={() => setWeek(tier.week)}
                  className="border px-2 py-1 font-display text-[0.66rem] tracking-widest transition"
                  style={{
                    borderColor: t.rank === tier.letter ? RANK_META[tier.letter].color : `${RANK_META[tier.letter].color}44`,
                    color: RANK_META[tier.letter].color,
                    background: t.rank === tier.letter ? `${RANK_META[tier.letter].color}1f` : "transparent",
                  }}
                >
                  {tier.letter} · WK {tier.week}+
                </button>
              ))}
            </div>
          </div>
        </div>
      </SysWindow>

      <SysWindow title="WEEKLY SCHEDULE" tag="MON → SUN">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d, i) => {
            const info = t.week[i];
            return (
              <div
                key={d.key}
                className="border p-1.5 text-center"
                style={{
                  borderColor: info.isToday ? "#3fd2ff" : "rgba(63,210,255,.18)",
                  background: info.isToday ? "rgba(63,210,255,.1)" : "transparent",
                  boxShadow: info.isToday ? "0 0 14px rgba(63,210,255,.25)" : "none",
                }}
              >
                <div className="font-display text-[0.62rem] tracking-widest text-white">{d.short}</div>
                <div className="mt-1 font-mono text-[0.5rem] leading-tight text-sys-soft/60">
                  {d.focus}
                </div>
                <div className="mt-1 font-mono text-[0.54rem] text-sys/80">
                  {info.done}/{info.count}
                </div>
              </div>
            );
          })}
        </div>
      </SysWindow>

      <SysWindow
        title={t.day.title}
        tag={allDone ? "SESSION COMPLETE" : `${t.day.exercises.filter((e) => e.done).length}/${t.day.exercises.length}`}
        tone={allDone ? "sys" : "violet"}
      >
        <div className="space-y-2">
          <p className="font-mono text-[0.68rem] leading-relaxed text-sys-soft/70">{t.day.note}</p>
          <Divider />
          <div className="grid gap-2 sm:grid-cols-2">
            {t.day.exercises.map((e) => (
              <button
                key={e.id}
                disabled={busy}
                onClick={() => toggle(e.id)}
                className="flex items-center gap-3 border p-2 text-left transition hover:border-sys/60"
                style={{
                  borderColor: e.done ? "#3fd2ff88" : "rgba(63,210,255,.2)",
                  background: e.done ? "rgba(63,210,255,.08)" : "rgba(0,0,0,.4)",
                }}
              >
                <ExerciseGlyph glyph={e.glyph} done={e.done} size={64} />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[0.76rem] tracking-wider text-white">
                    {e.name.toUpperCase()}
                  </span>
                  <span className="block font-mono text-[0.62rem] text-sys/85">{e.sets}</span>
                  <span className="block font-mono text-[0.58rem] leading-snug text-sys-soft/55">
                    {e.cue}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="sys-chip">{e.attr}</span>
                  <span
                    className="grid h-5 w-5 place-items-center border font-mono text-[0.65rem]"
                    style={{
                      borderColor: e.done ? "#3fd2ff" : "rgba(63,210,255,.35)",
                      color: e.done ? "#3fd2ff" : "transparent",
                      background: e.done ? "rgba(63,210,255,.18)" : "transparent",
                    }}
                  >
                    ✓
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="font-mono text-[0.58rem] text-sys-soft/45">
            EACH COMPLETED EXERCISE GRANTS +8 XP AND RAISES ITS LINKED ATTRIBUTE.
          </div>
        </div>
      </SysWindow>

      <SysWindow title="RANK LADDER — FULL PROGRAM" tag="E → S">
        <div className="space-y-2">
          {(Object.keys(RANK_META) as RankLetter[]).map((letter) => (
            <div
              key={letter}
              className="border p-2"
              style={{
                borderColor: t.rank === letter ? `${RANK_META[letter].color}` : `${RANK_META[letter].color}33`,
                background: t.rank === letter ? `${RANK_META[letter].color}12` : "transparent",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="font-display text-base font-black"
                  style={{ color: RANK_META[letter].color }}
                >
                  {letter}
                </span>
                <span className="font-display text-[0.72rem] tracking-[0.14em] text-white">
                  {RANK_META[letter].name}
                </span>
                <span className="ml-auto font-mono text-[0.58rem] text-sys-soft/55">
                  {RANK_META[letter].weeks}
                </span>
              </div>
              <p className="mt-1 font-mono text-[0.62rem] leading-relaxed text-sys-soft/65">
                {RANK_META[letter].focus}
              </p>
            </div>
          ))}
        </div>
      </SysWindow>
    </div>
  );
}
