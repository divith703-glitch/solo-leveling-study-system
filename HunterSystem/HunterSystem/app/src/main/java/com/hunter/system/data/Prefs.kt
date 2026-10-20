package com.hunter.system.data

import android.content.Context
import java.time.LocalTime

/** Local config. API keys live here only (entered by the user in Settings), never in source. */
class Prefs(c: Context) {
    private val sp = c.applicationContext.getSharedPreferences("config", Context.MODE_PRIVATE)
    var taskName: String get() = sp.getString("task", "Workout")!!; set(v) = sp.edit().putString("task", v).apply()
    var category: String get() = sp.getString("cat", "STR")!!; set(v) = sp.edit().putString("cat", v).apply()
    var deadline: LocalTime get() = LocalTime.parse(sp.getString("deadline", "23:00")!!); set(v) = sp.edit().putString("deadline", v.toString()).apply()
    var reminder: LocalTime get() = LocalTime.parse(sp.getString("reminder", "18:00")!!); set(v) = sp.edit().putString("reminder", v.toString()).apply()
    var timerMinutes: Int get() = sp.getInt("timerMin", 30); set(v) = sp.edit().putInt("timerMin", v).apply()
    var geminiKey: String get() = sp.getString("gemini", "")!!; set(v) = sp.edit().putString("gemini", v).apply()
    var geminiModel: String get() = sp.getString("gmodel", "gemini-2.0-flash")!!; set(v) = sp.edit().putString("gmodel", v).apply()
    var groqKey: String get() = sp.getString("groq", "")!!; set(v) = sp.edit().putString("groq", v).apply()
    var groqModel: String get() = sp.getString("qmodel", "meta-llama/llama-4-scout-17b-16e-instruct")!!; set(v) = sp.edit().putString("qmodel", v).apply()
    var blocked: Set<String> get() = sp.getStringSet("blocked", DEFAULT_BLOCKED)!!.toSet(); set(v) = sp.edit().putStringSet("blocked", v).apply()
    var essential: Set<String> get() = sp.getStringSet("essential", emptySet())!!.toSet(); set(v) = sp.edit().putStringSet("essential", v).apply()
    var settingsUnlockedUntil: Long get() = sp.getLong("setUnlock", 0); set(v) = sp.edit().putLong("setUnlock", v).apply()
    var blockerEverEnabled: Boolean get() = sp.getBoolean("everOn", false); set(v) = sp.edit().putBoolean("everOn", v).apply()
    fun failCount(day: String) = sp.getInt("fail_$day", 0)
    fun setFailCount(day: String, n: Int) = sp.edit().putInt("fail_$day", n).apply()

    companion object {
        val DEFAULT_BLOCKED = setOf(
            "com.instagram.android", "com.reddit.frontpage", "com.whatsapp", "com.google.android.youtube",
            "com.zhiliaoapp.musically", "com.ss.android.ugc.trill", "com.twitter.android", "com.android.chrome",
        )
    }
}
