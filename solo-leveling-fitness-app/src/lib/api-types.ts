/**
 * Shared view models returned by the API and consumed by the client shell.
 * No DB imports here so client components can safely import these types.
 */
import type { Attr, RankLetter } from "./game";
import type { GlyphKey } from "./workout";

export type AttrView = {
  key: Attr;
  label: string;
  tracked: string;
  level: number;
  points: number;
  into: number;
  needed: number;
  pct: number;
};

export type QuestGoalView = { label: string; done: boolean };

export type QuestView = {
  id: number;
  key: string | null;
  type: "bonus" | "emergency" | "penalty";
  title: string;
  description: string;
  goals: QuestGoalView[];
  xpReward: number;
  statReward: string | null;
  status: string;
  expiresAt: string | null;
  secondsLeft: number | null;
};

export type LogView = {
  localDate: string;
  status: string;
  method: string | null;
  xpAwarded: number;
  note: string | null;
  completedAt: string | null;
};

export type PunishmentView = {
  id: number;
  state: string;
  triggerDate: string;
  missedCount: number;
  penaltyLabel: string;
  penaltyGoals: QuestGoalView[];
  recoveryLogDone: boolean;
  penaltyDone: boolean;
  activatedAt: string;
  clearedAt: string | null;
  requirements: string[];
  cleared: boolean;
};

export type BlockerEventView = {
  appName: string;
  action: string;
  createdAt: string;
};

export type SystemEventView = {
  kind: string;
  payload: Record<string, unknown>;
};

export type ScheduleBlockView = {
  id: string;
  label: string;
  sub: string;
  startLabel: string;
  endLabel: string;
  attr: Attr;
  glyph: GlyphKey;
  xp: number;
  kind: "normal" | "passive" | "break" | "anime";
  done: boolean;
  active: boolean;
  next: boolean;
  locked: boolean;
};

export type ScheduleView = {
  isHoliday: boolean;
  isSunday: boolean;
  mode: "school" | "hell" | null;
  effectiveMode: "school" | "hell";
  requiresChoice: boolean;
  holidayDates: string[];
  nowMinutes: number;
  currentId: string | null;
  nextId: string | null;
  secondsToNext: number | null;
  secondsLeftInCurrent: number | null;
  blocks: ScheduleBlockView[];
};

export type SystemState = {
  onboarded: boolean;
  hunter: {
    name: string;
    level: number;
    totalXp: number;
    statPoints: number;
    currentStreak: number;
    bestStreak: number;
    totalLogs: number;
    missedTotal: number;
    honorCount: number;
    escapeAttempts: number;
    activeTitle: string | null;
    awakenedAt: string;
  };
  settings: {
    timezone: string;
    dailyTask: string;
    taskPrompt: string;
    primaryCategory: Attr;
    deadlineMinutes: number;
    reminderMinutes: number;
    verificationMode: string;
    timerMinimumMinutes: number;
    blockedApps: string[];
    essentialApps: string[];
    guardEnabled: boolean;
    guardDisableDelaySec: number;
    weekIndex: number;
  };
  xp: { level: number; into: number; need: number; pct: number; totalXp: number };
  today: {
    localDate: string;
    dayLabel: string;
    dayKey: string;
    localMinutes: number;
    deadlineLabel: string;
    deadlinePassed: boolean;
    msUntilDeadline: number;
    logStatus: string | null;
    completedToday: boolean;
    requiredMethod: string;
  };
  attributes: AttrView[];
  rank: {
    letter: RankLetter;
    name: string;
    weeks: string;
    focus: string;
    requirement: string;
    nextLetter: RankLetter | null;
    gates: {
      letter: RankLetter;
      lvlReq: number;
      stkReq: number;
      lvlOk: boolean;
      stkOk: boolean;
      unlocked: boolean;
    }[];
  };
  titles: {
    key: string;
    name: string;
    requirement: string;
    bonusPct: number;
    unlocked: boolean;
  }[];
  quests: {
    daily: {
      title: string;
      description: string;
      xpReward: number;
      statReward: Attr;
      goals: { id: string; label: string; sets: string; cue: string; glyph: GlyphKey; attr: Attr; done: boolean }[];
      doneCount: number;
      totalCount: number;
      baseline: { id: string; label: string; glyph: GlyphKey; attr: Attr; done: boolean }[];
    };
    bonus: QuestView[];
    emergency: QuestView[];
    penalty: QuestView[];
  };
  punishment: PunishmentView | null;
  guard: {
    enabled: boolean;
    blocked: string[];
    essential: string[];
    neverBlocked: string[];
    escapeAttempts: number;
    events: BlockerEventView[];
    disableDelaySec: number;
  };
  training: {
    rank: RankLetter;
    tierName: string;
    weeks: string;
    focus: string;
    day: {
      dayKey: string;
      title: string;
      note: string;
      exercises: {
        id: string;
        name: string;
        sets: string;
        cue: string;
        attr: Attr;
        glyph: GlyphKey;
        done: boolean;
      }[];
    };
    week: { dayKey: string; short: string; focus: string; title: string; count: number; done: number; isToday: boolean }[];
  };
  history: LogView[];
  stats: {
    totalLogs: number;
    missedTotal: number;
    honorCount: number;
    currentStreak: number;
    bestStreak: number;
    cleanDays: number;
    verifiedPct: number;
    bonusCompleted: number;
    emergencyCompleted: number;
    recoveries: number;
    onTimeLogs: number;
  };
  schedule: ScheduleView;
  ai: { hasKey: boolean; provider: string };
  serverTime: string;
  events: SystemEventView[];
};

export type ApiError = { ok: false; error: string; code?: string };
