/**
 * ============================================================================
 *  SYSTEM ENGINE (server only)
 *  Scheduler -> Punishment Engine -> App Blocker -> Verification -> XP/Stats
 * ============================================================================
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  achievements,
  blockerEvents,
  blockLogs,
  dayLogs,
  dayModes,
  holidays,
  hunters,
  punishments,
  proofs,
  quests,
  settings,
  systemEvents,
  workoutLogs,
  xpLedger,
} from "@/db/schema";
import {
  DEFAULT_HOLIDAYS,
  SCHEDULE_BLOCKS,
  blockAttr,
  blocksForMode,
  isBlockActive,
  secondsLeftInBlock,
  secondsToBlocKStart,
  type DayMode,
} from "./schedule";
import {
  ATTR_META,
  ATTRS,
  BONUS_PRESETS,
  DEFAULT_BLOCKED,
  DEFAULT_ESSENTIAL,
  EMERGENCY_TEMPLATES,
  FORCE_DISABLE_SENTENCE,
  HUNTER_ID,
  NEVER_BLOCKED,
  PENALTY_TEMPLATES,
  RANK_META,
  SETTINGS_APP,
  TITLES,
  WEEKDAYS,
  addDays,
  attrProgress,
  computeRank,
  formatLocalDate,
  minutesToClock,
  titleBonusPct,
  weekdayKeyOf,
  xpToNext,
  yesterdayOf,
  type Attr,
  type RankLetter,
  type TitleStats,
} from "./game";
import { PROGRAM, getTrainingDay, CLASSIC_BASELINE, type Exercise } from "./workout";
import { hasVisionKey, sha256, verifyPhoto } from "./verify";
import type { AttrView, LogView, SystemState } from "./api-types";

export const CLEARED = ["verified", "honor", "recovered"] as const;

/* ----------------------------- time helpers ------------------------------ */
export function localParts(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const localDate = `${get("year")}-${get("month")}-${get("day")}`;
  let hour = Number(get("hour"));
  if (!Number.isFinite(hour) || hour === 24) hour = 0;
  const localMinutes = hour * 60 + Number(get("minute"));
  return { localDate, localMinutes };
}
export function nowInZone(tz: string) {
  return localParts(new Date(), tz);
}
export function safeTimezone(tz: string | undefined): string | null {
  if (!tz || typeof tz !== "string") return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

/* ------------------------------ world setup ------------------------------ */
export async function ensureWorld() {
  const boot = nowInZone("UTC");
  await db
    .insert(hunters)
    .values({
      id: HUNTER_ID,
      name: "HUNTER",
      level: 1,
      xpIntoLevel: 0,
      totalXp: 0,
      statPoints: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalLogs: 0,
      missedTotal: 0,
      honorCount: 0,
      escapeAttempts: 0,
      awakenedLocalDate: boot.localDate,
      lastEvaluatedDate: boot.localDate,
    })
    .onConflictDoNothing();
  await db
    .insert(settings)
    .values({
      hunterId: HUNTER_ID,
      timezone: "UTC",
      dailyTask: "Complete today's prescribed training",
      taskPrompt:
        "Photo must show you actually training: the gym / training spot, the equipment, or you mid-set.",
      primaryCategory: "STR",
      deadlineMinutes: 23 * 60,
      reminderMinutes: 9 * 60,
      verificationMode: "photo",
      timerMinimumMinutes: 20,
      blockedApps: DEFAULT_BLOCKED,
      essentialApps: DEFAULT_ESSENTIAL,
      guardEnabled: true,
      guardDisableDelaySec: 300,
      onboarded: false,
      weekIndex: 1,
    })
    .onConflictDoNothing();
  // Seed default government holidays (fixed dates; users can add movable ones).
  for (const h of DEFAULT_HOLIDAYS) {
    await db
      .insert(holidays)
      .values({ hunterId: HUNTER_ID, localDate: h.date, name: h.name })
      .onConflictDoNothing();
  }
  const [hunter] = await db.select().from(hunters).where(eq(hunters.id, HUNTER_ID)).limit(1);
  const [cfg] = await db.select().from(settings).where(eq(settings.hunterId, HUNTER_ID)).limit(1);
  return { hunter, cfg };
}

async function pushEvent(kind: string, payload: Record<string, unknown>) {
  await db.insert(systemEvents).values({ hunterId: HUNTER_ID, kind, payload, seen: false });
}
async function drainEvents() {
  const rows = await db
    .select()
    .from(systemEvents)
    .where(and(eq(systemEvents.hunterId, HUNTER_ID), eq(systemEvents.seen, false)))
    .orderBy(systemEvents.id)
    .limit(12);
  if (rows.length) {
    await db
      .update(systemEvents)
      .set({ seen: true })
      .where(and(eq(systemEvents.hunterId, HUNTER_ID), eq(systemEvents.seen, false)));
  }
  return rows.map((r) => ({ kind: r.kind, payload: r.payload }));
}

/* --------------------------------- XP ------------------------------------ */
async function awardXp(
  base: number,
  source: string,
  opts: { multiplierPct?: number; label?: string } = {},
): Promise<{ gained: number; levelsGained: number; level: number; statPoints: number }> {
  const [h] = await db.select().from(hunters).where(eq(hunters.id, HUNTER_ID)).limit(1);
  const pct = opts.multiplierPct ?? 0;
  const gained = Math.round(base * (1 + pct / 100));
  let level = h.level;
  let xp = h.xpIntoLevel + gained;
  let levelsGained = 0;
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
    levelsGained += 1;
    if (levelsGained > 100) break;
  }
  const statPoints = h.statPoints + levelsGained * 3;
  await db
    .update(hunters)
    .set({
      level,
      xpIntoLevel: xp,
      totalXp: h.totalXp + gained,
      statPoints,
      updatedAt: new Date(),
    })
    .where(eq(hunters.id, HUNTER_ID));
  await db.insert(xpLedger).values({
    hunterId: HUNTER_ID,
    amount: gained,
    source,
    multiplier: pct ? `${opts.label ?? "bonus"} +${pct}%` : null,
  });
  if (levelsGained > 0) {
    await pushEvent("level_up", { from: h.level, to: level, gained: levelsGained });
  }
  return { gained, levelsGained, level, statPoints };
}

/* --------------------------- PUNISHMENT ENGINE --------------------------- */
async function activePunishment() {
  const [p] = await db
    .select()
    .from(punishments)
    .where(and(eq(punishments.hunterId, HUNTER_ID), eq(punishments.state, "active")))
    .limit(1);
  return p ?? null;
}

function penaltyTemplateFor(date: string) {
  const seed = Number(date.replaceAll("-", "")) % PENALTY_TEMPLATES.length;
  return PENALTY_TEMPLATES[seed];
}

/**
 * A queued (offline) proof that never resolves degrades to honor mode so a dead
 * API can never permanently block a log. Base XP only, no multiplier.
 */
async function resolvePendingToHonor(date: string) {
  const [row] = await db
    .select()
    .from(dayLogs)
    .where(and(eq(dayLogs.hunterId, HUNTER_ID), eq(dayLogs.localDate, date)))
    .limit(1);
  if (!row || row.status !== "pending") return;
  const [h] = await db.select().from(hunters).where(eq(hunters.id, HUNTER_ID)).limit(1);
  const [cfg] = await db.select().from(settings).where(eq(settings.hunterId, HUNTER_ID)).limit(1);
  const [y] = await db
    .select()
    .from(dayLogs)
    .where(and(eq(dayLogs.hunterId, HUNTER_ID), eq(dayLogs.localDate, yesterdayOf(date))))
    .limit(1);
  const yCleared = y ? (CLEARED as readonly string[]).includes(y.status) : false;
  const streak = yCleared ? h.currentStreak + 1 : 1;
  await db
    .update(dayLogs)
    .set({ status: "honor", method: "honor", xpAwarded: 100 })
    .where(eq(dayLogs.id, row.id));
  await awardXp(100, "honor_degrade", {});
  await db
    .update(hunters)
    .set({
      totalLogs: h.totalLogs + 1,
      honorCount: h.honorCount + 1,
      currentStreak: streak,
      bestStreak: Math.max(h.bestStreak, streak),
      updatedAt: new Date(),
    })
    .where(eq(hunters.id, HUNTER_ID));
  await pushEvent("honor_degrade", { date, timezone: cfg?.timezone });
}

async function markMissed(date: string, todayLocalDate: string) {
  const existing = await db
    .select()
    .from(dayLogs)
    .where(and(eq(dayLogs.hunterId, HUNTER_ID), eq(dayLogs.localDate, date)))
    .limit(1);

  if (existing.length) {
    const row = existing[0];
    if ((CLEARED as readonly string[]).includes(row.status)) return;
    if (row.status === "failed") return;
    // A queued proof on a *past* day degrades to honor mode (never blocks the log).
    if (row.status === "pending") {
      if (date < todayLocalDate) await resolvePendingToHonor(date);
      return;
    }
    if (row.status === "missed") return;
  }

  await db
    .insert(dayLogs)
    .values({
      hunterId: HUNTER_ID,
      localDate: date,
      status: "missed",
      method: null,
      categories: [],
      xpAwarded: 0,
      statPointsAwarded: 0,
    })
    .onConflictDoNothing();

  const [h] = await db.select().from(hunters).where(eq(hunters.id, HUNTER_ID)).limit(1);
  await db
    .update(hunters)
    .set({
      missedTotal: h.missedTotal + 1,
      currentStreak: 0,
      updatedAt: new Date(),
    })
    .where(eq(hunters.id, HUNTER_ID));

  const existingPunishment = await activePunishment();
  const template = penaltyTemplateFor(date);
  if (existingPunishment) {
    await db
      .update(punishments)
      .set({ missedCount: existingPunishment.missedCount + 1 })
      .where(eq(punishments.id, existingPunishment.id));
    await pushEvent("punishment", {
      date,
      missedCount: existingPunishment.missedCount + 1,
      escalated: true,
    });
  } else {
    const [created] = await db
      .insert(punishments)
      .values({
        hunterId: HUNTER_ID,
        state: "active",
        triggerDate: date,
        missedCount: 1,
        penaltyLabel: template.label,
        penaltyGoals: template.goals.map((g) => ({ label: g, done: false })),
        recoveryLogDone: false,
        penaltyDone: false,
      })
      .returning();
    await db.insert(quests).values({
      hunterId: HUNTER_ID,
      type: "penalty",
      key: `penalty-${created.id}`,
      title: template.label,
      description:
        "Recovery requirement. Complete every goal to regain normal access to blocked apps.",
      goals: template.goals.map((g) => ({ label: g, done: false })),
      xpReward: 0,
      statReward: "PER",
      targetDate: date,
      status: "active",
    });
    await pushEvent("punishment", { date, missedCount: 1, escalated: false });
  }
}

async function maybeClearPunishment() {
  const p = await activePunishment();
  if (!p) return;
  if (p.recoveryLogDone && p.penaltyDone) {
    await db
      .update(punishments)
      .set({ state: "cleared", clearedAt: new Date() })
      .where(eq(punishments.id, p.id));
    await db
      .update(quests)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(eq(quests.id, p.id), eq(quests.type, "penalty")));
    await pushEvent("punishment_cleared", { id: p.id });
  }
}

/* ------------------------------- SCHEDULER ------------------------------- */
async function expireEmergencies() {
  await db
    .update(quests)
    .set({ status: "expired" })
    .where(
      and(
        eq(quests.hunterId, HUNTER_ID),
        eq(quests.type, "emergency"),
        eq(quests.status, "active"),
        sql`${quests.expiresAt} is not null and ${quests.expiresAt} < now()`,
      ),
    );
}

/** The Subway: a permanent daily gateway quest to the JEENIUS app (MIT PREP route). */
async function ensureSubwayQuest(localDate: string, onboarded: boolean) {
  if (!onboarded) return;
  const existing = await db
    .select({ id: quests.id })
    .from(quests)
    .where(and(eq(quests.hunterId, HUNTER_ID), eq(quests.key, `subway-jeenius-${localDate}`)))
    .limit(1);
  if (existing.length) return;
  await db.insert(quests).values({
    hunterId: HUNTER_ID,
    type: "bonus",
    key: `subway-jeenius-${localDate}`,
    title: "SUBWAY — MIT PREP ROUTE (JEENIUS)",
    description:
      "Board the subway to your MIT-prep queue on the JEENIUS app: one PYQ / drill set for today's topics. Launches the JEENIUS Android app directly.",
    goals: [{ label: "Complete one JEENIUS drill or PYQ set today", done: false }],
    xpReward: 42,
    statReward: "INT",
    targetDate: localDate,
    status: "active",
  });
}

async function maybeSpawnEmergency(localDate: string) {
  const existing = await db
    .select({ id: quests.id })
    .from(quests)
    .where(
      and(eq(quests.hunterId, HUNTER_ID), eq(quests.type, "emergency"), eq(quests.targetDate, localDate)),
    )
    .limit(1);
  if (existing.length) return;
  const activeCount = await db
    .select({ id: quests.id })
    .from(quests)
    .where(
      and(
        eq(quests.hunterId, HUNTER_ID),
        eq(quests.type, "emergency"),
        eq(quests.status, "active"),
      ),
    )
    .limit(1);
  if (activeCount.length) return;
  if (Math.random() > 0.22) return;
  const t = EMERGENCY_TEMPLATES[Math.floor(Math.random() * EMERGENCY_TEMPLATES.length)];
  await db.insert(quests).values({
    hunterId: HUNTER_ID,
    type: "emergency",
    key: `emergency-${localDate}`,
    title: t.title,
    description: t.description,
    goals: t.goals.map((g) => ({ label: g, done: false })),
    xpReward: t.xpReward,
    statReward: t.statReward,
    targetDate: localDate,
    expiresAt: new Date(Date.now() + t.windowMinutes * 60_000),
    status: "active",
  });
  await pushEvent("emergency_quest", { title: t.title, windowMinutes: t.windowMinutes });
}

async function degradeStalePending() {
  const stale = await db
    .select()
    .from(dayLogs)
    .where(
      and(
        eq(dayLogs.hunterId, HUNTER_ID),
        eq(dayLogs.status, "pending"),
        sql`${dayLogs.completedAt} < now() - interval '12 hours'`,
      ),
    );
  for (const row of stale) {
    await resolvePendingToHonor(row.localDate);
  }
}

/**
 * The tick: the scheduler that fires on every load / action (and in the Android
 * port, from WorkManager + BOOT_COMPLETED + the deadline AlarmManager exact
 * alarm). It walks forward from the last evaluated local date and applies the
 * deadline rule for every day that has passed.
 */
export async function tick() {
  const { hunter, cfg } = await ensureWorld();
  const now = nowInZone(cfg.timezone);
  const start = hunter.awakenedLocalDate ?? now.localDate;
  let cursor = hunter.lastEvaluatedDate ?? start;
  if (cursor < start) cursor = start;

  let guard = 0;
  while (guard < 400) {
    guard += 1;
    if (cursor > now.localDate) break;
    // The awakening day itself is never judged: enforcement starts the next day.
    if (cursor === start) {
      cursor = addDays(cursor, 1);
      continue;
    }
    const isToday = cursor === now.localDate;
    if (isToday && now.localMinutes <= cfg.deadlineMinutes) break;
    await markMissed(cursor, now.localDate);
    cursor = addDays(cursor, 1);
  }

  await db
    .update(hunters)
    .set({ lastEvaluatedDate: now.localDate, updatedAt: new Date() })
    .where(eq(hunters.id, HUNTER_ID));

  await expireEmergencies();
  await maybeSpawnEmergency(now.localDate);
  await ensureSubwayQuest(now.localDate, cfg.onboarded);
  await degradeStalePending();
  await maybeClearPunishment();
}

/* --------------------------- ACHIEVEMENTS / RANK -------------------------- */
async function computeStats() {
  const [h] = await db.select().from(hunters).where(eq(hunters.id, HUNTER_ID)).limit(1);
  const [cfg] = await db.select().from(settings).where(eq(settings.hunterId, HUNTER_ID)).limit(1);
  const logs = await db.select().from(dayLogs).where(eq(dayLogs.hunterId, HUNTER_ID));
  const questRows = await db.select().from(quests).where(eq(quests.hunterId, HUNTER_ID));
  const punishRows = await db.select().from(punishments).where(eq(punishments.hunterId, HUNTER_ID));
  const now = nowInZone(cfg.timezone);

  const byDate = new Map(logs.map((l) => [l.localDate, l]));
  let cleanDays = 0;
  for (let i = 0; i < 400; i += 1) {
    const d = i === 0 ? now.localDate : addDays(now.localDate, -i);
    const row = byDate.get(d);
    if (i === 0 && !row) break; // today still open
    if (!row) break;
    if ((CLEARED as readonly string[]).includes(row.status)) cleanDays += 1;
    else break;
  }

  const onTimeLogs = logs.filter((l) => {
    if (!l.completedAt) return false;
    const p = localParts(l.completedAt, cfg.timezone);
    return p.localDate === l.localDate && p.localMinutes <= cfg.deadlineMinutes;
  }).length;

  const rank = computeRank(h.level, h.currentStreak);
  const stats: TitleStats & { rank: RankLetter; cleanDays: number } = {
    currentStreak: h.currentStreak,
    bestStreak: h.bestStreak,
    totalLogs: h.totalLogs,
    missedTotal: h.missedTotal,
    honorCount: h.honorCount,
    bonusCompleted: questRows.filter((q) => q.type === "bonus" && q.status === "completed").length,
    emergencyCompleted: questRows.filter(
      (q) => q.type === "emergency" && q.status === "completed",
    ).length,
    recoveries: punishRows.filter((p) => p.state === "cleared").length,
    level: h.level,
    rank,
    cleanDays,
  };
  return { hunter: h, cfg, logs, byDate, now, stats, rank, questRows, punishRows, onTimeLogs };
}

async function syncAchievements() {
  const { stats } = await computeStats();
  const unlocked = await db.select().from(achievements).where(eq(achievements.hunterId, HUNTER_ID));
  const have = new Set(unlocked.map((a) => a.titleKey));
  for (const t of TITLES) {
    if (!have.has(t.key) && t.check(stats)) {
      await db
        .insert(achievements)
        .values({ hunterId: HUNTER_ID, titleKey: t.key })
        .onConflictDoNothing();
      await pushEvent("title", { key: t.key, name: t.name, bonusPct: t.bonusPct });
    }
  }
}

/* ----------------------------- ATTRIBUTES -------------------------------- */
function exerciseById(id: string): Exercise | null {
  for (const tier of Object.values(PROGRAM)) {
    for (const day of tier) {
      const found = day.exercises.find((e) => e.id === id);
      if (found) return found;
    }
  }
  return null;
}

function tierFromWeek(weekIndex: number): RankLetter {
  if (weekIndex <= 2) return "E";
  if (weekIndex <= 4) return "D";
  if (weekIndex <= 8) return "C";
  if (weekIndex <= 12) return "B";
  if (weekIndex <= 24) return "A";
  return "S";
}

/* ------------------------------ SNAPSHOT --------------------------------- */
export async function getSnapshot(): Promise<SystemState> {
  await tick();
  await syncAchievements();
  const { hunter, cfg, logs, now, stats, rank, questRows, punishRows, onTimeLogs } =
    await computeStats();
  const events = await drainEvents();

  const ach = await db.select().from(achievements).where(eq(achievements.hunterId, HUNTER_ID));
  const achKeys = ach.map((a) => a.titleKey);
  const workout = await db
    .select()
    .from(workoutLogs)
    .where(and(eq(workoutLogs.hunterId, HUNTER_ID), eq(workoutLogs.localDate, now.localDate)));
  const doneExercises = new Set(workout.map((w) => w.exerciseId));
  const punishActive = punishRows.find((p) => p.state === "active") ?? null;

  const need = xpToNext(hunter.level);
  const allBlockRows = await db
    .select()
    .from(blockLogs)
    .where(eq(blockLogs.hunterId, HUNTER_ID));
  const attributes: AttrView[] = ATTRS.map((key) => {
    let points = 0;
    for (const log of logs) {
      if (!(CLEARED as readonly string[]).includes(log.status)) continue;
      if (log.categories.includes(key)) points += 1;
    }
    for (const w of workout) {
      const e = exerciseById(w.exerciseId);
      if (e && e.attr === key) points += 1;
    }
    for (const r of allBlockRows) {
      const a = blockAttr(r.blockId);
      if (a === key) points += 1;
    }
    for (const q of questRows) {
      if (q.status !== "completed") continue;
      if (q.statReward === key) points += 1;
    }
    if (key === "PER") points += onTimeLogs;
    const p = attrProgress(points);
    return {
      key,
      label: ATTR_META[key].label,
      tracked: ATTR_META[key].tracked,
      level: p.level,
      points,
      into: p.into,
      needed: p.needed,
      pct: p.pct,
    };
  });

  const unlockedTitles = TITLES.filter((t) => achKeys.includes(t.key));
  const bonusPct = titleBonusPct(achKeys);

  const programRank = tierFromWeek(cfg.weekIndex);
  const dayKey = weekdayKeyOf(now.localDate);
  const plan = getTrainingDay(programRank, dayKey);
  const todayLog = logs.find((l) => l.localDate === now.localDate) ?? null;

  const history: LogView[] = [...logs]
    .sort((a, b) => (a.localDate < b.localDate ? 1 : -1))
    .slice(0, 90)
    .map((l) => ({
      localDate: l.localDate,
      status: l.status,
      method: l.method,
      xpAwarded: l.xpAwarded,
      note: l.note,
      completedAt: l.completedAt ? l.completedAt.toISOString() : null,
    }));

  const guardEvents = await db
    .select()
    .from(blockerEvents)
    .where(eq(blockerEvents.hunterId, HUNTER_ID))
    .orderBy(desc(blockerEvents.id))
    .limit(14);

  const toQuestView = (q: (typeof questRows)[number]) => ({
    id: q.id,
    key: q.key,
    type: q.type as "bonus" | "emergency" | "penalty",
    title: q.title,
    description: q.description,
    goals: q.goals,
    xpReward: q.xpReward,
    statReward: q.statReward,
    status: q.status,
    expiresAt: q.expiresAt ? q.expiresAt.toISOString() : null,
    secondsLeft:
      q.expiresAt && q.status === "active"
        ? Math.max(0, Math.round((q.expiresAt.getTime() - Date.now()) / 1000))
        : null,
  });

  /* ------------------------- MISSION CLOCK ------------------------- */
  const [modeRow] = await db
    .select()
    .from(dayModes)
    .where(and(eq(dayModes.hunterId, HUNTER_ID), eq(dayModes.localDate, now.localDate)))
    .limit(1);
  const todayBlockRows: typeof blockLogs.$inferSelect[] = await db
    .select()
    .from(blockLogs)
    .where(and(eq(blockLogs.hunterId, HUNTER_ID), eq(blockLogs.localDate, now.localDate)));
  const doneBlocks = new Set(todayBlockRows.map((r) => r.blockId));
  const holidayRows = await db
    .select()
    .from(holidays)
    .where(eq(holidays.hunterId, HUNTER_ID));
  const holidayDates = holidayRows.map((r) => r.localDate).sort();
  const isSunday = weekdayKeyOf(now.localDate) === "sun";
  const isHoliday = isSunday || holidayDates.includes(now.localDate);
  const mode = (modeRow?.mode as DayMode | undefined) ?? null;
  const effectiveMode: DayMode = mode ?? (isHoliday ? "hell" : "school");
  const requiresChoice = isHoliday && !mode;

  const localSeconds = new Date().getSeconds();
  const dayBlocks = blocksForMode(effectiveMode);
  const activeBlock = dayBlocks.find((bl) => isBlockActive(bl, now.localMinutes));
  const nowSecToday = now.localMinutes * 60 + localSeconds;
  const upcoming = dayBlocks.filter((bl) => bl.start * 60 > nowSecToday);
  const nextBlock = upcoming.length ? upcoming[0] : dayBlocks[0];
  const todayCleared = logs.some(
    (l) => l.localDate === now.localDate && (CLEARED as readonly string[]).includes(l.status),
  );
  const schedule = {
    isHoliday,
    isSunday,
    mode,
    effectiveMode,
    requiresChoice,
    holidayDates,
    nowMinutes: now.localMinutes,
    currentId: activeBlock?.id ?? null,
    nextId: nextBlock?.id ?? null,
    secondsToNext: nextBlock ? secondsToBlocKStart(nextBlock, now.localMinutes, localSeconds) : null,
    secondsLeftInCurrent: activeBlock
      ? secondsLeftInBlock(activeBlock, now.localMinutes, localSeconds)
      : null,
    blocks: dayBlocks.map((bl) => ({
      id: bl.id,
      label: bl.label,
      sub: bl.sub,
      startLabel: minutesToClock(bl.start),
      endLabel: minutesToClock(bl.end) + (bl.end < bl.start ? " +1d" : ""),
      attr: bl.attr,
      glyph: bl.glyph,
      xp: bl.xp,
      kind: bl.kind,
      done: doneBlocks.has(bl.id),
      active: activeBlock?.id === bl.id,
      next: nextBlock?.id === bl.id,
      locked: bl.kind === "anime" ? !todayCleared : false,
    })),
  };

  const rankLetterIdx = ["E", "D", "C", "B", "A", "S"].indexOf(rank);
  const nextLetter = rankLetterIdx < 5 ? (["E", "D", "C", "B", "A", "S"][rankLetterIdx + 1] as RankLetter) : null;
  const rankGates = (["E", "D", "C", "B", "A", "S"] as RankLetter[]).map((letter) => {
    const gates: Record<string, [number, number]> = {
      E: [1, 0],
      D: [12, 3],
      C: [22, 7],
      B: [32, 14],
      A: [45, 30],
      S: [60, 60],
    };
    const [lvlReq, stkReq] = gates[letter];
    const lvlOk = hunter.level >= lvlReq;
    const stkOk = hunter.currentStreak >= stkReq;
    return { letter, lvlReq, stkReq, lvlOk, stkOk, unlocked: lvlOk && stkOk };
  });

  return {
    onboarded: cfg.onboarded,
    hunter: {
      name: hunter.name,
      level: hunter.level,
      totalXp: hunter.totalXp,
      statPoints: hunter.statPoints,
      currentStreak: hunter.currentStreak,
      bestStreak: hunter.bestStreak,
      totalLogs: hunter.totalLogs,
      missedTotal: hunter.missedTotal,
      honorCount: hunter.honorCount,
      escapeAttempts: hunter.escapeAttempts,
      activeTitle: hunter.activeTitle,
      awakenedAt: hunter.awakenedAt.toISOString(),
    },
    settings: {
      timezone: cfg.timezone,
      dailyTask: cfg.dailyTask,
      taskPrompt: cfg.taskPrompt,
      primaryCategory: cfg.primaryCategory as Attr,
      deadlineMinutes: cfg.deadlineMinutes,
      reminderMinutes: cfg.reminderMinutes,
      verificationMode: cfg.verificationMode,
      timerMinimumMinutes: cfg.timerMinimumMinutes,
      blockedApps: cfg.blockedApps,
      essentialApps: cfg.essentialApps,
      guardEnabled: cfg.guardEnabled,
      guardDisableDelaySec: cfg.guardDisableDelaySec,
      weekIndex: cfg.weekIndex,
    },
    xp: {
      level: hunter.level,
      into: hunter.xpIntoLevel,
      need,
      pct: Math.min(100, Math.round((hunter.xpIntoLevel / need) * 100)),
      totalXp: hunter.totalXp,
    },
    today: {
      localDate: now.localDate,
      dayLabel: formatLocalDate(now.localDate),
      dayKey,
      localMinutes: now.localMinutes,
      deadlineLabel: minutesToClock(cfg.deadlineMinutes),
      deadlinePassed: now.localMinutes > cfg.deadlineMinutes,
      msUntilDeadline: Math.max(0, (cfg.deadlineMinutes - now.localMinutes) * 60_000),
      logStatus: todayLog?.status ?? null,
      completedToday: todayLog ? (CLEARED as readonly string[]).includes(todayLog.status) : false,
      requiredMethod:
        cfg.verificationMode === "photo"
          ? "photo"
          : cfg.verificationMode === "timer"
            ? "timer"
            : "photo-or-timer",
    },
    attributes,
    rank: {
      letter: rank,
      name: RANK_META[rank].name,
      weeks: RANK_META[rank].weeks,
      focus: RANK_META[rank].focus,
      requirement: RANK_META[rank].requirement,
      nextLetter,
      gates: rankGates,
    },
    titles: TITLES.map((t) => ({
      key: t.key,
      name: t.name,
      requirement: t.requirement,
      bonusPct: t.bonusPct,
      unlocked: achKeys.includes(t.key),
    })),
    quests: {
      daily: {
        title: `[DAILY QUEST] ${cfg.dailyTask.toUpperCase()}`,
        description: plan.title,
        xpReward: 100,
        statReward: cfg.primaryCategory as Attr,
        goals: plan.exercises.map((e) => ({
          id: e.id,
          label: e.name,
          sets: e.sets,
          cue: e.cue,
          glyph: e.glyph,
          attr: e.attr,
          done: doneExercises.has(e.id),
        })),
        doneCount: plan.exercises.filter((e) => doneExercises.has(e.id)).length,
        totalCount: plan.exercises.length,
        baseline: CLASSIC_BASELINE.map((b) => ({
          ...b,
          done: doneExercises.has(b.id),
        })),
      },
      bonus: questRows.filter((q) => q.type === "bonus" && q.status === "active").map(toQuestView),
      emergency: questRows
        .filter((q) => q.type === "emergency" && q.status === "active")
        .map(toQuestView),
      penalty: questRows
        .filter((q) => q.type === "penalty" && q.status === "active")
        .map(toQuestView),
    },
    punishment: punishActive
      ? {
          id: punishActive.id,
          state: punishActive.state,
          triggerDate: punishActive.triggerDate,
          missedCount: punishActive.missedCount,
          penaltyLabel: punishActive.penaltyLabel,
          penaltyGoals: punishActive.penaltyGoals,
          recoveryLogDone: punishActive.recoveryLogDone,
          penaltyDone: punishActive.penaltyDone,
          activatedAt: punishActive.activatedAt.toISOString(),
          clearedAt: punishActive.clearedAt ? punishActive.clearedAt.toISOString() : null,
          requirements: [
            "Complete the missed daily log with valid proof",
            `Complete every goal of ${punishActive.penaltyLabel}`,
            "Re-establish a 1-day streak",
          ],
          cleared: false,
        }
      : null,
    guard: {
      enabled: cfg.guardEnabled,
      blocked: cfg.blockedApps,
      essential: [...NEVER_BLOCKED, ...cfg.essentialApps],
      neverBlocked: NEVER_BLOCKED,
      escapeAttempts: hunter.escapeAttempts,
      events: guardEvents.map((e) => ({
        appName: e.appName,
        action: e.action,
        createdAt: e.createdAt.toISOString(),
      })),
      disableDelaySec: cfg.guardDisableDelaySec,
    },
    training: {
      rank: programRank,
      tierName: RANK_META[programRank].name,
      weeks: RANK_META[programRank].weeks,
      focus: RANK_META[programRank].focus,
      day: {
        dayKey: plan.dayKey,
        title: plan.title,
        note: plan.note,
        exercises: plan.exercises.map((e) => ({
          ...e,
          done: doneExercises.has(e.id),
        })),
      },
      week: WEEKDAYS.map((d) => {
        const dayPlan = getTrainingDay(programRank, d.key);
        return {
          dayKey: d.key,
          short: d.short,
          focus: d.focus,
          title: dayPlan.title,
          count: dayPlan.exercises.length,
          done: dayPlan.exercises.filter((e) => doneExercises.has(e.id)).length,
          isToday: d.key === dayKey,
        };
      }),
    },
    history,
    stats: {
      totalLogs: stats.totalLogs,
      missedTotal: stats.missedTotal,
      honorCount: stats.honorCount,
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      cleanDays: stats.cleanDays,
      verifiedPct:
        stats.totalLogs + stats.missedTotal > 0
          ? Math.round(
              (stats.totalLogs / (stats.totalLogs + stats.missedTotal)) * 100,
            )
          : 0,
      bonusCompleted: stats.bonusCompleted,
      emergencyCompleted: stats.emergencyCompleted,
      recoveries: stats.recoveries,
      onTimeLogs,
    },
    schedule,
    ai: { hasKey: hasVisionKey(), provider: "gemini" },
    serverTime: new Date().toISOString(),
    events,
  };
}

/* --------------------------- DAILY LOG SUBMISSION ------------------------- */
export type DailyLogResult =
  | {
      ok: true;
      status: string;
      xpGained: number;
      levelsGained: number;
      level: number;
      message: string;
      streak: number;
      honorMode: boolean;
      pending: boolean;
      aiReason?: string;
      provider?: string;
    }
  | {
      ok: false;
      error: string;
      code:
        | "ALREADY_LOGGED"
        | "PHOTO_REUSE"
        | "NOT_VERIFIED"
        | "HONOR_MODE_AVAILABLE"
        | "TIMER_TOO_SHORT"
        | "INVALID_PHOTO"
        | "HONOR_LOCKED"
        | "METHOD_REQUIRED";
      aiReason?: string;
      rejections?: number;
    };

export async function submitDailyLog(input: {
  method?: string;
  photoDataUrl?: string;
  durationSec?: number;
  gps?: string;
  note?: string;
}): Promise<DailyLogResult> {
  await tick();
  const { cfg } = await ensureWorld();
  const now = nowInZone(cfg.timezone);
  const today = now.localDate;
  const punish = await activePunishment();

  const existing = await db
    .select()
    .from(dayLogs)
    .where(and(eq(dayLogs.hunterId, HUNTER_ID), eq(dayLogs.localDate, today)))
    .limit(1);
  const row = existing[0];
  if (row && (CLEARED as readonly string[]).includes(row.status)) {
    return {
      ok: false,
      error: "Today's log is already complete. The System does not accept duplicates.",
      code: "ALREADY_LOGGED",
    };
  }

  let method = input.method ?? "";
  if (cfg.verificationMode === "photo") method = method || "photo";
  else if (cfg.verificationMode === "timer") method = method || "timer";
  else if (!method) {
    return {
      ok: false,
      error: "Select a verification method: photo proof or timer.",
      code: "METHOD_REQUIRED",
    };
  }
  if (method !== "photo" && method !== "timer" && method !== "honor") {
    return {
      ok: false,
      error: "Checkbox-only logging is not permitted. Use photo proof or a timer.",
      code: "METHOD_REQUIRED",
    };
  }

  const rejections = await db
    .select()
    .from(proofs)
    .where(
      and(
        eq(proofs.hunterId, HUNTER_ID),
        eq(proofs.localDate, today),
        eq(proofs.verdict, "NOT_VERIFIED"),
      ),
    );
  const rejectionCount = rejections.length;

  let finalStatus: string = "verified";
  let aiReason = "";
  let provider = "";
  let xpBase = 100;
  let multiplierPct = 2 * Math.min(25, 0); // placeholder replaced below
  multiplierPct = 0;

  const [h0] = await db.select().from(hunters).where(eq(hunters.id, HUNTER_ID)).limit(1);

  if (method === "photo") {
    const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
      input.photoDataUrl ?? "",
    );
    if (!match) {
      return {
        ok: false,
        error: "Invalid image payload. Capture a photo with the camera.",
        code: "INVALID_PHOTO",
      };
    }
    const [, mimeType, raw] = match;
    if (raw.length > 7_000_000) {
      return {
        ok: false,
        error: "Image too large after compression. Retake the photo.",
        code: "INVALID_PHOTO",
      };
    }
    const hash = sha256(raw);
    const dupe = await db
      .select({ id: proofs.id })
      .from(proofs)
      .where(and(eq(proofs.hunterId, HUNTER_ID), eq(proofs.photoHash, hash)))
      .limit(1);
    if (dupe.length) {
      return {
        ok: false,
        error:
          "PHOTO REUSE DETECTED. This image has already been submitted. The System requires new proof.",
        code: "PHOTO_REUSE",
      };
    }
    const result = await verifyPhoto({
      base64: raw,
      mimeType,
      taskName: cfg.dailyTask,
      taskPrompt: cfg.taskPrompt,
    });
    provider = result.provider;
    aiReason = result.reason;

    if (result.verdict === "NOT_VERIFIED") {
      await db.insert(proofs).values({
        hunterId: HUNTER_ID,
        localDate: today,
        photoHash: hash,
        provider: result.provider,
        model: result.model,
        verdict: "NOT_VERIFIED",
        reason: result.reason,
        gps: input.gps ?? null,
        purgeAfter: new Date(Date.now() + 7 * 86_400_000),
      });
      const total = rejectionCount + 1;
      if (total >= 3) {
        return {
          ok: false,
          error:
            "Three consecutive rejections. The attempt is flagged for manual review — you may log in HONOR MODE (no multiplier, permanently visible in your history).",
          code: "HONOR_MODE_AVAILABLE",
          aiReason,
          rejections: total,
        };
      }
      return {
        ok: false,
        error: `NOT VERIFIED — ${result.reason}`,
        code: "NOT_VERIFIED",
        aiReason,
        rejections: total,
      };
    }

    await db.insert(proofs).values({
      hunterId: HUNTER_ID,
      localDate: today,
      photoHash: hash,
      provider: result.provider,
      model: result.model,
      verdict: result.verdict === "VERIFIED" ? "VERIFIED" : "QUEUED",
      reason: result.reason,
      gps: input.gps ?? null,
      purgeAfter: new Date(Date.now() + 7 * 86_400_000),
    });

    if (result.verdict === "UNAVAILABLE") {
      finalStatus = "pending";
    }
  } else if (method === "timer") {
    const required = cfg.timerMinimumMinutes * 60;
    if ((input.durationSec ?? 0) < required) {
      return {
        ok: false,
        error: `Timer too short. Minimum uninterrupted duration: ${cfg.timerMinimumMinutes} minutes.`,
        code: "TIMER_TOO_SHORT",
      };
    }
    aiReason = `Timer proof: ${Math.round((input.durationSec ?? 0) / 60)} min (min ${cfg.timerMinimumMinutes}).`;
    provider = "timer";
  } else {
    if (rejectionCount < 3) {
      return {
        ok: false,
        error:
          "Honor mode is locked. It only unlocks after three consecutive failed AI verifications.",
        code: "HONOR_LOCKED",
      };
    }
    finalStatus = "honor";
    xpBase = 100;
  }

  const wasMissed = row?.status === "missed" || now.localMinutes > cfg.deadlineMinutes;
  if (finalStatus !== "pending" && wasMissed) finalStatus = "recovered";
  if (method === "honor") finalStatus = punish ? "recovered" : "honor";

  // streak
  const yesterday = await db
    .select()
    .from(dayLogs)
    .where(and(eq(dayLogs.hunterId, HUNTER_ID), eq(dayLogs.localDate, yesterdayOf(today))))
    .limit(1);
  const yCleared = yesterday.length && (CLEARED as readonly string[]).includes(yesterday[0].status);
  const streak = finalStatus === "pending" ? (yCleared ? h0.currentStreak + 1 : 1) : yCleared ? h0.currentStreak + 1 : 1;

  const bonusFromTitles = titleBonusPct(
    (await db.select().from(achievements).where(eq(achievements.hunterId, HUNTER_ID))).map(
      (a) => a.titleKey,
    ),
  );
  if (finalStatus === "honor") {
    multiplierPct = 0; // honor mode: no bonus multiplier
  } else if (finalStatus === "pending") {
    multiplierPct = 0;
  } else {
    multiplierPct = bonusFromTitles + Math.min(50, streak * 2);
  }

  const values = {
    hunterId: HUNTER_ID,
    localDate: today,
    status: finalStatus,
    method,
    categories: [cfg.primaryCategory],
    xpAwarded: 0,
    statPointsAwarded: 2,
    note: input.note ?? null,
    completedAt: new Date(),
  };
  await db
    .insert(dayLogs)
    .values(values)
    .onConflictDoUpdate({
      target: [dayLogs.hunterId, dayLogs.localDate],
      set: {
        status: finalStatus,
        method,
        categories: [cfg.primaryCategory],
        note: input.note ?? null,
        completedAt: new Date(),
        statPointsAwarded: 2,
      },
    });

  let xpGained = 0;
  let levelsGained = 0;
  let level = h0.level;
  if (finalStatus === "pending") {
    await db
      .update(hunters)
      .set({
        currentStreak: streak,
        bestStreak: Math.max(h0.bestStreak, streak),
        updatedAt: new Date(),
      })
      .where(eq(hunters.id, HUNTER_ID));
    await pushEvent("proof_queued", { date: today, reason: aiReason });
  } else {
    const res = await awardXp(xpBase, `daily_log_${finalStatus}`, {
      multiplierPct,
      label: `streak+titles`,
    });
    xpGained = res.gained;
    levelsGained = res.levelsGained;
    level = res.level;
    await db
      .update(dayLogs)
      .set({ xpAwarded: xpGained })
      .where(and(eq(dayLogs.hunterId, HUNTER_ID), eq(dayLogs.localDate, today)));
    await db
      .update(hunters)
      .set({
        totalLogs: h0.totalLogs + 1,
        currentStreak: streak,
        bestStreak: Math.max(h0.bestStreak, streak),
        statPoints: res.statPoints,
        honorCount: finalStatus === "honor" ? h0.honorCount + 1 : h0.honorCount,
        updatedAt: new Date(),
      })
      .where(eq(hunters.id, HUNTER_ID));
  }

  if (punish) {
    await db
      .update(punishments)
      .set({ recoveryLogDone: true })
      .where(eq(punishments.id, punish.id));
    await maybeClearPunishment();
  }
  await syncAchievements();

  return {
    ok: true,
    status: finalStatus,
    xpGained,
    levelsGained,
    level,
    streak,
    honorMode: finalStatus === "honor",
    pending: finalStatus === "pending",
    message:
      finalStatus === "pending"
        ? "PROOF QUEUED. Streak is safe — XP is held until verification completes (auto-resolves to honor mode if the API stays down)."
        : finalStatus === "recovered"
          ? "RECOVERY LOG ACCEPTED. Complete the penalty goals to lift the consequence."
          : finalStatus === "honor"
            ? "HONOR MODE ENTRY RECORDED. No multiplier. This is visible in your history forever."
            : "VERIFIED. The requirement has been met.",
    aiReason,
    provider,
  };
}

/* --------------------------------- QUESTS -------------------------------- */
export async function addBonusQuest(title: string, description: string, xpReward: number, statReward: Attr) {
  const now = nowInZone((await ensureWorld()).cfg.timezone);
  await db.insert(quests).values({
    hunterId: HUNTER_ID,
    type: "bonus",
    title: title.toUpperCase(),
    description,
    goals: [{ label: title, done: false }],
    xpReward,
    statReward,
    targetDate: now.localDate,
    status: "active",
  });
}

export async function addPresetBonus(index: number) {
  const preset = BONUS_PRESETS[index % BONUS_PRESETS.length];
  await addBonusQuest(preset.title, preset.description, preset.xpReward, preset.statReward);
}

export async function removeQuest(id: number) {
  await db
    .delete(quests)
    .where(and(eq(quests.id, id), eq(quests.hunterId, HUNTER_ID), eq(quests.type, "bonus")));
}

export async function toggleQuestGoal(id: number, goalIndex: number) {
  const [q] = await db
    .select()
    .from(quests)
    .where(and(eq(quests.id, id), eq(quests.hunterId, HUNTER_ID)))
    .limit(1);
  if (!q || q.status !== "active") return;
  const goals = q.goals.map((g, i) => (i === goalIndex ? { ...g, done: !g.done } : g));
  await db.update(quests).set({ goals }).where(eq(quests.id, id));
  const allDone = goals.length > 0 && goals.every((g) => g.done);

  if (q.type === "penalty" && allDone) {
    const [p] = await db
      .select()
      .from(punishments)
      .where(and(eq(punishments.hunterId, HUNTER_ID), eq(punishments.state, "active")))
      .limit(1);
    if (p) {
      await db
        .update(punishments)
        .set({ penaltyDone: true, penaltyGoals: goals })
        .where(eq(punishments.id, p.id));
      await db
        .update(quests)
        .set({ status: "completed", completedAt: new Date(), goals })
        .where(eq(quests.id, id));
      await maybeClearPunishment();
      return;
    }
  }

  if (q.type !== "penalty" && allDone) {
    await db
      .update(quests)
      .set({ status: "completed", completedAt: new Date(), goals })
      .where(eq(quests.id, id));
    const res = await awardXp(q.xpReward, `quest_${q.type}`, {
      multiplierPct: q.type === "emergency" ? 0 : 5,
      label: q.type === "emergency" ? "triple-base" : "bonus",
    });
    await syncAchievements();
    await pushEvent("quest_complete", {
      title: q.title,
      xp: res.gained,
      type: q.type,
      levelsGained: res.levelsGained,
    });
  }
}

export async function acceptEmergency() {
  const { cfg } = await ensureWorld();
  const now = nowInZone(cfg.timezone);
  const [q] = await db
    .select()
    .from(quests)
    .where(
      and(
        eq(quests.hunterId, HUNTER_ID),
        eq(quests.type, "emergency"),
        eq(quests.status, "active"),
      ),
    )
    .limit(1);
  if (q) return;
  const t = EMERGENCY_TEMPLATES[Math.floor(Math.random() * EMERGENCY_TEMPLATES.length)];
  await db.insert(quests).values({
    hunterId: HUNTER_ID,
    type: "emergency",
    key: `emergency-${now.localDate}-manual`,
    title: t.title,
    description: t.description,
    goals: t.goals.map((g) => ({ label: g, done: false })),
    xpReward: t.xpReward,
    statReward: t.statReward,
    targetDate: now.localDate,
    expiresAt: new Date(Date.now() + t.windowMinutes * 60_000),
    status: "active",
  });
  await pushEvent("emergency_quest", { title: t.title, windowMinutes: t.windowMinutes });
}

/* -------------------------------- TRAINING ------------------------------- */
export async function toggleExercise(exerciseId: string) {
  const { cfg } = await ensureWorld();
  const now = nowInZone(cfg.timezone);
  const existing = await db
    .select()
    .from(workoutLogs)
    .where(
      and(
        eq(workoutLogs.hunterId, HUNTER_ID),
        eq(workoutLogs.localDate, now.localDate),
        eq(workoutLogs.exerciseId, exerciseId),
      ),
    )
    .limit(1);

  if (existing.length) {
    await db.delete(workoutLogs).where(eq(workoutLogs.id, existing[0].id));
    return { done: false, xpGained: 0 };
  }
  const tier = tierFromWeek(cfg.weekIndex);
  const dayKey = weekdayKeyOf(now.localDate);
  const plan = getTrainingDay(tier, dayKey);
  const exercise =
    plan.exercises.find((e) => e.id === exerciseId) ??
    CLASSIC_BASELINE.find((b) => b.id === exerciseId) ??
    exerciseById(exerciseId);
  const attr = exercise?.attr ?? "STR";
  await db.insert(workoutLogs).values({
    hunterId: HUNTER_ID,
    localDate: now.localDate,
    dayKey,
    tier,
    exerciseId,
    xpAwarded: 8,
  });
  const res = await awardXp(8, `training_${attr}`, { multiplierPct: 0 });
  await syncAchievements();
  return { done: true, xpGained: res.gained, levelsGained: res.levelsGained };
}

/* ------------------------------- MISSION CLOCK ---------------------------- */
export async function setDayMode(mode: string) {
  const { cfg } = await ensureWorld();
  const now = nowInZone(cfg.timezone);
  const want: DayMode = mode === "hell" ? "hell" : "school";
  await db
    .insert(dayModes)
    .values({ hunterId: HUNTER_ID, localDate: now.localDate, mode: want })
    .onConflictDoUpdate({
      target: [dayModes.hunterId, dayModes.localDate],
      set: { mode: want, chosenAt: new Date() },
    });
  await pushEvent("day_mode", { mode: want, date: now.localDate });
  return { ok: true, mode: want };
}

export async function toggleScheduleBlock(blockId: string) {
  await tick();
  const { cfg } = await ensureWorld();
  const now = nowInZone(cfg.timezone);
  const def = SCHEDULE_BLOCKS.find((x) => x.id === blockId);
  if (!def) return { ok: false as const, error: "Unknown timetable block." };

  const [modeRow] = await db
    .select()
    .from(dayModes)
    .where(and(eq(dayModes.hunterId, HUNTER_ID), eq(dayModes.localDate, now.localDate)))
    .limit(1);
  const [todayLog] = await db
    .select()
    .from(dayLogs)
    .where(and(eq(dayLogs.hunterId, HUNTER_ID), eq(dayLogs.localDate, now.localDate)))
    .limit(1);
  const cleared = todayLog ? (CLEARED as readonly string[]).includes(todayLog.status) : false;

  if (def.kind === "anime" && !cleared) {
    return {
      ok: false as const,
      error:
        "ANIME IS LOCKED. SCREEN TIME IS EARNED, NOT GIVEN — COMPLETE TODAY'S DAILY QUEST FIRST.",
    };
  }
  if (!def.modes.includes((modeRow?.mode as DayMode) ?? "school") && modeRow) {
    return { ok: false as const, error: `That block is not part of today's ${modeRow.mode.toUpperCase()} protocol.` };
  }

  const existing = await db
    .select()
    .from(blockLogs)
    .where(
      and(
        eq(blockLogs.hunterId, HUNTER_ID),
        eq(blockLogs.localDate, now.localDate),
        eq(blockLogs.blockId, blockId),
      ),
    )
    .limit(1);
  if (existing.length) {
    await db.delete(blockLogs).where(eq(blockLogs.id, existing[0].id));
    return { ok: true as const, done: false, xpGained: 0 };
  }
  const res = await awardXp(def.xp, `block_${blockId}`, { multiplierPct: 0 });
  await db.insert(blockLogs).values({
    hunterId: HUNTER_ID,
    localDate: now.localDate,
    blockId,
    xpAwarded: res.gained,
  });
  await syncAchievements();
  return { ok: true as const, done: true, xpGained: res.gained, levelsGained: res.levelsGained, level: res.level };
}

export async function setHolidays(dates: string[]) {
  await ensureWorld();
  const valid = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 120);
  await db.delete(holidays).where(eq(holidays.hunterId, HUNTER_ID));
  for (const d of valid) {
    await db.insert(holidays).values({ hunterId: HUNTER_ID, localDate: d, name: null }).onConflictDoNothing();
  }
  await tick();
  return { ok: true, count: valid.length };
}

/* --------------------------------- GUARD --------------------------------- */
export async function guardAttempt(app: string) {
  await tick();
  const { cfg } = await ensureWorld();
  const punish = await activePunishment();
  const essential = [...NEVER_BLOCKED, ...cfg.essentialApps];
  if (!punish || !cfg.guardEnabled) {
    await db.insert(blockerEvents).values({
      hunterId: HUNTER_ID,
      punishmentId: punish?.id ?? null,
      appName: app,
      action: "allowed_normal",
    });
    return { blocked: false, reason: "NORMAL MODE — no consequence active." };
  }
  if (essential.includes(app)) {
    await db.insert(blockerEvents).values({
      hunterId: HUNTER_ID,
      punishmentId: punish.id,
      appName: app,
      action: "allowed_essential",
    });
    return { blocked: false, reason: "ESSENTIAL / EMERGENCY APP — never blocked." };
  }
  if (app === SETTINGS_APP) {
    await db.insert(blockerEvents).values({
      hunterId: HUNTER_ID,
      punishmentId: punish.id,
      appName: app,
      action: "delayed_settings",
    });
    return { blocked: false, delayed: true, reason: "SETTINGS ALLOWED WITH 30s DELAY." };
  }
  if (cfg.blockedApps.includes(app)) {
    await db.insert(blockerEvents).values({
      hunterId: HUNTER_ID,
      punishmentId: punish.id,
      appName: app,
      action: "blocked",
    });
    return {
      blocked: true,
      reason: "STREAK BROKEN — CONSEQUENCE ACTIVE. Complete the recovery requirement.",
    };
  }
  await db.insert(blockerEvents).values({
    hunterId: HUNTER_ID,
    punishmentId: punish.id,
    appName: app,
    action: "allowed_unlisted",
  });
  return { blocked: false, reason: "Not on your distraction list." };
}

export async function guardEscape() {
  const [h] = await db.select().from(hunters).where(eq(hunters.id, HUNTER_ID)).limit(1);
  await db
    .update(hunters)
    .set({ escapeAttempts: h.escapeAttempts + 1, updatedAt: new Date() })
    .where(eq(hunters.id, HUNTER_ID));
  await db.insert(blockerEvents).values({
    hunterId: HUNTER_ID,
    appName: "SYSTEM",
    action: "escape_attempt",
  });
}

export async function guardForceDisable(sentence: string, requestedAt: number) {
  await tick();
  const { cfg } = await ensureWorld();
  const punish = await activePunishment();
  if (!punish) return { ok: false as const, error: "No consequence is active. Nothing to disable." };
  const trimmed = (sentence ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (trimmed !== FORCE_DISABLE_SENTENCE.toLowerCase()) {
    return {
      ok: false as const,
      error: `Type the exact sentence: "${FORCE_DISABLE_SENTENCE}"`,
    };
  }
  const elapsed = (Date.now() - requestedAt) / 1000;
  if (elapsed < cfg.guardDisableDelaySec - 1) {
    return {
      ok: false as const,
      error: `The ${Math.round(cfg.guardDisableDelaySec / 60)}-minute warning period has not elapsed. ${Math.ceil(
        cfg.guardDisableDelaySec - elapsed,
      )}s remaining.`,
    };
  }
  const now = nowInZone(cfg.timezone);
  await db
    .insert(dayLogs)
    .values({
      hunterId: HUNTER_ID,
      localDate: now.localDate,
      status: "failed",
      method: null,
      categories: [],
      xpAwarded: 0,
      statPointsAwarded: 0,
      note: "Force-disabled the blocker during punishment.",
    })
    .onConflictDoUpdate({
      target: [dayLogs.hunterId, dayLogs.localDate],
      set: { status: "failed", note: "Force-disabled the blocker during punishment." },
    });
  const [h] = await db.select().from(hunters).where(eq(hunters.id, HUNTER_ID)).limit(1);
  await db
    .update(hunters)
    .set({
      missedTotal: h.missedTotal + 1,
      currentStreak: 0,
      updatedAt: new Date(),
    })
    .where(eq(hunters.id, HUNTER_ID));
  await db
    .update(punishments)
    .set({ state: "force_disabled", clearedAt: new Date(), forceSentence: sentence })
    .where(eq(punishments.id, punish.id));
  await db
    .update(quests)
    .set({ status: "failed" })
    .where(and(eq(quests.hunterId, HUNTER_ID), eq(quests.type, "penalty"), eq(quests.status, "active")));
  await db.insert(blockerEvents).values({
    hunterId: HUNTER_ID,
    punishmentId: punish.id,
    appName: "GUARD",
    action: "force_disable",
  });
  await pushEvent("force_disabled", { date: now.localDate, sentence });
  return {
    ok: true as const,
    message:
      "THE DAY IS MARKED AS FAILED — PERMANENTLY. The consequence has been served; access is restored. Your streak cannot be recovered for this date.",
  };
}

/* -------------------------------- SETTINGS ------------------------------- */
export async function onboardHunter(input: {
  name: string;
  dailyTask: string;
  taskPrompt?: string;
  timezone?: string;
  deadlineMinutes: number;
  reminderMinutes: number;
  verificationMode: string;
  timerMinimumMinutes?: number;
  primaryCategory?: Attr;
}) {
  await ensureWorld();
  const tz = safeTimezone(input.timezone) ?? "UTC";
  const awakenedLocal = nowInZone(tz).localDate;
  await db
    .update(hunters)
    .set({
      name: (input.name || "HUNTER").toUpperCase().slice(0, 18),
      awakenedLocalDate: awakenedLocal,
      lastEvaluatedDate: awakenedLocal,
      updatedAt: new Date(),
    })
    .where(eq(hunters.id, HUNTER_ID));
  await db
    .update(settings)
    .set({
      timezone: tz,
      dailyTask: input.dailyTask || "Complete today's prescribed training",
      taskPrompt: input.taskPrompt ?? "",
      deadlineMinutes: Math.min(1439, Math.max(1, Math.round(input.deadlineMinutes))),
      reminderMinutes: Math.min(1439, Math.max(0, Math.round(input.reminderMinutes))),
      verificationMode: ["photo", "timer", "ask"].includes(input.verificationMode)
        ? input.verificationMode
        : "photo",
      timerMinimumMinutes: Math.max(5, Math.round(input.timerMinimumMinutes ?? 20)),
      primaryCategory: input.primaryCategory ?? "STR",
      onboarded: true,
      updatedAt: new Date(),
    })
    .where(eq(settings.hunterId, HUNTER_ID));
  await pushEvent("awakened", { name: input.name, task: input.dailyTask });
  await tick();
}

export async function updateSettings(patch: Record<string, unknown>) {
  await ensureWorld();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof patch.timezone === "string") {
    const tz = safeTimezone(patch.timezone);
    if (tz) set.timezone = tz;
  }
  if (typeof patch.dailyTask === "string" && patch.dailyTask.trim()) set.dailyTask = patch.dailyTask.trim().slice(0, 80);
  if (typeof patch.taskPrompt === "string") set.taskPrompt = patch.taskPrompt.slice(0, 300);
  if (typeof patch.primaryCategory === "string" && ATTRS.includes(patch.primaryCategory as Attr))
    set.primaryCategory = patch.primaryCategory;
  if (typeof patch.deadlineMinutes === "number")
    set.deadlineMinutes = Math.min(1439, Math.max(1, Math.round(patch.deadlineMinutes)));
  if (typeof patch.reminderMinutes === "number")
    set.reminderMinutes = Math.min(1439, Math.max(0, Math.round(patch.reminderMinutes)));
  if (typeof patch.verificationMode === "string" && ["photo", "timer", "ask"].includes(patch.verificationMode))
    set.verificationMode = patch.verificationMode;
  if (typeof patch.timerMinimumMinutes === "number")
    set.timerMinimumMinutes = Math.max(5, Math.round(patch.timerMinimumMinutes));
  if (Array.isArray(patch.blockedApps))
    set.blockedApps = (patch.blockedApps as string[]).filter((a) => typeof a === "string" && a !== SETTINGS_APP).slice(0, 40);
  if (Array.isArray(patch.essentialApps))
    set.essentialApps = (patch.essentialApps as string[]).filter((a) => typeof a === "string").slice(0, 40);
  if (typeof patch.guardEnabled === "boolean") set.guardEnabled = patch.guardEnabled;
  if (typeof patch.guardDisableDelaySec === "number")
    set.guardDisableDelaySec = Math.min(600, Math.max(15, Math.round(patch.guardDisableDelaySec)));
  if (typeof patch.weekIndex === "number")
    set.weekIndex = Math.min(52, Math.max(1, Math.round(patch.weekIndex)));
  if (typeof patch.name === "string" && patch.name.trim()) set.name = patch.name.trim().toUpperCase().slice(0, 18);
  if (typeof patch.activeTitle === "string" || patch.activeTitle === null)
    set.activeTitle = patch.activeTitle;
  await db.update(settings).set(set).where(eq(settings.hunterId, HUNTER_ID));
  if (set.name) {
    await db.update(hunters).set({ name: set.name as string }).where(eq(hunters.id, HUNTER_ID));
  }
  await tick();
}

export { SETTINGS_APP };
