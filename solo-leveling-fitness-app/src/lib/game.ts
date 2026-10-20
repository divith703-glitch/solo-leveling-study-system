/**
 * ============================================================================
 *  GAME CORE — pure functions only (safe to import from client components)
 * ============================================================================
 */

export const HUNTER_ID = "local-hunter";

/* ------------------------------- ATTRIBUTES ------------------------------- */
export const ATTRS = ["STR", "AGI", "INT", "VIT", "PER"] as const;
export type Attr = (typeof ATTRS)[number];

export const ATTR_META: Record<
  Attr,
  { label: string; tracked: string; glyph: string }
> = {
  STR: { label: "STRENGTH", tracked: "Workouts · push / pull volume", glyph: "⚔" },
  AGI: { label: "AGILITY", tracked: "HIIT · sprints · speed work", glyph: "⚡" },
  INT: { label: "INTELLIGENCE", tracked: "Study hours · JEE / MIT prep", glyph: "◈" },
  VIT: { label: "VITALITY", tracked: "Sleep · water · mobility", glyph: "❋" },
  PER: { label: "PERCEPTION", tracked: "Streak consistency · on-time logs", glyph: "◉" },
};

/** Cumulative points required to reach attribute level L: 5*L*(L-1). */
export function attrPointsToReach(level: number): number {
  return 5 * level * (level - 1);
}
export function attrLevelFromPoints(points: number): number {
  let level = 1;
  while (attrPointsToReach(level + 1) <= points && level < 99) level += 1;
  return level;
}
export function attrProgress(points: number) {
  const level = attrLevelFromPoints(points);
  const floorP = attrPointsToReach(level);
  const ceilP = attrPointsToReach(level + 1);
  const into = points - floorP;
  const span = Math.max(1, ceilP - floorP);
  return {
    level,
    points,
    into,
    needed: span,
    pct: Math.min(100, Math.round((into / span) * 100)),
  };
}

/* ---------------------------------- XP ----------------------------------- */
export const XP_BASE_DAILY = 100;

/** XP required to advance FROM `level` to `level + 1`: 100 * level^1.5 */
export function xpToNext(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function xpCurve(level: number) {
  const need = xpToNext(level);
  return { need, into: 0, pct: 0 };
}

export function applyXp(level: number, xpIntoLevel: number, gained: number) {
  let lv = level;
  let xp = xpIntoLevel + Math.max(0, Math.round(gained));
  let levelsGained = 0;
  while (xp >= xpToNext(lv)) {
    xp -= xpToNext(lv);
    lv += 1;
    levelsGained += 1;
    if (levelsGained > 200) break;
  }
  const need = xpToNext(lv);
  return {
    level: lv,
    xpIntoLevel: xp,
    need,
    pct: Math.min(100, Math.round((xp / need) * 100)),
    levelsGained,
  };
}

/* --------------------------------- RANKS --------------------------------- */
export type RankLetter = "E" | "D" | "C" | "B" | "A" | "S";
export const RANK_ORDER: RankLetter[] = ["E", "D", "C", "B", "A", "S"];

export const RANK_META: Record<
  RankLetter,
  {
    code: string;
    name: string;
    weeks: string;
    focus: string;
    requirement: string;
    color: string;
  }
> = {
  E: {
    code: "E",
    name: "THE AWAKENING",
    weeks: "WEEKS 1–2",
    focus: "Learn proper form, build consistency, establish your baseline. No ego lifting, no reckless max-out attempts.",
    requirement: "Level 1+ · streak 0+",
    color: "#8fa3b8",
  },
  D: {
    code: "D",
    name: "FOUNDATION",
    weeks: "WEEKS 3–4",
    focus: "Improve push-ups, squats, core stability and running endurance.",
    requirement: "Level 12+ · streak 3+",
    color: "#7ee0a3",
  },
  C: {
    code: "C",
    name: "THE GRINDER",
    weeks: "WEEKS 5–8",
    focus: "Build balanced full-body strength, pulling ability, coordination and stamina.",
    requirement: "Level 22+ · streak 7+",
    color: "#4fc3f7",
  },
  B: {
    code: "B",
    name: "THE PREDATOR",
    weeks: "WEEKS 9–12",
    focus: "Add more challenging exercise variations and controlled speed work.",
    requirement: "Level 32+ · streak 14+",
    color: "#b388ff",
  },
  A: {
    code: "A",
    name: "ELITE ATHLETE",
    weeks: "AFTER 12 WEEKS",
    focus: "Progress through harder strength variations, agility drills and structured conditioning.",
    requirement: "Level 45+ · streak 30+",
    color: "#ff8ab5",
  },
  S: {
    code: "S",
    name: "HEAVENLY RESTRICTION",
    weeks: "LONG-TERM MASTERY",
    focus: "Aim for excellent strength, athletic movement, stamina, recovery and consistency. This rank is earned through performance, not a deadline.",
    requirement: "Level 60+ · streak 60+",
    color: "#ffd166",
  },
};

const LEVEL_RANK: [number, RankLetter][] = [
  [60, "S"],
  [45, "A"],
  [32, "B"],
  [22, "C"],
  [12, "D"],
  [1, "E"],
];
const STREAK_RANK: [number, RankLetter][] = [
  [60, "S"],
  [30, "A"],
  [14, "B"],
  [7, "C"],
  [3, "D"],
  [0, "E"],
];

function letterRank(table: [number, RankLetter][], value: number): RankLetter {
  for (const [threshold, letter] of table) if (value >= threshold) return letter;
  return "E";
}
export function letterIndex(letter: RankLetter): number {
  return RANK_ORDER.indexOf(letter);
}
/** Rank is the LOWER of level-rank and streak-rank: consistency gates power. */
export function computeRank(level: number, streak: number): RankLetter {
  const byLevel = letterRank(LEVEL_RANK, level);
  const byStreak = letterRank(STREAK_RANK, streak);
  return letterIndex(byLevel) <= letterIndex(byStreak) ? byLevel : byStreak;
}
export function rankGates(level: number, streak: number) {
  return RANK_ORDER.map((letter) => {
    const lvlReq = LEVEL_RANK.find(([t, l]) => l === letter)?.[0] ?? 0;
    const stkReq = STREAK_RANK.find(([t, l]) => l === letter)?.[0] ?? 0;
    const lvlOk = level >= lvlReq;
    const stkOk = streak >= stkReq;
    return { letter, lvlReq, stkReq, lvlOk, stkOk, unlocked: lvlOk && stkOk };
  });
}

/* --------------------------------- TITLES -------------------------------- */
export type TitleDef = {
  key: string;
  name: string;
  requirement: string;
  bonusPct: number;
  check: (s: TitleStats) => boolean;
};
export type TitleStats = {
  currentStreak: number;
  bestStreak: number;
  totalLogs: number;
  missedTotal: number;
  honorCount: number;
  bonusCompleted: number;
  emergencyCompleted: number;
  recoveries: number;
  level: number;
  rank: RankLetter;
  cleanDays: number;
};

export const TITLES: TitleDef[] = [
  {
    key: "first-step",
    name: "FIRST STEP",
    requirement: "7-day streak",
    bonusPct: 5,
    check: (s) => s.bestStreak >= 7,
  },
  {
    key: "unbreakable",
    name: "UNBREAKABLE",
    requirement: "30-day streak",
    bonusPct: 10,
    check: (s) => s.bestStreak >= 30,
  },
  {
    key: "persisting-one",
    name: "THE PERSISTING ONE",
    requirement: "90 days, zero missed logs",
    bonusPct: 15,
    check: (s) => s.cleanDays >= 90,
  },
  {
    key: "wolf-killer",
    name: "WOLF KILLER",
    requirement: "25 total daily logs",
    bonusPct: 3,
    check: (s) => s.totalLogs >= 25,
  },
  {
    key: "slayer-of-idleness",
    name: "SLAYER OF IDLENESS",
    requirement: "15 bonus quests cleared",
    bonusPct: 5,
    check: (s) => s.bonusCompleted >= 15,
  },
  {
    key: "crisis-responder",
    name: "CRISIS RESPONDER",
    requirement: "3 emergency quests cleared",
    bonusPct: 8,
    check: (s) => s.emergencyCompleted >= 3,
  },
  {
    key: "iron-will",
    name: "IRON WILL",
    requirement: "Recovered from punishment 3 times",
    bonusPct: 8,
    check: (s) => s.recoveries >= 3,
  },
  {
    key: "no-cheat",
    name: "BEYOND SUSPICION",
    requirement: "30 logs, zero honor-mode entries",
    bonusPct: 7,
    check: (s) => s.totalLogs >= 30 && s.honorCount === 0,
  },
  {
    key: "shadow-monarch",
    name: "SHADOW MONARCH",
    requirement: "Reach S-Rank",
    bonusPct: 20,
    check: (s) => s.rank === "S",
  },
];

export function titleBonusPct(keys: string[]): number {
  return TITLES.filter((t) => keys.includes(t.key)).reduce((a, t) => a + t.bonusPct, 0);
}

/* -------------------------- STREAK / DAY MATH ---------------------------- */
export const DAY_STATUS_META: Record<
  string,
  { label: string; color: string; note: string }
> = {
  verified: { label: "VERIFIED", color: "#3fd0ff", note: "AI-verified proof accepted" },
  recovered: { label: "RECOVERED", color: "#7ee0a3", note: "Recovery quest completed" },
  honor: { label: "HONOR MODE", color: "#ffb84d", note: "Manual review — no multiplier" },
  pending: { label: "XP HELD", color: "#8fa3b8", note: "Queued proof awaiting verification" },
  missed: { label: "MISSED", color: "#ff4d5e", note: "Deadline passed, no log" },
  failed: { label: "FAILED", color: "#ff2d3f", note: "Force-disabled — permanent" },
};

export function yesterdayOf(localDate: string): string {
  const d = new Date(`${localDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
export function addDays(localDate: string, delta: number): string {
  const d = new Date(`${localDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
export function weekdayKeyOf(localDate: string): DayKey {
  const d = new Date(`${localDate}T12:00:00Z`);
  return WEEKDAYS[d.getUTCDay()].key;
}
export function formatLocalDate(localDate: string): string {
  const d = new Date(`${localDate}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
export function minutesToClock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

/* ------------------------------ BLOCKER LISTS ---------------------------- */
export const DEFAULT_BLOCKED = [
  "Instagram",
  "Reddit",
  "WhatsApp",
  "YouTube",
  "TikTok",
  "X (Twitter)",
  "Chrome",
  "Snapchat",
  "Netflix",
  "Discord",
];

/** NEVER blocked, under any circumstances, cannot be removed from the list. */
export const NEVER_BLOCKED = [
  "Phone / Dialer",
  "SMS / Messages",
  "Emergency Contacts",
  "Medical & Family Apps",
];

export const DEFAULT_ESSENTIAL = [
  "Phone / Dialer",
  "SMS / Messages",
  "Maps",
  "Banking",
  "Camera",
];

/** Settings is allowed but delayed during punishment (documented tradeoff). */
export const SETTINGS_APP = "Settings";

/* --------------------------- EMERGENCY QUESTS ---------------------------- */
export const EMERGENCY_TEMPLATES: {
  title: string;
  description: string;
  goals: string[];
  xpReward: number;
  statReward: Attr;
  windowMinutes: number;
}[] = [
  {
    title: "SUDDEN QUEST — PUSH PROTOCOL",
    description: "The System has detected idle time. Execute immediately.",
    goals: ["50 push-ups", "40 squats", "60s plank"],
    xpReward: 300,
    statReward: "STR",
    windowMinutes: 20,
  },
  {
    title: "SUDDEN QUEST — SPRINT PROTOCOL",
    description: "Break the inertia before it hardens into a habit.",
    goals: ["10 x 40m sprints", "5 min jump rope", "3 min shadow boxing"],
    xpReward: 280,
    statReward: "AGI",
    windowMinutes: 25,
  },
  {
    title: "SUDDEN QUEST — MIND PROTOCOL",
    description: "Knowledge is also a weapon. Sharpen it now.",
    goals: ["45 min focused study", "20 problem sets", "10 min recall notes"],
    xpReward: 300,
    statReward: "INT",
    windowMinutes: 45,
  },
  {
    title: "SUDDEN QUEST — RECOVERY PROTOCOL",
    description: "Recovery is part of the training, not an excuse to skip it.",
    goals: ["15 min mobility flow", "3L water logged", "Lights out by deadline"],
    xpReward: 240,
    statReward: "VIT",
    windowMinutes: 40,
  },
];

export const BONUS_PRESETS: {
  title: string;
  description: string;
  goals: string[];
  xpReward: number;
  statReward: Attr;
}[] = [
  {
    title: "PUSH-UP LADDER",
    description: "Classic volume builder. Do it before the deadline.",
    goals: ["3 sets of 20 push-ups"],
    xpReward: 40,
    statReward: "STR",
  },
  {
    title: "READ 30 MINUTES",
    description: "Non-fiction, textbook or documentation.",
    goals: ["30 min uninterrupted reading"],
    xpReward: 35,
    statReward: "INT",
  },
  {
    title: "COLD SHOWER",
    description: "Two minutes minimum. No warm water at the end.",
    goals: ["2 min cold exposure"],
    xpReward: 30,
    statReward: "VIT",
  },
  {
    title: "JEE PROBLEM SET",
    description: "20 questions, timed, no calculator for calc steps.",
    goals: ["20 questions", "Error log updated"],
    xpReward: 60,
    statReward: "INT",
  },
  {
    title: "ZONE 2 RUN",
    description: "30 minutes conversational pace.",
    goals: ["30 min run"],
    xpReward: 55,
    statReward: "AGI",
  },
  {
    title: "SLEEP PROTOCOL",
    description: "8 hours logged, screens off 45 min before bed.",
    goals: ["8h sleep logged", "Screens off 45 min prior"],
    xpReward: 45,
    statReward: "VIT",
  },
];

/* ------------------------------ PENALTY TASKS ---------------------------- */
export const PENALTY_TEMPLATES: {
  label: string;
  goals: string[];
}[] = [
  {
    label: "PENALTY — DOUBLED DUES",
    goals: ["100 squats (in sets)", "3 min plank", "20 min mobility flow"],
  },
  {
    label: "PENALTY — DEBT COLLECTION",
    goals: ["50 burpees", "100 sit-ups", "1 km run"],
  },
  {
    label: "PENALTY — INTEREST PAYMENT",
    goals: ["200 jumping jacks", "60 push-ups", "15 min stretching"],
  },
];

export const FORCE_DISABLE_SENTENCE = "I choose to break my streak";

/* ------------------------------- TRAINING -------------------------------- */
export const WEEKDAYS = [
  { key: "mon", label: "MONDAY", short: "MON", focus: "PUSH" },
  { key: "tue", label: "TUESDAY", short: "TUE", focus: "CORE" },
  { key: "wed", label: "WEDNESDAY", short: "WED", focus: "CHEST & BACK" },
  { key: "thu", label: "THURSDAY", short: "THU", focus: "REST — JEE + MIT PREP" },
  { key: "fri", label: "FRIDAY", short: "FRI", focus: "CORE + HIIT" },
  { key: "sat", label: "SATURDAY", short: "SAT", focus: "LEGS + BACK" },
  { key: "sun", label: "SUNDAY", short: "SUN", focus: "MIT + JEE LEVEL TESTS ONLY" },
] as const;
export type DayKey = (typeof WEEKDAYS)[number]["key"];

export function dayKeyIndex(key: string): number {
  return WEEKDAYS.findIndex((d) => d.key === key);
}
