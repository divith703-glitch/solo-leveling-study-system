# Hunter System: Architecture

## Punishment state machine
```
            deadline passes, day still PENDING
   NORMAL ─────────────────────────────────────▶ PUNISHMENT   (immediate; streak=0, missCount+1, penaltyDone=false)
     ▲                                                │
     │  penalty task done AND recovery log accepted    │  each further missed day: missCount+1
     └────────────────────────────────────────────────┘  recovery sets streak=1, missCount=0
```
- All transitions live in `PunishmentEngine`. `reconcile()` is idempotent and is called from: app open, BlockerService connect, deadline alarm, boot, timezone change, clock change, app update.
- Interpretation of "re-establishing a 1-day streak": the recovery log (after the penalty task) counts as day 1 of a new streak.
- Force-disable (service unbind) or the sanctioned disable flow during PUNISHMENT marks today `FAILED_PERMANENT` (never recoverable, never overwritten).

## Schema (Room)
| Table | Purpose |
|---|---|
| profile (1 row) | xp, level, streak, bestStreak, missCount, state, penaltyDone, titles, lastReconciled |
| day_log | PK dayKey (yyyy-MM-dd). status: PENDING, VERIFIED, HONOR, QUEUED, MISSED, RECOVERED, FAILED_PERMANENT. Only the engine changes status; no UI path edits past days. |
| photo_proof | path, sha256 (UNIQUE = anti-reuse), takenAt, lat/lng (offline queue), state QUEUED/VERIFIED/REJECTED |
| quest | BONUS / EMERGENCY (expiresAt) / PENALTY |
| attr | STR/AGI/INT/VIT points (PER is derived from streak) |
| punishment_event | audit log: MISSED, RECOVERED, TAMPER |

## Verification flow
photo → compress (<=1024px JPEG 80) → SHA-256 reject if seen → Gemini (3 tries, 1s/2s/4s backoff) → Groq (3 tries) → Unavailable.
- Verified: XP + streak. Rejected: reason shown, 3 consecutive rejects per day unlock Honor Mode (base XP, no title multiplier, shown as HONOR in history).
- Unavailable: proof queued with timestamp, streak safe, XP held; `MaintenanceWorker` (every 6h, network required) re-verifies and calls `releaseQueuedXp`.
- Proof files deleted after 7 days by the worker; hash rows are kept so old photos cannot be reused.
- Keys are entered in Settings and stored in app-private SharedPreferences. Gemini key is sent in the `x-goog-api-key` header.
- Models are configurable. `gemini-2.0-flash` is the default per the spec; if Google retires it, change the model name in the prefs (free-tier models and quotas change, so check AI Studio).

## Edge cases
| Case | Handling |
|---|---|
| Timezone change / manual clock change | `TIMEZONE_CHANGED`, `TIME_SET` receivers reconcile and re-arm alarms. Day rows record `zoneId`. Known gap: travelling west can re-open a day already marked MISSED; MISSED is never reverted. |
| Deadline at/after midnight | Deadlines are same-day only; midnight always closes the day. |
| Missed several days while off/dead | `reconcile()` walks every day since `lastReconciled`. |
| Reboot mid-punishment | State is in Room; BOOT_COMPLETED reconciles and re-arms; Android re-binds the enabled accessibility service itself. |
| Force-stop | Android does not restart a force-stopped app until the user opens it. Opening reconciles. A force-stop followed by disabling the service triggers `onUnbind` → TAMPER. |
| Blocker disabled in system settings | `onUnbind` during PUNISHMENT marks the day FAILED_PERMANENT. |
| Offline | See verification flow. |

## Settings tradeoff (documented as required)
Settings is not hard-blocked during PUNISHMENT: opening it shows a 60-second delay gate, then allows 5 minutes. A hard block could prevent emergency changes (network, accessibility, safety settings). The cost: a determined user can wait it out and disable the service, which is then recorded as TAMPER and permanently fails the day.

## Honest limits
- "Auto-restart if killed": the OS restarts enabled accessibility services; the app cannot restart one the user disabled. Disabling is detected, not prevented.
- Blocking is a full-screen Activity launched on top, not a draw-over overlay (more reliable, no SYSTEM_ALERT_WINDOW).
- Google Play restricts Accessibility use for non-accessibility apps. Plan on sideloading (APK) for personal use.
- Photo proof is spoofable (photo of a photo). It raises effort, it is not proof.
- Not yet compiled or tested: this was written without a build environment. Expect small compile fixes on first Sync.

## Not included yet
Level-up/rank-up animations beyond a dialog, app picker UI (packages are entered by id), CameraX with live GPS tagging (location is passed as null for now), instrumented tests.
