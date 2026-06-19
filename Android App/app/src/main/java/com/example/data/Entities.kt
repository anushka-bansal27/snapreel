package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "user_profiles")
data class UserProfileEntity(
    @PrimaryKey val email: String = "user@demo.com",
    val username: String = "Demo User",
    val coinBalance: Int = 150,
    val checkInStreak: Int = 0,
    val lastCheckInDate: String = "",
    val uid: String = "",
    val publicId: String = "",
    val photoURL: String = "",
    val isVip: Boolean = false,
    val vipExpiry: String = "",
    val todayAdCount: Int = 0,
    val referralCode: String = "",
    val referralCount: Int = 0,
    val referralEarnings: Int = 0,
    val referredBy: String = ""
)

@Entity(tableName = "favorite_dramas")
data class FavoriteDramaEntity(
    @PrimaryKey val dramaId: String
)

@Entity(tableName = "unlocked_episodes")
data class UnlockedEpisodeEntity(
    @PrimaryKey val compositeKey: String // Format: "dramaId_episodeNumber"
)
