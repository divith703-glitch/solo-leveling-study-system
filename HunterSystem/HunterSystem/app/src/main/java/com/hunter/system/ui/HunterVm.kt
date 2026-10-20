package com.hunter.system.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.hunter.system.data.*
import com.hunter.system.domain.PunishmentEngine
import com.hunter.system.verify.*
import com.hunter.system.service.BlockerService
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.io.File
import java.time.LocalDate

class HunterVm(app: Application) : AndroidViewModel(app) {
    val dao = HunterDb.get(app).dao()
    val prefs = Prefs(app)
    private val engine = PunishmentEngine(dao, prefs)
    private val verifier = PhotoVerifier(prefs)
    private val today get() = LocalDate.now().toString()

    val profile = dao.profile().stateIn(viewModelScope, SharingStarted.Eagerly, null)
    val attrs = dao.attrs().stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())
    val history = dao.history().stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())
    val quests = dao.quests(today).stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())
    val message = MutableStateFlow("")
    val levelUp = MutableStateFlow(false)
    val honorOffered = MutableStateFlow(false)

    init { viewModelScope.launch { engine.reconcile(); ensurePenaltyQuest(); checkBlocker() } }

    /** Punishment active, blocker was once enabled, but is now off in system settings (e.g. after force-stop + disable) = tamper. */
    private suspend fun checkBlocker() {
        if (dao.profileNow()?.state == "PUNISHMENT" && prefs.blockerEverEnabled && !BlockerService.isEnabled(getApplication())) engine.markTampered()
    }

    private suspend fun ensurePenaltyQuest() {
        if (dao.profileNow()?.state == "PUNISHMENT" && quests.value.none { it.kind == "PENALTY" })
            dao.addQuest(Quest(kind = "PENALTY", title = "Recovery: 50 squats, then log your missed task", xp = 0, dayKey = today))
    }

    /** lat/lng only used for offline queue tagging. */
    fun submitPhoto(path: String, lat: Double?, lng: Double?) = viewModelScope.launch {
        val jpeg = Photo.compress(path); val hash = Photo.sha256(jpeg)
        if (dao.hashSeen(hash) > 0) { message.value = "REJECTED: this photo was already used."; return@launch }
        when (val v = verifier.verify(jpeg, prefs.taskName)) {
            Verdict.Verified -> { dao.addProof(PhotoProof(dayKey = today, path = path, sha256 = hash, takenAt = System.currentTimeMillis(), lat = lat, lng = lng, state = "VERIFIED")); finish("VERIFIED") }
            is Verdict.Rejected -> {
                val n = prefs.failCount(today) + 1; prefs.setFailCount(today, n)
                message.value = "NOT VERIFIED: ${v.reason} ($n/3)"; honorOffered.value = n >= 3
            }
            Verdict.Unavailable -> {   // offline: stamp + queue; streak safe, XP held
                dao.addProof(PhotoProof(dayKey = today, path = path, sha256 = hash, takenAt = System.currentTimeMillis(), lat = lat, lng = lng, state = "QUEUED"))
                finish("QUEUED"); message.value = "OFFLINE: proof queued. Streak safe, XP held until verified."
            }
        }
    }
    fun honorMode() = viewModelScope.launch { finish("HONOR") }
    fun timerComplete() = viewModelScope.launch { finish("VERIFIED") }

    private suspend fun finish(mode: String) {
        when (val r = engine.completeDaily(mode, prefs.category)) {
            is PunishmentEngine.Result.Ok -> { levelUp.value = r.leveledUp; if (mode != "QUEUED") message.value = "QUEST COMPLETE  +${r.xp} XP" }
            is PunishmentEngine.Result.Rejected -> message.value = r.reason.uppercase()
        }
    }
    fun addBonus(title: String, xp: Int) = viewModelScope.launch { dao.addQuest(Quest(kind = "BONUS", title = title, xp = xp, dayKey = today)) }
    fun emergency() = viewModelScope.launch {
        val e = listOf("Complete 50 push-ups in the next 20 minutes" to 300, "Hold a 3-minute plank in the next 20 minutes" to 300)
        val (t, xp) = e.random()
        dao.addQuest(Quest(kind = "EMERGENCY", title = "$t (3x XP)", xp = xp, expiresAt = System.currentTimeMillis() + 20 * 60_000, dayKey = today))
    }
    fun complete(id: Long) = viewModelScope.launch { engine.completeQuest(id); ensurePenaltyQuest() }
    fun newFile(): File = File(getApplication<Application>().filesDir, "proofs").apply { mkdirs() }.let { File(it, "p_${System.currentTimeMillis()}.jpg") }
}
