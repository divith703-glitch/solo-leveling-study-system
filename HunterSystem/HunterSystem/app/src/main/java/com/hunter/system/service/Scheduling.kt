package com.hunter.system.service

import android.app.*
import android.content.*
import androidx.core.app.NotificationCompat
import androidx.work.*
import com.hunter.system.data.HunterDb
import com.hunter.system.data.Prefs
import com.hunter.system.domain.PunishmentEngine
import com.hunter.system.verify.*
import kotlinx.coroutines.*
import java.io.File
import java.time.*
import java.util.concurrent.TimeUnit

object Scheduler {
    const val REMINDER = "reminder"; const val WARNING = "warning"; const val DEADLINE = "deadline"

    /** Re-arm alarms from the CURRENT zone. Call on boot, tz/time change, settings change, and after each alarm fires. */
    fun arm(c: Context) {
        val p = Prefs(c); val now = ZonedDateTime.now()
        set(c, REMINDER, next(now, p.reminder))
        set(c, WARNING, next(now, p.deadline.minusHours(1)))
        set(c, DEADLINE, next(now, p.deadline))
        WorkManager.getInstance(c).enqueueUniquePeriodicWork("maintenance", ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<MaintenanceWorker>(6, TimeUnit.HOURS)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build())
    }
    private fun next(now: ZonedDateTime, t: LocalTime): Long {
        var z = now.with(t).withSecond(0).withNano(0); if (!z.isAfter(now)) z = z.plusDays(1); return z.toInstant().toEpochMilli()
    }
    private fun set(c: Context, kind: String, at: Long) {
        val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = PendingIntent.getBroadcast(c, kind.hashCode(), Intent(c, AlarmReceiver::class.java).putExtra("kind", kind),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        if (android.os.Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
    }
    fun notify(c: Context, title: String, text: String) {
        val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(NotificationChannel("system", "System", NotificationManager.IMPORTANCE_HIGH))
        nm.notify(title.hashCode(), NotificationCompat.Builder(c, "system").setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title).setContentText(text).setAutoCancel(true).build())
    }
}

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        val pr = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            val dao = HunterDb.get(c).dao()
            when (i.getStringExtra("kind")) {
                Scheduler.REMINDER -> Scheduler.notify(c, "DAILY QUEST", "Your quest is available. Complete it before the deadline.")
                Scheduler.WARNING -> Scheduler.notify(c, "⚠️ QUEST EXPIRES SOON", "One hour remaining.")
                Scheduler.DEADLINE -> {
                    PunishmentEngine(dao, Prefs(c)).reconcile()
                    if (dao.profileNow()?.state == "PUNISHMENT") Scheduler.notify(c, "STREAK BROKEN", "Consequence active. Complete the Recovery Quest to restore access.")
                }
            }
            Scheduler.arm(c); pr.finish()
        }
    }
}

/** Boot, timezone change, clock change, app update: reconcile + re-arm. Covers reboot mid-punishment. */
class SystemEventReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        val pr = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            PunishmentEngine(HunterDb.get(c).dao(), Prefs(c)).reconcile(); Scheduler.arm(c); pr.finish()
        }
    }
}

/** Retries queued offline proofs and deletes proof photos older than 7 days (hash rows are kept for anti-reuse). */
class MaintenanceWorker(c: Context, p: WorkerParameters) : CoroutineWorker(c, p) {
    override suspend fun doWork(): Result {
        val dao = HunterDb.get(applicationContext).dao(); val prefs = Prefs(applicationContext)
        val engine = PunishmentEngine(dao, prefs); val verifier = PhotoVerifier(prefs)
        for (q in dao.queuedProofs()) {
            if (!File(q.path).exists()) continue
            when (verifier.verify(Photo.compress(q.path), prefs.taskName)) {
                is Verdict.Verified -> { dao.setProof(q.id, "VERIFIED"); engine.releaseQueuedXp(q.dayKey) }
                is Verdict.Rejected -> { dao.setProof(q.id, "REJECTED"); Scheduler.notify(applicationContext, "PROOF REJECTED", "Re-submit proof or use honor mode.") }
                Verdict.Unavailable -> return Result.retry()
            }
        }
        val cutoff = System.currentTimeMillis() - 7L * 24 * 3600 * 1000
        dao.oldProofs(cutoff).filter { it.state != "QUEUED" }.forEach { File(it.path).delete() }
        return Result.success()
    }
}
