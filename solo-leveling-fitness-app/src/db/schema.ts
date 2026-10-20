/**
 * ============================================================================
 *  THE SYSTEM — LOCAL HUNTER DATABASE (Postgres mirror of the Android Room DB)
 * ============================================================================
 *  Design rules:
 *   - `day_logs` is IMMUTABLE HISTORY. Rows are only ever inserted or
 *     transitioned forward (pending -> verified | honor | recovered | missed | failed).
 *     There is NO update-by-user path and no delete path. This is what makes the
 *     streak un-fakeable.
 *   - `punishments` holds the state machine (NORMAL -> PUNISHMENT -> CLEARED/FORCE_DISABLED).
 *   - `proofs` holds photo hashes (anti-reuse) and AI verdicts.
 *   - `blocker_events` is the audit log of the Foreground App Detector.
 * ============================================================================
 */
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* 1. HUNTER PROFILE                                                          */
/* -------------------------------------------------------------------------- */
export const hunters = pgTable("hunters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  xpIntoLevel: integer("xp_into_level").notNull(),
  totalXp: integer("total_xp").notNull(),
  statPoints: integer("stat_points").notNull(),
  currentStreak: integer("current_streak").notNull(),
  bestStreak: integer("best_streak").notNull(),
  totalLogs: integer("total_logs").notNull(),
  missedTotal: integer("missed_total").notNull(),
  honorCount: integer("honor_count").notNull(),
  escapeAttempts: integer("escape_attempts").notNull(),
  activeTitle: text("active_title"),
  lastEvaluatedDate: text("last_evaluated_date"),
  awakenedAt: timestamp("awakened_at", { withTimezone: true }).notNull().defaultNow(),
  awakenedLocalDate: text("awakened_local_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* 2. SETTINGS (deadline / verification / blocker lists)                      */
/* -------------------------------------------------------------------------- */
export const settings = pgTable("settings", {
  hunterId: text("hunter_id").primaryKey(),
  timezone: text("timezone").notNull(),
  dailyTask: text("daily_task").notNull(),
  taskPrompt: text("task_prompt").notNull(),
  primaryCategory: text("primary_category").notNull(),
  deadlineMinutes: integer("deadline_minutes").notNull(),
  reminderMinutes: integer("reminder_minutes").notNull(),
  verificationMode: text("verification_mode").notNull(), // photo | timer | ask
  timerMinimumMinutes: integer("timer_minimum_minutes").notNull(),
  blockedApps: jsonb("blocked_apps").$type<string[]>().notNull(),
  essentialApps: jsonb("essential_apps").$type<string[]>().notNull(),
  guardEnabled: boolean("guard_enabled").notNull(),
  guardDisableDelaySec: integer("guard_disable_delay_sec").notNull(),
  onboarded: boolean("onboarded").notNull(),
  weekIndex: integer("week_index").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* 3. DAY LOGS — immutable streak history                                     */
/* -------------------------------------------------------------------------- */
export const dayLogs = pgTable(
  "day_logs",
  {
    id: serial("id").primaryKey(),
    hunterId: text("hunter_id").notNull(),
    localDate: text("local_date").notNull(), // YYYY-MM-DD in hunter timezone
    status: text("status").notNull(), // pending | verified | honor | recovered | missed | failed
    method: text("method"), // photo | timer | honor | null
    categories: jsonb("categories").$type<string[]>().notNull(),
    xpAwarded: integer("xp_awarded").notNull(),
    statPointsAwarded: integer("stat_points_awarded").notNull(),
    photoHash: text("photo_hash"),
    note: text("note"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("day_logs_hunter_date_uq").on(t.hunterId, t.localDate),
    index("day_logs_hunter_idx").on(t.hunterId),
  ],
);

/* -------------------------------------------------------------------------- */
/* 4. PROOFS — photo hash anti-reuse + AI verdicts                            */
/* -------------------------------------------------------------------------- */
export const proofs = pgTable(
  "proofs",
  {
    id: serial("id").primaryKey(),
    hunterId: text("hunter_id").notNull(),
    localDate: text("local_date").notNull(),
    photoHash: text("photo_hash").notNull(),
    provider: text("provider").notNull(), // gemini | groq | none
    model: text("model"),
    verdict: text("verdict").notNull(), // VERIFIED | NOT_VERIFIED | QUEUED | ERROR
    reason: text("reason"),
    gps: text("gps"),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    purgeAfter: timestamp("purge_after", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("proofs_hash_uq").on(t.hunterId, t.photoHash),
    index("proofs_hunter_idx").on(t.hunterId),
  ],
);

/* -------------------------------------------------------------------------- */
/* 5. QUESTS                                                                  */
/* -------------------------------------------------------------------------- */
export const quests = pgTable(
  "quests",
  {
    id: serial("id").primaryKey(),
    hunterId: text("hunter_id").notNull(),
    type: text("type").notNull(), // daily | bonus | emergency | penalty
    key: text("key"), // stable key (used for daily + penalty templates)
    title: text("title").notNull(),
    description: text("description").notNull(),
    goals: jsonb("goals").$type<{ label: string; done: boolean }[]>().notNull(),
    xpReward: integer("xp_reward").notNull(),
    statReward: text("stat_reward"), // STR | AGI | INT | VIT | PER
    targetDate: text("target_date").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    status: text("status").notNull(), // active | completed | expired | failed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("quests_hunter_idx").on(t.hunterId, t.status)],
);

/* -------------------------------------------------------------------------- */
/* 6. PUNISHMENTS — state machine                                             */
/* -------------------------------------------------------------------------- */
export const punishments = pgTable(
  "punishments",
  {
    id: serial("id").primaryKey(),
    hunterId: text("hunter_id").notNull(),
    state: text("state").notNull(), // active | cleared | force_disabled
    triggerDate: text("trigger_date").notNull(),
    missedCount: integer("missed_count").notNull(),
    penaltyLabel: text("penalty_label").notNull(),
    penaltyGoals: jsonb("penalty_goals").$type<{ label: string; done: boolean }[]>().notNull(),
    recoveryLogDone: boolean("recovery_log_done").notNull(),
    penaltyDone: boolean("penalty_done").notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
    forceSentence: text("force_sentence"),
  },
  (t) => [index("punishments_hunter_idx").on(t.hunterId, t.state)],
);

/* -------------------------------------------------------------------------- */
/* 7. BLOCKER EVENTS — foreground detector audit log                          */
/* -------------------------------------------------------------------------- */
export const blockerEvents = pgTable(
  "blocker_events",
  {
    id: serial("id").primaryKey(),
    hunterId: text("hunter_id").notNull(),
    punishmentId: integer("punishment_id"),
    appName: text("app_name").notNull(),
    action: text("action").notNull(), // blocked | allowed_essential | delayed_settings | escape_attempt | force_disable
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blocker_events_hunter_idx").on(t.hunterId)],
);

/* -------------------------------------------------------------------------- */
/* 8. XP LEDGER / ACHIEVEMENTS (TITLES) / TRAINING LOGS                       */
/* -------------------------------------------------------------------------- */
export const xpLedger = pgTable(
  "xp_ledger",
  {
    id: serial("id").primaryKey(),
    hunterId: text("hunter_id").notNull(),
    amount: integer("amount").notNull(),
    source: text("source").notNull(),
    multiplier: text("multiplier"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("xp_ledger_hunter_idx").on(t.hunterId)],
);

export const achievements = pgTable(
  "achievements",
  {
    id: serial("id").primaryKey(),
    hunterId: text("hunter_id").notNull(),
    titleKey: text("title_key").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("achievements_uq").on(t.hunterId, t.titleKey)],
);

export const workoutLogs = pgTable(
  "workout_logs",
  {
    id: serial("id").primaryKey(),
    hunterId: text("hunter_id").notNull(),
    localDate: text("local_date").notNull(),
    dayKey: text("day_key").notNull(),
    tier: text("tier").notNull(),
    exerciseId: text("exercise_id").notNull(),
    xpAwarded: integer("xp_awarded").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("workout_logs_uq").on(t.hunterId, t.localDate, t.exerciseId)],
);

/* -------------------------------------------------------------------------- */
/* 9. MISSION CLOCK — day mode (school | hell), block check-ins, holidays     */
/* -------------------------------------------------------------------------- */
export const dayModes = pgTable(
  "day_modes",
  {
    id: serial("id").primaryKey(),
    hunterId: text("hunter_id").notNull(),
    localDate: text("local_date").notNull(),
    mode: text("mode").notNull(), // school | hell
    chosenAt: timestamp("chosen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("day_modes_uq").on(t.hunterId, t.localDate)],
);

export const blockLogs = pgTable(
  "block_logs",
  {
    id: serial("id").primaryKey(),
    hunterId: text("hunter_id").notNull(),
    localDate: text("local_date").notNull(),
    blockId: text("block_id").notNull(),
    xpAwarded: integer("xp_awarded").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("block_logs_uq").on(t.hunterId, t.localDate, t.blockId)],
);

export const holidays = pgTable(
  "holidays",
  {
    id: serial("id").primaryKey(),
    hunterId: text("hunter_id").notNull(),
    localDate: text("local_date").notNull(),
    name: text("name"),
  },
  (t) => [uniqueIndex("holidays_uq").on(t.hunterId, t.localDate)],
);

export const systemEvents = pgTable(
  "system_events",
  {
    id: serial("id").primaryKey(),
    hunterId: text("hunter_id").notNull(),
    kind: text("kind").notNull(), // level_up | rank_up | title | punishment | quest | guard
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    seen: boolean("seen").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("system_events_hunter_idx").on(t.hunterId, t.seen)],
);
