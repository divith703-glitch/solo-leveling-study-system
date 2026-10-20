package com.hunter.system.domain

import kotlin.math.pow
import kotlin.math.sqrt

object Progress {
    const val BASE_XP = 100
    fun xpToNext(level: Int): Long = (100 * level.toDouble().pow(1.5)).toLong()

    /** Rank from CURRENT streak and total level, so losing a streak lowers rank. */
    fun rank(level: Int, streak: Int): String = when {
        level >= 50 && streak >= 90 -> "S"
        level >= 35 && streak >= 60 -> "A"
        level >= 20 && streak >= 30 -> "B"
        level >= 10 && streak >= 14 -> "C"
        level >= 5 && streak >= 7 -> "D"
        else -> "E"
    }
    data class Title(val name: String, val minStreak: Int)
    val TITLES = listOf(Title("First Step", 7), Title("Unbreakable", 30), Title("The Persisting One", 90))
    const val TITLE_BONUS = 0.02   // +2% XP per title, permanent
    fun attrLevel(points: Int) = sqrt(points.toDouble()).toInt() + 1
}
