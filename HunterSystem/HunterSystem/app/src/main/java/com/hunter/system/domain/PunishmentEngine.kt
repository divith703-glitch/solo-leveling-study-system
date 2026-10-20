package com.hunter.system.domain

import com.hunter.system.data.*
import java.time.*

/**
 * NORMAL --(deadline passes with day still PENDING)--> PUNISHMENT                [immediate]
 * PUNISHMENT --(penalty task done AND recovery log verified)--> NORMAL, streak=1
 * Every mutation goes through here. reconcile() is idempotent and safe to call from anywhere.
 */
class PunishmentEngine(private val dao: HunterDao, private val prefs: Prefs) {

    private suspend fun profile() = dao.profileNow() ?: Profile().also { dao.save(it) }
    private fun key(d: LocalDate) = d.toString()

    /** Walks every unreconciled day up to now. Handles boot, tz change, time change, midnight rollover. */
    suspend fun reconcile(now: ZonedDateTime = ZonedDateTime.now()) {
        var p = profile()
        val today = now.toLocalDate()
        var d = if (p.lastReconciled.isEmpty()) today else LocalDate.parse(p.lastReconciled).plusDays(1)
        while (!d.isAfter(today)) {
            dao.insertDay(DayLog(key(d), "PENDING", zoneId = now.zone.id))
            val row = dao.day(key(d))!!
            // Deadlines are same-calendar-day (no cross-midnight deadlines), so midnight always closes the day.
            val closed = d.isBefore(today) || !now.toLocalTime().isBefore(prefs.deadline)
            if (!closed) break
            if (row.status == "PENDING") {
                dao.setDay(row.dayKey, "MISSED", 0, null)
                p = p.copy(missCount = p.missCount + 1, streak = 0, state = "PUNISHMENT", penaltyDone = false)
                dao.log(PunishmentEvent(at = System.currentTimeMillis(), type = "MISSED", note = row.dayKey))
            }
            p = p.copy(lastReconciled = key(d)); d = d.plusDays(1)
        }
        dao.save(p)
    }

    /** mode: VERIFIED | HONOR | QUEUED (offline: streak safe, XP held). */
    suspend fun completeDaily(mode: String, category: String, now: ZonedDateTime = ZonedDateTime.now()): Result {
        reconcile(now)
        var p = profile()
        val k = key(now.toLocalDate())
        val row = dao.day(k) ?: return Result.Rejected("No row for today")
        if (row.status == "FAILED_PERMANENT") return Result.Rejected("Today is permanently failed.")
        if (p.state == "PUNISHMENT") {
            if (!p.penaltyDone) return Result.Rejected("Complete the penalty task first.")
            // Recovery log is recorded on today's row, even if today's row is MISSED/PENDING.
            dao.setDay(k, "RECOVERED", 0, System.currentTimeMillis())
            dao.save(p.copy(state = "NORMAL", missCount = 0, streak = 1, penaltyDone = false))
            dao.log(PunishmentEvent(at = System.currentTimeMillis(), type = "RECOVERED", note = k))
            return Result.Ok(0, false)
        }
        if (row.status != "PENDING") return Result.Rejected("Already logged today.")
        var xp = 0
        if (mode != "QUEUED") { val (x, np) = grantXp(p, honor = mode == "HONOR"); xp = x; p = np }
        dao.setDay(k, mode, xp, System.currentTimeMillis())
        val levelBefore = profile().level
        p = p.copy(streak = p.streak + 1); p = p.copy(bestStreak = maxOf(p.bestStreak, p.streak))
        p = unlockTitles(p); dao.save(p)
        dao.saveAttr((dao.attr(category) ?: Attr(category)).let { it.copy(points = it.points + 1) })
        return Result.Ok(xp, p.level > levelBefore)
    }

    /** A queued offline proof has now been verified: release held XP. */
    suspend fun releaseQueuedXp(dayKey: String) {
        val row = dao.day(dayKey) ?: return
        if (row.status != "QUEUED") return
        val (xp, p) = grantXp(profile(), honor = false)
        dao.setDay(dayKey, "VERIFIED", xp, row.loggedAt); dao.save(p)
    }

    suspend fun completeQuest(id: Long, now: Long = System.currentTimeMillis()) {
        val q = dao.quest(id) ?: return
        if (q.done || (q.expiresAt != null && now > q.expiresAt)) return
        dao.finishQuest(id)
        val p = profile()
        if (q.kind == "PENALTY") dao.save(p.copy(penaltyDone = true)) else dao.save(grantRaw(p, q.xp))
    }

    /** Blocker disabled or killed during punishment: today is permanently failed. */
    suspend fun markTampered(now: ZonedDateTime = ZonedDateTime.now()) {
        if (profile().state != "PUNISHMENT") return
        val k = key(now.toLocalDate())
        dao.insertDay(DayLog(k, "PENDING", zoneId = now.zone.id))
        if (dao.day(k)?.status == "FAILED_PERMANENT") return
        dao.setDay(k, "FAILED_PERMANENT", 0, System.currentTimeMillis())
        dao.log(PunishmentEvent(at = System.currentTimeMillis(), type = "TAMPER", note = "blocker disabled during punishment"))
    }

    private fun multiplier(p: Profile, honor: Boolean) =
        if (honor) 1.0 else 1.0 + Progress.TITLE_BONUS * p.titles.split(",").count { it.isNotBlank() }
    private fun grantXp(p: Profile, honor: Boolean): Pair<Int, Profile> {
        val xp = (Progress.BASE_XP * multiplier(p, honor)).toInt(); return xp to grantRaw(p, xp)
    }
    private fun grantRaw(p: Profile, xp: Int): Profile {
        var total = p.xp + xp; var lvl = p.level
        while (total >= Progress.xpToNext(lvl)) { total -= Progress.xpToNext(lvl); lvl++ }
        return p.copy(xp = total, level = lvl)
    }
    private fun unlockTitles(p: Profile): Profile {
        val have = p.titles.split(",").filter { it.isNotBlank() }.toMutableSet()
        Progress.TITLES.filter { p.streak >= it.minStreak }.forEach { have += it.name }
        return p.copy(titles = have.joinToString(","))
    }
    sealed class Result {
        data class Ok(val xp: Int, val leveledUp: Boolean) : Result()
        data class Rejected(val reason: String) : Result()
    }
}
