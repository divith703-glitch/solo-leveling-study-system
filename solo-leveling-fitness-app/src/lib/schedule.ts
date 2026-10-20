/**
 * ============================================================================
 *  MISSION CLOCK — the hunter's fixed daily timetable
 *  03:00 WAKE · 03:00–05:30 SESSION 1 (MATH + PHYS) · 06:00–07:00 WORKOUT
 *  07:00 BUS / SCHOOL → 18:00 · 18:00 THE 2-MINUTE BREAK · 19:00–21:45
 *  SESSION 3 (CHEMISTRY) · 22:00 DINNER + ANIME (EARNED) · 23:00 LIGHTS OUT
 *  HELL PROTOCOL (no school): + SANSKRIT 30 MIN + ENGLISH 0.5 HRS
 * ============================================================================
 */
import type { Attr } from "./game";
import type { GlyphKey } from "./workout";

export const JEENIUS_PACKAGE = "com.stash.jeenius";
export const JEENIUS_PLAY_STORE = `https://play.google.com/store/apps/details?id=${JEENIUS_PACKAGE}`;
export const JEENIUS_INTENT =
  `intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;` +
  `package=${JEENIUS_PACKAGE};S.browser_fallback_url=${encodeURIComponent(
    JEENIUS_PLAY_STORE,
  )};end`;

export type DayMode = "school" | "hell";
export type BlockKind = "normal" | "passive" | "break" | "anime";

export type ScheduleBlock = {
  id: string;
  label: string;
  sub: string;
  start: number; // minutes from midnight
  end: number; // minutes from midnight; may be < start (wraps past midnight)
  attr: Attr;
  glyph: GlyphKey;
  xp: number;
  kind: BlockKind;
  modes: DayMode[];
};

const b = (
  id: string,
  label: string,
  sub: string,
  start: number,
  end: number,
  attr: Attr,
  glyph: GlyphKey,
  xp: number,
  kind: BlockKind = "normal",
  modes: DayMode[] = ["school", "hell"],
): ScheduleBlock => ({ id, label, sub, start, end, attr, glyph, xp, kind, modes });

export const SCHEDULE_BLOCKS: ScheduleBlock[] = [
  b("wake", "WAKE PROTOCOL", "Cold water · bed made · no phone", 180, 195, "VIT", "water", 4),
  b(
    "study-1",
    "STUDY SESSION 1 — HEAVY MATH + PHYSICS",
    "Deep work · zero interruptions · error log afterwards",
    180,
    330,
    "INT",
    "study",
    20,
  ),
  b(
    "morning-prep",
    "MORNING PREP",
    "Breakfast · pack kit · review error log",
    330,
    360,
    "VIT",
    "stretch",
    0,
    "passive",
  ),
  b(
    "workout",
    "WORKOUT — TRAINING PROTOCOL",
    "Today's rank-tier block from the Training tab",
    360,
    420,
    "STR",
    "pushup",
    8,
  ),
  b(
    "school",
    "SCHOOL — BUS @07:00 · HOME @18:00",
    "Attend and absorb · no wasted periods",
    420,
    1080,
    "INT",
    "test",
    0,
    "passive",
    ["school"],
  ),
  b(
    "sanskrit",
    "SANSKRIT STUDY — 30 MIN",
    "HELL PROTOCOL ANNEX · only on no-school days",
    750,
    780,
    "INT",
    "study",
    10,
    "normal",
    ["hell"],
  ),
  b(
    "english",
    "ENGLISH STUDY — 0.5 HRS",
    "HELL PROTOCOL ANNEX · reading + writing drill",
    780,
    810,
    "INT",
    "study",
    8,
    "normal",
    ["hell"],
  ),
  b(
    "break-2min",
    "THE 2-MINUTE BREAK",
    "Exactly 120 seconds — the System reclaims you after",
    1080,
    1082,
    "VIT",
    "stretch",
    0,
    "break",
  ),
  b(
    "session-3",
    "STUDY SESSION 3 — CHEMISTRY",
    "Theory + numericals · error log entries mandatory",
    1140,
    1305,
    "INT",
    "study",
    15,
  ),
  b(
    "dinner",
    "DINNER",
    "10 PM on the dot",
    1320,
    1350,
    "VIT",
    "water",
    0,
    "passive",
  ),
  b(
    "anime",
    "ANIME — EARNED SCREEN TIME",
    "LOCKED until today's Daily Quest is complete",
    1320,
    1380,
    "VIT",
    "tv",
    0,
    "anime",
  ),
  b(
    "lights-out",
    "LIGHTS OUT — SLEEP PROTOCOL",
    "Screens off by 23:00 · 4h base for the 03:00 wakeup",
    1380,
    180,
    "VIT",
    "sleep",
    8,
  ),
];

export function blocksForMode(mode: DayMode): ScheduleBlock[] {
  return SCHEDULE_BLOCKS.filter((bl) => bl.modes.includes(mode)).sort((a, b2) => a.start - b2.start);
}

export function isBlockActive(bl: ScheduleBlock, minutes: number): boolean {
  if (bl.end > bl.start) return minutes >= bl.start && minutes < bl.end;
  // wraps past midnight (lights-out 23:00 -> 03:00)
  return minutes >= bl.start || minutes < bl.end;
}

export function secondsLeftInBlock(bl: ScheduleBlock, localMinutes: number, localSeconds: number): number {
  const nowSec = (localMinutes % 1440) * 60 + localSeconds;
  const endSec = bl.end * 60 < bl.start * 60 ? bl.end * 60 + 86400 : bl.end * 60;
  const startSec = bl.start * 60;
  const rel = nowSec >= startSec ? nowSec - startSec : nowSec + 86400 - startSec;
  const span = endSec - startSec;
  return Math.max(0, span - rel);
}

export function secondsToBlocKStart(bl: ScheduleBlock, localMinutes: number, localSeconds: number): number {
  const nowSec = (localMinutes % 1440) * 60 + localSeconds;
  const startSec = bl.start * 60;
  return ((startSec - nowSec) % 86400 + 86400) % 86400;
}

export const DEFAULT_HOLIDAYS: { date: string; name: string }[] = [
  // Fixed-date Indian public holidays (movable ones can be added in Settings)
  { date: "2025-01-01", name: "New Year's Day" },
  { date: "2025-01-26", name: "Republic Day" },
  { date: "2025-05-01", name: "Labour Day" },
  { date: "2025-08-15", name: "Independence Day" },
  { date: "2025-10-02", name: "Gandhi Jayanti" },
  { date: "2025-12-25", name: "Christmas Day" },
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-05-01", name: "Labour Day" },
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-10-02", name: "Gandhi Jayanti" },
  { date: "2026-12-25", name: "Christmas Day" },
];

export function blockAttr(id: string): Attr | null {
  const def = SCHEDULE_BLOCKS.find((x) => x.id === id);
  return def ? def.attr : null;
}
