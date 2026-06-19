package com.example.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface UserProfileDao {
    @Query("SELECT * FROM user_profiles WHERE email = :email LIMIT 1")
    fun getUserProfileFlow(email: String = "user@demo.com"): Flow<UserProfileEntity?>

    @Query("SELECT * FROM user_profiles WHERE email = :email LIMIT 1")
    suspend fun getUserProfileDirect(email: String = "user@demo.com"): UserProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUserProfile(profile: UserProfileEntity)

    @Query("UPDATE user_profiles SET coinBalance = :newBalance WHERE email = :email")
    suspend fun updateCoinBalance(email: String, newBalance: Int)

    @Query("UPDATE user_profiles SET coinBalance = coinBalance + :amount WHERE email = :email")
    suspend fun addCoins(email: String, amount: Int)
}

@Dao
interface FavoriteDramaDao {
    @Query("SELECT * FROM favorite_dramas")
    fun getAllFavoritesFlow(): Flow<List<FavoriteDramaEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFavorite(favorite: FavoriteDramaEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFavorites(favorites: List<FavoriteDramaEntity>)

    @Delete
    suspend fun deleteFavorite(favorite: FavoriteDramaEntity)

    @Query("DELETE FROM favorite_dramas")
    suspend fun clearFavorites()

    @Query("SELECT EXISTS(SELECT 1 FROM favorite_dramas WHERE dramaId = :dramaId LIMIT 1)")
    fun isFavoriteFlow(dramaId: String): Flow<Boolean>
}

@Dao
interface UnlockedEpisodeDao {
    @Query("SELECT * FROM unlocked_episodes")
    fun getAllUnlockedFlow(): Flow<List<UnlockedEpisodeEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUnlock(unlocked: UnlockedEpisodeEntity)

    @Query("SELECT EXISTS(SELECT 1 FROM unlocked_episodes WHERE compositeKey = :compositeKey LIMIT 1)")
    suspend fun isUnlockedDirect(compositeKey: String): Boolean
}
