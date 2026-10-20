package com.hunter.system.ui

import android.Manifest
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hunter.system.data.Profile
import com.hunter.system.domain.Progress
import com.hunter.system.service.BlockerService
import com.hunter.system.service.Scheduler
import kotlinx.coroutines.delay
import java.io.File
import java.time.LocalTime

val Red = Color(0xFFD50000); val Ink = Color(0xFF05060A); val Blue = Color(0xFF4FC3F7)

class MainActivity : ComponentActivity() {
    private val notifPerm = registerForActivityResult(ActivityResultContracts.RequestPermission()) {}
    override fun onCreate(s: Bundle?) {
        super.onCreate(s)
        if (Build.VERSION.SDK_INT >= 33) notifPerm.launch(Manifest.permission.POST_NOTIFICATIONS)
        Scheduler.arm(this)
        setContent { MaterialTheme(colorScheme = darkColorScheme(primary = Blue, background = Ink, surface = Ink)) { Surface(Modifier.fillMaxSize(), color = Ink) { HunterApp() } } }
    }
}

@Composable fun HunterApp(vm: HunterVm = viewModel()) {
    val p by vm.profile.collectAsState(); val up by vm.levelUp.collectAsState()
    var tab by remember { mutableStateOf(0) }
    val punished = p?.state == "PUNISHMENT"
    Column(Modifier.fillMaxSize().background(if (punished) Color(0xFF120000) else Ink).statusBarsPadding()) {
        Box(Modifier.weight(1f)) {
            when {
                tab == 3 -> SettingsScreen(vm, punished)
                punished -> PunishmentScreen(vm, p!!)
                tab == 0 -> StatusScreen(vm, p)
                tab == 1 -> DailyQuestScreen(vm)
                else -> QuestBoard(vm)
            }
        }
        NavigationBar(containerColor = Ink) {
            listOf("STATUS", "DAILY", "BOARD", "CONFIG").forEachIndexed { i, t ->
                NavigationBarItem(selected = tab == i, onClick = { tab = i }, icon = {}, label = { Text(t) })
            }
        }
    }
    if (up) AlertDialog(onDismissRequest = { vm.levelUp.value = false }, confirmButton = { TextButton({ vm.levelUp.value = false }) { Text("ACCEPT") } },
        containerColor = Ink, title = { Text("LEVEL UP!", color = Blue, fontSize = 34.sp, fontWeight = FontWeight.Black) },
        text = { Text("You have grown stronger. Level ${p?.level}", color = Color.White) })
}

@Composable fun SysBox(title: String, accent: Color = Blue, content: @Composable ColumnScope.() -> Unit) =
    Column(Modifier.fillMaxWidth().padding(12.dp).background(Color(0xFF0B1220)).padding(16.dp)) {
        Text("[ $title ]", color = accent, fontWeight = FontWeight.Bold, letterSpacing = 2.sp); Spacer(Modifier.height(8.dp)); content()
    }

@Composable fun StatusScreen(vm: HunterVm, p: Profile?) {
    val attrs by vm.attrs.collectAsState(); val hist by vm.history.collectAsState()
    p ?: return
    Column(Modifier.verticalScroll(rememberScrollState())) {
        SysBox("STATUS WINDOW") {
            Text("HUNTER RANK  ${Progress.rank(p.level, p.streak)}", color = Color.White, fontSize = 26.sp, fontWeight = FontWeight.Black)
            Text("LEVEL ${p.level}   STREAK ${p.streak}   BEST ${p.bestStreak}", color = Color.White)
            LinearProgressIndicator(progress = { (p.xp.toFloat() / Progress.xpToNext(p.level)).coerceIn(0f, 1f) }, Modifier.fillMaxWidth().padding(vertical = 8.dp))
            Text("XP ${p.xp} / ${Progress.xpToNext(p.level)}", color = Color.Gray)
        }
        SysBox("ATTRIBUTES") {
            listOf("STR", "AGI", "INT", "VIT").forEach { n -> Text("$n  ${Progress.attrLevel(attrs.firstOrNull { it.name == n }?.points ?: 0)}", color = Color.White) }
            Text("PER  ${Progress.attrLevel(p.streak)}  (streak consistency)", color = Color.White)
        }
        SysBox("TITLES") { Text(p.titles.ifBlank { "NONE UNLOCKED" }.replace(",", "  •  "), color = Color.White) }
        SysBox("STREAK HISTORY (IMMUTABLE)") { hist.take(14).forEach { Text("${it.dayKey}  ${it.status}${if (it.status == "HONOR") "  (honor)" else ""}", color = Color.Gray) } }
    }
}

@Composable fun DailyQuestScreen(vm: HunterVm) {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val msg by vm.message.collectAsState(); val honor by vm.honorOffered.collectAsState()
    var pending by remember { mutableStateOf<File?>(null) }
    val cam = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok -> if (ok) pending?.let { vm.submitPhoto(it.absolutePath, null, null) } }
    var secs by remember { mutableStateOf(-1) }
    LaunchedEffect(secs) { if (secs > 0) { delay(1000); secs-- } else if (secs == 0) { vm.timerComplete(); secs = -1 } }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("DAILY QUEST", color = Blue, fontSize = 22.sp, fontWeight = FontWeight.Black)
        Text("${vm.prefs.taskName}  |  deadline ${vm.prefs.deadline}", color = Color.White)
        Button(onClick = { val f = vm.newFile(); pending = f; cam.launch(FileProvider.getUriForFile(ctx, "${ctx.packageName}.files", f)) }, Modifier.fillMaxWidth()) { Text("CAPTURE PROOF") }
        OutlinedButton(onClick = { secs = vm.prefs.timerMinutes * 60 }, Modifier.fillMaxWidth()) {
            Text(if (secs > 0) "TIMER ${secs / 60}:${"%02d".format(secs % 60)}" else "START ${vm.prefs.timerMinutes}-MIN TIMER (fallback)")
        }
        if (honor) Button(onClick = { vm.honorMode() }, colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray), modifier = Modifier.fillMaxWidth()) { Text("HONOR MODE (logged visibly, no bonus)") }
        if (msg.isNotBlank()) Text(msg, color = Color.White)
    }
}

@Composable fun QuestBoard(vm: HunterVm) {
    val qs by vm.quests.collectAsState(); var title by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("QUEST BOARD", color = Blue, fontSize = 22.sp, fontWeight = FontWeight.Black)
        Row { OutlinedTextField(title, { title = it }, Modifier.weight(1f), label = { Text("Bonus quest") })
            Button({ if (title.isNotBlank()) { vm.addBonus(title, 20); title = "" } }) { Text("ADD") } }
        Button(vm::emergency) { Text("REQUEST EMERGENCY QUEST") }
        qs.filter { !(it.kind == "EMERGENCY" && !it.done && it.expiresAt != null && it.expiresAt < System.currentTimeMillis()) }.forEach { q -> Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("${q.kind}: ${q.title}  +${q.xp}", Modifier.weight(1f), color = if (q.done) Color.Gray else Color.White)
            if (!q.done) TextButton({ vm.complete(q.id) }) { Text("DONE") } } }
    }
}

@Composable fun PunishmentScreen(vm: HunterVm, p: Profile) {
    val qs by vm.quests.collectAsState(); val msg by vm.message.collectAsState()
    val ctx = androidx.compose.ui.platform.LocalContext.current
    var pending by remember { mutableStateOf<File?>(null) }
    val cam = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok -> if (ok) pending?.let { vm.submitPhoto(it.absolutePath, null, null) } }
    Column(Modifier.fillMaxSize().padding(20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("STREAK BROKEN", color = Red, fontSize = 38.sp, fontWeight = FontWeight.Black)
        Text("CONSEQUENCE ACTIVE", color = Red, fontSize = 22.sp, fontWeight = FontWeight.Bold, letterSpacing = 3.sp)
        Text("MISSED LOGS: ${p.missCount}   CURRENT STREAK: ${p.streak}", color = Color.White, fontWeight = FontWeight.Bold)
        SysBox("RECOVERY REQUIREMENT", Red) {
            Text("1. COMPLETE THE PENALTY TASK${if (p.penaltyDone) "  [DONE]" else ""}", color = Color.White)
            Text("2. LOG YOUR DAILY TASK (${vm.prefs.taskName.uppercase()}) WITH PHOTO PROOF", color = Color.White)
            Text("3. STREAK RESETS TO 1. BLOCKS LIFT AUTOMATICALLY.", color = Color.White)
        }
        qs.filter { it.kind == "PENALTY" && !it.done }.forEach { q -> Button({ vm.complete(q.id) }, colors = ButtonDefaults.buttonColors(containerColor = Red)) { Text("PENALTY DONE: ${q.title}") } }
        Button({ val f = vm.newFile(); pending = f; cam.launch(FileProvider.getUriForFile(ctx, "${ctx.packageName}.files", f)) }, enabled = p.penaltyDone) { Text("LOG DAILY TASK") }
        if (msg.isNotBlank()) Text(msg, color = Color.White)
        Text("Essential apps, calls and SMS remain available. You do not negotiate with the consequence. Complete the requirement.", color = Color.Gray)
    }
}

@Composable fun SettingsScreen(vm: HunterVm, punished: Boolean) {
    val ctx = androidx.compose.ui.platform.LocalContext.current; val pr = vm.prefs
    var task by remember { mutableStateOf(pr.taskName) }; var dl by remember { mutableStateOf(pr.deadline.toString()) }
    var gk by remember { mutableStateOf(pr.geminiKey) }; var qk by remember { mutableStateOf(pr.groqKey) }
    var extra by remember { mutableStateOf("") }
    var gateStart by rememberSaveable { mutableStateOf(0L) }; var sentence by remember { mutableStateOf("") }
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(gateStart) { while (gateStart > 0) { delay(1000); now = System.currentTimeMillis() } }
    Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("CONFIG", color = Blue, fontSize = 22.sp, fontWeight = FontWeight.Black)
        OutlinedTextField(task, { task = it }, label = { Text("Daily task") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(dl, { dl = it }, label = { Text("Deadline HH:mm (same-day)") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(gk, { gk = it }, label = { Text("AI Verification Key (Gemini, free at aistudio.google.com)") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(qk, { qk = it }, label = { Text("Fallback key (Groq, optional)") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(extra, { extra = it }, label = { Text("Add blocked/essential package id") }, modifier = Modifier.fillMaxWidth())
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button({ if (extra.isNotBlank()) { pr.blocked = pr.blocked + extra.trim(); extra = "" } }) { Text("BLOCK") }
            Button({ if (extra.isNotBlank()) { pr.essential = pr.essential + extra.trim(); extra = "" } }) { Text("ESSENTIAL") }
        }
        Button({ pr.taskName = task; runCatching { pr.deadline = LocalTime.parse(dl) }; pr.geminiKey = gk.trim(); pr.groqKey = qk.trim(); Scheduler.arm(ctx) }) { Text("SAVE") }
        OutlinedButton({ ctx.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }) { Text("ENABLE BLOCKER (Accessibility)") }
        OutlinedButton({ ctx.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)) }) { Text("GRANT USAGE ACCESS") }
        if (punished) {
            SysBox("DISABLE BLOCKER", Red) {
                Text("Disabling during punishment permanently fails today.", color = Color.White)
                if (gateStart == 0L) Button({ gateStart = System.currentTimeMillis(); now = gateStart }) { Text("BEGIN 5-MINUTE WARNING") }
                else if (now - gateStart < 300_000) Text("WAIT ${(300_000 - (now - gateStart)) / 1000}s", color = Red)
                else { OutlinedTextField(sentence, { sentence = it }, label = { Text("Type: I choose to break my streak") })
                    Button({ BlockerService.instance?.disableSelf() }, enabled = sentence.trim() == "I choose to break my streak") { Text("DISABLE") } }
            }
        }
    }
}
