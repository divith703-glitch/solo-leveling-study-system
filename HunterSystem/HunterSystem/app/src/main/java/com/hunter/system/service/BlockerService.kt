package com.hunter.system.service

import android.accessibilityservice.AccessibilityService
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.provider.Telephony
import android.telecom.TelecomManager
import android.view.accessibility.AccessibilityEvent
import com.hunter.system.data.HunterDb
import com.hunter.system.data.Prefs
import com.hunter.system.domain.PunishmentEngine
import com.hunter.system.ui.BlockActivity
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collectLatest

/**
 * Foreground detector. Primary signal: accessibility window events. Redundant signal: UsageStats poll
 * (catches missed events). Android re-binds enabled accessibility services after process death and reboot.
 */
class BlockerService : AccessibilityService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private lateinit var prefs: Prefs
    @Volatile private var punishment = false
    private val handler = Handler(Looper.getMainLooper())
    private var lastPkg = ""; private var lastAt = 0L

    override fun onServiceConnected() {
        instance = this
        prefs = Prefs(this); prefs.blockerEverEnabled = true
        val dao = HunterDb.get(this).dao()
        scope.launch { dao.profile().collectLatest { punishment = it?.state == "PUNISHMENT" } }
        scope.launch { PunishmentEngine(dao, prefs).reconcile() }
        poll()
    }

    private fun poll() {
        if (punishment) usageForeground()?.let { handle(it) }
        handler.postDelayed({ poll() }, 1500)
    }

    override fun onAccessibilityEvent(e: AccessibilityEvent) {
        if (e.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) e.packageName?.toString()?.let { handle(it) }
    }

    private fun handle(pkg: String) {
        if (!punishment || pkg == packageName || pkg in alwaysAllowed() || pkg in prefs.essential) return
        if (pkg in SETTINGS_PKGS) {      // documented tradeoff: timed delay gate, not a hard block
            if (System.currentTimeMillis() >= prefs.settingsUnlockedUntil) cover(BlockActivity.MODE_SETTINGS_DELAY, pkg)
            return
        }
        if (pkg in prefs.blocked) cover(BlockActivity.MODE_BLOCKED, pkg)
    }

    private fun cover(mode: String, pkg: String) {
        val now = System.currentTimeMillis()
        if (pkg == lastPkg && now - lastAt < 800) return
        lastPkg = pkg; lastAt = now
        performGlobalAction(GLOBAL_ACTION_HOME)
        startActivity(Intent(this, BlockActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(BlockActivity.EXTRA_MODE, mode).putExtra(BlockActivity.EXTRA_PKG, pkg))
    }

    /** Never blocked under any circumstances: dialer, SMS, emergency, system UI, launcher. */
    private fun alwaysAllowed(): Set<String> {
        val s = mutableSetOf("com.android.systemui", "com.android.emergency", "com.google.android.apps.safetyhub")
        (getSystemService(Context.TELECOM_SERVICE) as TelecomManager).defaultDialerPackage?.let { s += it }
        Telephony.Sms.getDefaultSmsPackage(this)?.let { s += it }
        packageManager.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)?.activityInfo?.packageName?.let { s += it }
        return s
    }

    private fun usageForeground(): String? = try {
        val um = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis(); val ev = um.queryEvents(now - 5000, now); val e = UsageEvents.Event(); var last: String? = null
        while (ev.hasNextEvent()) { ev.getNextEvent(e); if (e.eventType == UsageEvents.Event.ACTIVITY_RESUMED) last = e.packageName }
        last
    } catch (t: Throwable) { null }

    /** Unbind during PUNISHMENT = force-disable. Day is marked failed permanently. */
    override fun onUnbind(intent: Intent?): Boolean {
        instance = null
        if (punishment) runBlocking(Dispatchers.IO) { PunishmentEngine(HunterDb.get(applicationContext).dao(), Prefs(applicationContext)).markTampered() }
        return super.onUnbind(intent)
    }
    override fun onInterrupt() {}
    override fun onDestroy() { handler.removeCallbacksAndMessages(null); scope.cancel(); super.onDestroy() }

    companion object {
        @Volatile var instance: BlockerService? = null
        val SETTINGS_PKGS = setOf("com.android.settings", "com.samsung.android.settings", "com.miui.securitycenter", "com.coloros.settings")
        /** True if the blocker is switched on in system Accessibility settings (works even when our process is dead). */
        fun isEnabled(c: Context): Boolean {
            val s = android.provider.Settings.Secure.getString(c.contentResolver, android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
            val cn = android.content.ComponentName(c, BlockerService::class.java)
            return s.contains(cn.flattenToString()) || s.contains(cn.flattenToShortString())
        }
    }
}
