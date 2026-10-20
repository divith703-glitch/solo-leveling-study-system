import Link from "next/link";
import { RANK_META, TITLES, NEVER_BLOCKED, type RankLetter } from "@/lib/game";
import { WEEKDAYS } from "@/lib/game";

export const metadata = { title: "THE SYSTEM — Architecture & State Machine" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="sys-window sys-corners mb-5" style={{ ["--tone" as string]: "#3fd2ff" }}>
      <header className="sys-head">
        <span className="inline-block h-1.5 w-1.5 blink bg-sys" />
        {title}
      </header>
      <div className="sys-body text-[0.78rem] leading-relaxed text-sys-soft/85">{children}</div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-2 overflow-x-auto border border-sys/25 bg-black/70 p-3 font-mono text-[0.68rem] leading-relaxed text-sys/90">
      {children}
    </pre>
  );
}

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black tracking-[0.16em] text-sys glow-text">
          SYSTEM DOCUMENTATION
        </h1>
        <Link href="/" className="sys-btn sys-btn-solid">
          ← BACK
        </Link>
      </div>

      <Section title="PHILOSOPHY">
        <p>
          &quot;You don&apos;t negotiate with the consequence. You complete the requirement, earn your
          access back, and move forward.&quot; The purpose is not shame — it is making
          procrastination structurally harder than the daily log. Every screen is designed so that
          <b> doing the task is the shortest path to what you want</b>.
        </p>
      </Section>

      <Section title="ARCHITECTURE">
        <Code>{`┌────────────┐   ┌────────────┐   ┌──────────────┐
│ Scheduler  │   │ Punishment │   │ App Blocker  │
│ (deadline, │→→→│  Engine    │→→→│ (Foreground  │
│  timers)   │   │ (state)    │   │  Detector)   │
└────────────┘   └────────────┘   └──────┬───────┘
       ↓                ↓                 ↓
┌──────────────────────────────────────────────────┐
│              Foreground App Detector              │
│  blocked? → show "STREAK BROKEN" overlay         │
│  essential? → allow                             │
└──────────────────────────────────────────────────┘
       ↓
┌──────────────┐   ┌──────────────┐   ┌───────────┐
│ Daily Log    │   │ XP / Levels / │   │ Rank &    │
│ Verification │→→→│ Stats / Quests│→→→│ Titles    │
└──────────────┘   └──────────────┘   └───────────┘`}</Code>
        <p className="mt-3">
          In this build the Scheduler is a deterministic <b>tick()</b> that runs on every request
          (page load, poll every 20s, and before any mutation). It walks forward from
          <code> last_evaluated_date</code> and applies the deadline rule for each local day. In the
          Android port the same function is invoked from <code>WorkManager</code>, an exact
          <code>AlarmManager</code> alarm at the deadline, and <code>BOOT_COMPLETED</code>.
        </p>
      </Section>

      <Section title="DATABASE SCHEMA">
        <Code>{`hunters        id, name, level, xp_into_level, total_xp, stat_points,
               current_streak, best_streak, total_logs, missed_total,
               honor_count, escape_attempts, active_title,
               last_evaluated_date, awakened_local_date
settings        hunter_id PK, timezone, daily_task, task_prompt,
               primary_category, deadline_minutes, reminder_minutes,
               verification_mode(photo|timer|ask), timer_minimum_minutes,
               blocked_apps jsonb, essential_apps jsonb, guard_enabled,
               guard_disable_delay_sec, onboarded, week_index
day_logs       (hunter_id, local_date) UNIQUE  ← IMMUTABLE HISTORY
               status: pending|verified|honor|recovered|missed|failed
               method, categories jsonb, xp_awarded, photo_hash, note,
               completed_at
proofs        (hunter_id, photo_hash) UNIQUE  ← ANTI-REUSE
               provider, model, verdict, reason, gps, purge_after(+7d)
quests         id, type(daily|bonus|emergency|penalty), title, description,
               goals jsonb[{label,done}], xp_reward, stat_reward,
               target_date, expires_at, status
punishments    id, state(active|cleared|force_disabled), trigger_date,
               missed_count, penalty_label, penalty_goals jsonb,
               recovery_log_done, penalty_done, activated_at, cleared_at,
               force_sentence
blocker_events id, punishment_id, app_name,
               action(blocked|allowed_essential|delayed_settings|
                      escape_attempt|force_disable), created_at
xp_ledger      id, amount, source, multiplier
achievements  (hunter_id, title_key) UNIQUE, unlocked_at
workout_logs  (hunter_id, local_date, exercise_id) UNIQUE, day_key, tier
system_events  id, kind, payload jsonb, seen`}</Code>
        <p className="mt-3">
          <b>Immutability rule:</b> rows in <code>day_logs</code> are inserted by the engine only.
          There is no user-facing update or delete path, and no API accepts a date parameter — the
          engine always derives &quot;today&quot; from the stored timezone. This is what makes
          back-filling or editing history impossible.
        </p>
      </Section>

      <Section title="PUNISHMENT STATE MACHINE">
        <Code>{`        ┌──────────────────────────────────────────────┐
        │                  NORMAL                       │
        │  (0 unresolved misses · nothing blocked)      │
        └───────────────┬──────────────────────────────┘
                        │ local_time > deadline AND no cleared log
                        │ (evaluated every tick, immediately)
                        ▼
        ┌──────────────────────────────────────────────┐
        │  PUNISHMENT (state = active)                 │
        │  · missed_count += 1  (escalates on repeat)  │
        │  · day_logs[today] = 'missed' (immutable)    │
        │  · distraction list blocked                  │
        │  · penalty quest generated                   │
        │  · escape attempts logged                    │
        └───────┬──────────────────────────┬───────────┘
   recovery_log_done && │                      │ user completes the 5-minute
   penalty_done        │                      │ warning + types the sentence
   (1-day streak       │                      ▼
   re-established)     │        ┌──────────────────────────┐
                ┌──────┘        │  force_disabled          │
                ▼               │  day marked 'failed'     │
        ┌──────────────┐        │  PERMANENT — no recovery │
        │  cleared     │        │  consequence served      │
        │  access      │        └──────────────────────────┘
        │  restored    │
        └──────────────┘`}</Code>
        <p className="mt-3">
          Transitions are idempotent: re-running the tick for an already-evaluated date changes
          nothing. A <code>pending</code> log (offline queued proof) degrades to <code>honor</code>{" "}
          after 12 hours so a dead API can never permanently block a log.
        </p>
      </Section>

      <Section title="XP / LEVEL / RANK / TITLES">
        <ul className="list-inside list-disc space-y-1">
          <li>Daily log = <b>100 XP base</b>, +3 stat points, +1 point to the primary attribute.</li>
          <li>Level curve: <code>XP_to_next = 100 × level^1.5</code>.</li>
          <li>
            Multiplier = titles bonus + <code>min(50%, 2% × streak)</code>. Honor mode always pays
            base only.
          </li>
          <li>
            Attributes auto-level from logged data: STR = workouts, AGI = HIIT/speed, INT = study,
            VIT = sleep/water/mobility, PER = on-time logs. Curve: cumulative points to reach level
            L = <code>5·L·(L−1)</code>.
          </li>
          <li>
            Rank = the <b>lower</b> of level-rank and streak-rank (E/D at 12/3, C at 22/7, B at 32/14,
            A at 45/30, S at 60/60). Consistency gates power.
          </li>
          <li>
            Titles: {TITLES.map((t) => `${t.name} (${t.requirement}, +${t.bonusPct}%)`).join(" · ")}.
          </li>
        </ul>
      </Section>

      <Section title="PHOTO PROOF & ANTI-CHEAT (5B)">
        <ol className="list-inside list-decimal space-y-1">
          <li>Capture in-app → client compresses to ≤760px JPEG (q 0.72).</li>
          <li>
            <b>SHA-256 hash is computed before anything else.</b> If the hash already exists in{" "}
            <code>proofs</code> the submission is rejected with PHOTO_REUSE — this costs zero API
            calls and stops &quot;reuse yesterday&apos;s gym selfie&quot;.
          </li>
          <li>
            Gemini free tier (<code>gemini-2.0-flash</code> → 2.5-flash → flash-latest, whichever
            responds) receives base64 inline data plus the task prompt, temperature 0.
          </li>
          <li>VERIFIED → XP granted, streak continues. NOT_VERIFIED → the reason is shown verbatim so the user can retake.</li>
          <li>
            Three consecutive rejections unlock <b>honor mode</b> — logged visibly, no multiplier.
          </li>
          <li>
            API down / no key → proof is queued: streak safe, XP held, auto-resolves to honor mode
            after 12h. The log is never permanently blocked.
          </li>
          <li>Photos are never persisted server-side; hash + verdict only, purged after 7 days.</li>
        </ol>
      </Section>

      <Section title="ESSENTIAL / EMERGENCY EXCEPTION LIST">
        <p>
          Hard-coded, never blockable, cannot be removed: {NEVER_BLOCKED.join(" · ")}. User-essential
          apps are configurable. <b>Documented tradeoff:</b> the Settings app is not hard-blocked
          during punishment because emergency actions (airplane mode, accessibility toggles, battery)
          live there — instead it is gated with a 30-second delay and every entry is written to the
          blocker event log. No data deletion. No device damage. No locking of emergency apps.
        </p>
      </Section>

      <Section title="EDGE CASES">
        <ul className="list-inside list-disc space-y-1">
          <li>
            <b>Timezone change / travel:</b> the timezone is stored in settings and re-synced from the
            device on every load. All dates are computed with <code>Intl.DateTimeFormat</code> in that
            zone, never from UTC, so the deadline follows the hunter.
          </li>
          <li>
            <b>Missed deadline at midnight:</b> the deadline is stored as minutes-from-midnight. A
            deadline of 23:59 with 23:59:30 on the clock still counts as missed; the tick only marks a
            day once (idempotent, guarded by <code>last_evaluated_date</code>).
          </li>
          <li>
            <b>Deadline at 00:00 / DST shift:</b> the loop walks whole local dates; a day that
            suddenly becomes 23h or 25h long still evaluates exactly once.
          </li>
          <li>
            <b>Force-stop / reboot mid-punishment:</b> nothing lives only in memory. State is in the
            database; the tick runs again on the next launch. On Android, <code>BOOT_COMPLETED</code>{" "}
            + a foreground service restart the Accessibility Service and re-arm the exact alarm.
          </li>
          <li>
            <b>Backdated cheating:</b> no endpoint accepts a date. History is append-only.
          </li>
          <li>
            <b>Photo reuse:</b> rejected by hash before any network call.
          </li>
          <li>
            <b>Offline:</b> proof queued with timestamp + GPS, XP held, streak safe.
          </li>
        </ul>
      </Section>

      <Section title="TRAINING PROGRAM — RANK LADDER">
        <div className="space-y-2">
          {(Object.keys(RANK_META) as RankLetter[]).map((l) => (
            <div key={l} className="border border-sys/20 p-2">
              <div className="font-display text-[0.74rem] tracking-widest text-white">
                {l}-RANK · {RANK_META[l].name} · {RANK_META[l].weeks}
              </div>
              <p className="mt-1 font-mono text-[0.66rem] text-sys-soft/70">{RANK_META[l].focus}</p>
            </div>
          ))}
        </div>
        <Code>{`MON  PUSH            ${WEEKDAYS[0].focus}
TUE  CORE            ${WEEKDAYS[1].focus}
WED  CHEST & BACK    ${WEEKDAYS[2].focus}
THU  REST            ${WEEKDAYS[3].focus}
FRI  CORE + HIIT     ${WEEKDAYS[4].focus}
SAT  LEGS + BACK     ${WEEKDAYS[5].focus}
SUN  TESTS ONLY      ${WEEKDAYS[6].focus}`}</Code>
        <p className="mt-2">
          Every exercise ships a pictorial representation (line-art glyph rendered in the System&apos;s
          electric blue), a set/rep prescription, a form cue, and the attribute it feeds. Completing an
          exercise grants +8 XP and raises its attribute; the daily quest window mirrors the same
          list as its GOALS.
        </p>
      </Section>

      <Section title="MISSION CLOCK — FIXED DAILY TIMETABLE">
        <Code>{`03:00            WAKE PROTOCOL                (VIT · +4 XP)
03:00 – 05:30   STUDY SESSION 1 — HEAVY MATH + PHYSICS (INT · +20 XP)
05:30 – 06:00   MORNING PREP                 (passive)
06:00 – 07:00   WORKOUT — TRAINING PROTOCOL  (STR · +8 XP)
07:00 – 18:00   SCHOOL — BUS @07:00, HOME @18:00 (school days, passive)
18:00 – 18:02   THE 2-MINUTE BREAK           (timer-enforced, exactly 120s)
19:00 – 21:45   STUDY SESSION 3 — CHEMISTRY  (INT · +15 XP)
22:00           DINNER                        (passive)
22:00 – 23:00   ANIME — EARNED SCREEN TIME    (LOCKED until Daily Quest done)
23:00 → 03:00   LIGHTS OUT — SLEEP PROTOCOL   (VIT · +8 XP)`}</Code>
        <p className="mt-3">
          Every check-in raises its linked attribute and grants XP. The 2-minute break is enforced by
          a locked countdown. The anime block is a <b>reward gate</b>: the System refuses to open it
          until today's Daily Quest is complete. On <b>Sundays and government holidays</b> the System
          shows a mandatory popup at first contact: <b>SCHOOL OR HELL PROTOCOL?</b> Choosing HELL (no
          school) issues the annex blocks — <b>SANSKRIT 30 MIN (12:30)</b> and <b>ENGLISH 0.5 HRS
          (13:00)</b> — and Sundays also carry the MIT + JEE level tests from the Training program.
          Movable holidays (Diwali, Holi, Eid…) can be added in System → Holidays.
        </p>
      </Section>

      <Section title="SUBWAY — JEENIUS MIT PREP ROUTE">
        <p>
          A permanent daily transit quest injected every morning: <b>“SUBWAY — MIT PREP ROUTE
          (JEENIUS)”</b>, worth 42 XP and +1 INT. The STOP button deep-links straight into the
          JEENIUS Android app via an intent URL with a Play Store fallback
          (<code>com.stash.jeenius</code>): PYQ sets → chapter drills → revision queue → doubt AI.
          Checking the goal after the session grants the XP.
        </p>
        <Code>{`intent://#Intent;action=android.intent.action.MAIN;
  category=android.intent.category.LAUNCHER;
  package=com.stash.jeenius;
  S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.stash.jeenius;
end`}</Code>
      </Section>

      <Section title="NATIVE ANDROID PORT NOTES">
        <p>
          This build is the reference implementation of the engine and UI. On Android the same state
          machine runs in Room and the Foreground Detector becomes:
        </p>
        <Code>{`// AndroidManifest.xml
<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS"
                 tools:ignore="ProtectedPermissions"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<service android:name=".guard.BlockerAccessibilityService"
         android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
         android:exported="false">
  <intent-filter><action android:name="android.accessibilityservice.AccessibilityService"/></intent-filter>
  <meta-data android:name="android.accessibilityservice"
             android:resource="@xml/blocker_accessibility_config"/>
</service>

// BlockerAccessibilityService.kt
override fun onAccessibilityEvent(event: AccessibilityEvent) {
    if (event.eventType != TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    val state = PunishmentEngine.state()          // NORMAL | PUNISHMENT
    when {
        state != PUNISHMENT -> Unit                // allow
        Essentials.isEssential(pkg) -> Unit        // dialer, SMS, medical — never blocked
        pkg == "com.android.settings" -> delay(30_000)  // documented tradeoff
        Blocklist.isBlocked(pkg) -> BlockerActivity.show(context, pkg) // full-screen overlay
    }
}

// Self-healing: the service is sticky, the boot receiver re-arms the exact
// alarm, and a JobScheduler job re-asserts the foreground service if killed.`}</Code>
      </Section>
    </main>
  );
}
