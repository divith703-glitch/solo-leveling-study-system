package com.hunter.system.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hunter.system.data.Prefs
import kotlinx.coroutines.delay

/** Full-screen cover shown over a blocked app. Firm and unmistakable, never mocking. */
class BlockActivity : ComponentActivity() {
    override fun onCreate(s: Bundle?) {
        super.onCreate(s)
        val mode = intent.getStringExtra(EXTRA_MODE) ?: MODE_BLOCKED
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); finish() }
        })
        setContent { MaterialTheme(colorScheme = darkColorScheme()) { Column(Modifier.fillMaxSize().background(Color(0xFF0A0000)).padding(24.dp), Arrangement.Center, Alignment.CenterHorizontally) {
            if (mode == MODE_SETTINGS_DELAY) SettingsDelay() else {
                Text("STREAK BROKEN", color = Red, fontSize = 40.sp, fontWeight = FontWeight.Black)
                Text("CONSEQUENCE ACTIVE", color = Red, fontSize = 22.sp, letterSpacing = 3.sp)
                Spacer(Modifier.height(16.dp))
                Text("THIS APP IS LOCKED UNTIL YOUR RECOVERY QUEST IS COMPLETE.", color = Color.White)
                Spacer(Modifier.height(24.dp))
                Button({ startActivity(Intent(this@BlockActivity, MainActivity::class.java)); finish() }, colors = ButtonDefaults.buttonColors(containerColor = Red)) { Text("OPEN RECOVERY QUEST") }
            } } } }
    }

    @Composable private fun SettingsDelay() {
        var left by remember { mutableStateOf(60) }
        LaunchedEffect(left) { if (left > 0) { delay(1000); left-- } }
        Text("SETTINGS DELAY", color = Red, fontSize = 30.sp, fontWeight = FontWeight.Black)
        Text("Settings stays reachable for emergencies, after a timed delay.", color = Color.White)
        Spacer(Modifier.height(16.dp))
        Button({ Prefs(this).settingsUnlockedUntil = System.currentTimeMillis() + 5 * 60_000; finish() }, enabled = left == 0) { Text(if (left > 0) "WAIT ${left}s" else "CONTINUE (5 MIN)") }
    }
    companion object { const val EXTRA_MODE = "mode"; const val EXTRA_PKG = "pkg"; const val MODE_BLOCKED = "blocked"; const val MODE_SETTINGS_DELAY = "settings" }
}
