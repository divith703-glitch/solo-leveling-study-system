package com.hunter.system.data

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "profile")
data class Profile(
    @PrimaryKey val id: Int = 1,
    val xp: Long = 0, val level: Int = 1,
    val streak: Int = 0, val bestStreak: Int = 0, val missCount: Int = 0,
    val state: String = "NORMAL",            // NORMAL | PUNISHMENT
    val penaltyDone: Boolean = false,
    val titles: String = "",                  // comma separated
    val lastReconciled: String = "",          // yyyy-MM-dd
)

/** One row per calendar day. Past rows are never edited by the UI; only the engine transitions status. */
@Entity(tableName = "day_log")
data class DayLog(
    @PrimaryKey val dayKey: String,
    val status: String,   // PENDING | VERIFIED | HONOR | QUEUED | MISSED | RECOVERED | FAILED_PERMANENT
    val xpAwarded: Int = 0, val loggedAt: Long? = null, val zoneId: String,
)

@Entity(tableName = "photo_proof", indices = [Index("sha256", unique = true)])
data class PhotoProof(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val dayKey: String, val path: String, val sha256: String, val takenAt: Long,
    val lat: Double?, val lng: Double?, val state: String, // QUEUED | VERIFIED | REJECTED
)

@Entity(tableName = "quest")
data class Quest(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val kind: String,     // BONUS | EMERGENCY | PENALTY
    val title: String, val xp: Int, val expiresAt: Long? = null,
    val done: Boolean = false, val dayKey: String,
)

@Entity(tableName = "attr") data class Attr(@PrimaryKey val name: String, val points: Int = 0)

@Entity(tableName = "punishment_event")
data class PunishmentEvent(@PrimaryKey(autoGenerate = true) val id: Long = 0, val at: Long, val type: String, val note: String)

@Dao interface HunterDao {
    @Query("SELECT * FROM profile WHERE id=1") fun profile(): Flow<Profile?>
    @Query("SELECT * FROM profile WHERE id=1") suspend fun profileNow(): Profile?
    @Upsert suspend fun save(p: Profile)

    @Query("SELECT * FROM day_log WHERE dayKey=:k") suspend fun day(k: String): DayLog?
    @Query("SELECT * FROM day_log ORDER BY dayKey DESC") fun history(): Flow<List<DayLog>>
    @Insert(onConflict = OnConflictStrategy.IGNORE) suspend fun insertDay(d: DayLog): Long
    @Query("UPDATE day_log SET status=:s, xpAwarded=:xp, loggedAt=:t WHERE dayKey=:k") suspend fun setDay(k: String, s: String, xp: Int, t: Long?)

    @Query("SELECT COUNT(*) FROM photo_proof WHERE sha256=:h") suspend fun hashSeen(h: String): Int
    @Insert suspend fun addProof(p: PhotoProof): Long
    @Query("SELECT * FROM photo_proof WHERE state='QUEUED'") suspend fun queuedProofs(): List<PhotoProof>
    @Query("UPDATE photo_proof SET state=:s WHERE id=:id") suspend fun setProof(id: Long, s: String)
    @Query("SELECT * FROM photo_proof WHERE takenAt < :cutoff") suspend fun oldProofs(cutoff: Long): List<PhotoProof>

    @Query("SELECT * FROM quest WHERE dayKey=:k ORDER BY id") fun quests(k: String): Flow<List<Quest>>
    @Insert suspend fun addQuest(q: Quest): Long
    @Query("UPDATE quest SET done=1 WHERE id=:id") suspend fun finishQuest(id: Long)
    @Query("SELECT * FROM quest WHERE id=:id") suspend fun quest(id: Long): Quest?

    @Query("SELECT * FROM attr") fun attrs(): Flow<List<Attr>>
    @Query("SELECT * FROM attr WHERE name=:n") suspend fun attr(n: String): Attr?
    @Upsert suspend fun saveAttr(a: Attr)

    @Insert suspend fun log(e: PunishmentEvent)
}

@Database(entities = [Profile::class, DayLog::class, PhotoProof::class, Quest::class, Attr::class, PunishmentEvent::class], version = 1, exportSchema = false)
abstract class HunterDb : RoomDatabase() {
    abstract fun dao(): HunterDao
    companion object {
        @Volatile private var i: HunterDb? = null
        fun get(c: Context) = i ?: synchronized(this) {
            i ?: Room.databaseBuilder(c.applicationContext, HunterDb::class.java, "hunter.db").build().also { i = it }
        }
    }
}
