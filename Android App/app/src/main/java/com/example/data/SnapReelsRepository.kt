package com.example.data

import com.google.firebase.auth.FirebaseAuth
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flatMapLatest

class SnapReelsRepository(private val context: Context) {
private suspend fun getFirebaseIdToken(): String? = suspendCancellableCoroutine { continuation ->
        val user = FirebaseAuth.getInstance().currentUser
        if (user != null) {
            user.getIdToken(false).addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    continuation.resume(task.result?.token)
                } else {
                    continuation.resume(null)
                }
            }
        } else {
            continuation.resume(null)
        }
    }

    private val db = AppDatabase.getDatabase(context)
    private val profileDao = db.userProfileDao()
    private val favoriteDao = db.favoriteDramaDao()
    private val unlockedDao = db.unlockedEpisodeDao()

    private val _currentEmail = MutableStateFlow("")
    val currentEmail: StateFlow<String> = _currentEmail.asStateFlow()

    private val _claimedTaskIds = MutableStateFlow<Set<String>>(emptySet())
    val claimedTaskIds: StateFlow<Set<String>> = _claimedTaskIds.asStateFlow()

    private val _unlockedEpisodeIds = MutableStateFlow<Set<String>>(emptySet())

    private val _watchHistory = MutableStateFlow<List<WatchHistoryItem>>(emptyList())
    val watchHistory: StateFlow<List<WatchHistoryItem>> = _watchHistory.asStateFlow()

    private val _likedSeriesIds = MutableStateFlow<Set<String>>(emptySet())
    val likedSeriesIds: StateFlow<Set<String>> = _likedSeriesIds.asStateFlow()

    fun setCurrentEmail(email: String) {
        _currentEmail.value = email
        if (email.isEmpty()) {
            _claimedTaskIds.value = emptySet()
            _unlockedEpisodeIds.value = emptySet()
            _watchHistory.value = emptyList()
            _likedSeriesIds.value = emptySet()
        }
    }

    init {
        AppConfig.init(context)
        val prefs = context.getSharedPreferences("snapreels_rewards", Context.MODE_PRIVATE)
        val saved = prefs.getStringSet("claimed_tasks", emptySet()) ?: emptySet()
        if (saved.isNotEmpty()) {
            _claimedTaskIds.value = saved
        }
    }

    fun markTaskClaimedLocally(taskId: String) {
        val updated = _claimedTaskIds.value + taskId
        _claimedTaskIds.value = updated
        val prefs = context.getSharedPreferences("snapreels_rewards", Context.MODE_PRIVATE)
        prefs.edit().putStringSet("claimed_tasks", updated).apply()
    }

    suspend fun checkUserExistsInMongoDB(uid: String): Boolean {
        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val userUrl = AppConfig.API_URL.replace("/api/mobile/v1", "/api/user")
                val token = getFirebaseIdToken()
                val requestBuilder = Request.Builder()
                    .url("$userUrl/$uid")
                    .header("X-API-Key", AppConfig.API_KEY)
                if (token != null) {
                    requestBuilder.header("Authorization", "Bearer $token")
                }
                val request = requestBuilder.build()
                client.newCall(request).execute().use { response ->
                    response.isSuccessful
                }
            } catch (e: Exception) {
                false
            }
        }
    }

    suspend fun deleteAccount(uid: String, idToken: String): Pair<Boolean, String> {
        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val userUrl = AppConfig.API_URL.replace("/api/mobile/v1", "/api/user")
                val request = Request.Builder()
                    .url("$userUrl/$uid")
                    .delete()
                    .header("X-API-Key", AppConfig.API_KEY)
                    .header("Authorization", "Bearer $idToken")
                    .build()

                client.newCall(request).execute().use { response ->
                    val responseBody = response.body?.string().orEmpty()
                    if (!response.isSuccessful) {
                        val message = runCatching {
                            JSONObject(responseBody).optString("error", "Could not delete account.")
                        }.getOrDefault("Could not delete account.")
                        return@withContext false to message
                    }
                }

                db.clearAllTables()
                _currentEmail.value = ""
                _claimedTaskIds.value = emptySet()
                _unlockedEpisodeIds.value = emptySet()
                _watchHistory.value = emptyList()
                _likedSeriesIds.value = emptySet()
                true to "Account deleted permanently."
            } catch (e: Exception) {
                e.printStackTrace()
                false to (e.localizedMessage ?: "Could not delete account.")
            }
        }
    }

    suspend fun syncUserProfile(uid: String, email: String, displayName: String?, photoUrl: String?) {
        kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val userUrl = AppConfig.API_URL.replace("/api/mobile/v1", "/api/user")
                val token = getFirebaseIdToken()
                val requestBuilder = Request.Builder()
                    .url("$userUrl/$uid")
                    .header("X-API-Key", AppConfig.API_KEY)
                if (token != null) {
                    requestBuilder.header("Authorization", "Bearer $token")
                }
                val request = requestBuilder.build()
                var userObj: JSONObject? = null
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        userObj = JSONObject(response.body?.string() ?: "")
                    }
                }

                if (userObj != null) {
                    val coins = userObj!!.optInt("coins", 0)
                    val publicId = userObj!!.optString("publicId", "")
                    val name = userObj!!.optString("displayName", "")
                    val photo = userObj!!.optString("photoURL", "")
                    val isVip = userObj!!.optBoolean("isVip", false)
                    val vipExpiry = userObj!!.optString("vipExpiry", "")
                    val todayAdCount = userObj!!.optInt("todayAdCount", 0)
                    val referralCode = userObj!!.optString("referralCode", "")
                    val referralCount = userObj!!.optInt("referralCount", 0)
                    val referralEarnings = userObj!!.optInt("referralEarnings", 0)
                    val referredBy = userObj!!.optString("referredBy", "")

                    val claimedArr = userObj!!.optJSONArray("claimedTaskIds")
                    val claimedSet = mutableSetOf<String>()
                    if (claimedArr != null) {
                        for (i in 0 until claimedArr.length()) {
                            claimedSet.add(claimedArr.getString(i))
                        }
                    }
                    val prefs = context.getSharedPreferences("snapreels_rewards", Context.MODE_PRIVATE)
                    val localClaims = prefs.getStringSet("claimed_tasks", emptySet()) ?: emptySet()
                    val merged = claimedSet + localClaims
                    _claimedTaskIds.value = merged
                    prefs.edit().putStringSet("claimed_tasks", merged).apply()

                    val unlockedArr = userObj!!.optJSONArray("unlockedEpisodeIds")
                    val unlockedSet = mutableSetOf<String>()
                    if (unlockedArr != null) {
                        for (i in 0 until unlockedArr.length()) {
                            unlockedSet.add(unlockedArr.getString(i))
                        }
                    }
                    _unlockedEpisodeIds.value = unlockedSet

                    val local = profileDao.getUserProfileDirect(email)
                    if (local != null) {
                        profileDao.insertUserProfile(
                            local.copy(
                                username = name.takeIf { it.isNotEmpty() } ?: local.username,
                                coinBalance = coins,
                                uid = uid,
                                publicId = publicId,
                                photoURL = photo.takeIf { it.isNotEmpty() } ?: local.photoURL,
                                isVip = isVip,
                                vipExpiry = vipExpiry,
                                todayAdCount = todayAdCount,
                                referralCode = referralCode.takeIf { it.isNotEmpty() } ?: local.referralCode,
                                referralCount = referralCount,
                                referralEarnings = referralEarnings,
                                referredBy = referredBy.takeIf { it.isNotEmpty() } ?: local.referredBy
                            )
                        )
                    } else {
                        profileDao.insertUserProfile(
                            UserProfileEntity(
                                email = email,
                                username = name.takeIf { it.isNotEmpty() } ?: email.substringBefore("@"),
                                coinBalance = coins,
                                uid = uid,
                                publicId = publicId,
                                photoURL = photo,
                                isVip = isVip,
                                vipExpiry = vipExpiry,
                                todayAdCount = todayAdCount,
                                referralCode = referralCode,
                                referralCount = referralCount,
                                referralEarnings = referralEarnings,
                                referredBy = referredBy
                            )
                        )
                    }
                } else {
                    val createUrl = AppConfig.API_URL.replace("/api/mobile/v1", "/api/user/create")
                    val createBodyObj = JSONObject().apply {
                        put("uid", uid)
                        put("email", email)
                        put("displayName", displayName ?: email.substringBefore("@"))
                        put("photoURL", photoUrl ?: "")
                    }
                    val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                    val body = okhttp3.RequestBody.create(mediaType, createBodyObj.toString())
                    val createReq = Request.Builder()
                        .url(createUrl)
                        .post(body)
                        .build()
                    client.newCall(createReq).execute().use { response ->
                        if (response.isSuccessful) {
                            val resObj = JSONObject(response.body?.string() ?: "")
                            val coins = resObj.optInt("coins", 0)
                            val publicId = resObj.optString("publicId", "")
                            profileDao.insertUserProfile(
                                UserProfileEntity(
                                    email = email,
                                    username = displayName ?: email.substringBefore("@"),
                                    coinBalance = coins,
                                    uid = uid,
                                    publicId = publicId
                                )
                            )
                        } else {
                            profileDao.insertUserProfile(
                                UserProfileEntity(
                                    email = email,
                                    username = displayName ?: email.substringBefore("@"),
                                    coinBalance = 150,
                                    uid = uid,
                                    publicId = ""
                                )
                            )
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                val local = profileDao.getUserProfileDirect(email)
                if (local == null) {
                    profileDao.insertUserProfile(
                        UserProfileEntity(
                            email = email,
                            username = displayName ?: email.substringBefore("@"),
                            coinBalance = 150,
                            uid = uid
                        )
                    )
                }
            }
        }
    }

    suspend fun syncLibrary(uid: String) {
        kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val userUrl = AppConfig.API_URL.replace("/api/mobile/v1", "/api/user")
                val request = Request.Builder()
                    .url("$userUrl/$uid/library")
                    .header("X-API-Key", AppConfig.API_KEY)
                    .build()
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@use
                    val obj = JSONObject(response.body?.string() ?: "")

                    val favorites = mutableListOf<FavoriteDramaEntity>()
                    val favoritesArr = obj.optJSONArray("favorites")
                    if (favoritesArr != null) {
                        for (i in 0 until favoritesArr.length()) {
                            val seriesId = favoritesArr.getJSONObject(i).optString("seriesId", "")
                            if (seriesId.isNotEmpty()) favorites.add(FavoriteDramaEntity(seriesId))
                        }
                    }
                    favoriteDao.clearFavorites()
                    if (favorites.isNotEmpty()) favoriteDao.insertFavorites(favorites)

                    val history = mutableListOf<WatchHistoryItem>()
                    val historyArr = obj.optJSONArray("history")
                    if (historyArr != null) {
                        for (i in 0 until historyArr.length()) {
                            val item = historyArr.getJSONObject(i)
                            history.add(
                                WatchHistoryItem(
                                    seriesId = item.optString("seriesId", ""),
                                    episodeId = item.optString("episodeId", ""),
                                    episodeInSeason = item.optInt("episodeInSeason", 1),
                                    progress = item.optInt("progress", 0),
                                    watchedAt = item.optString("watchedAt", "")
                                )
                            )
                        }
                    }
                    _watchHistory.value = history.filter { it.seriesId.isNotEmpty() }

                    val likesArr = obj.optJSONArray("likedSeriesIds")
                    val likesSet = mutableSetOf<String>()
                    if (likesArr != null) {
                        for (i in 0 until likesArr.length()) {
                            likesSet.add(likesArr.getString(i))
                        }
                    }
                    _likedSeriesIds.value = likesSet
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private suspend fun postLibraryAction(uid: String, payload: JSONObject): Boolean {
        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val userUrl = AppConfig.API_URL.replace("/api/mobile/v1", "/api/user")
                val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                val body = okhttp3.RequestBody.create(mediaType, payload.toString())
                val request = Request.Builder()
                    .url("$userUrl/$uid/library")
                    .post(body)
                    .header("X-API-Key", AppConfig.API_KEY)
                    .build()
                client.newCall(request).execute().use { it.isSuccessful }
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }
    }

    suspend fun updateCoinsOnBackend(
        uid: String,
        email: String,
        newCoins: Int,
        txDesc: String? = null,
        txType: String? = null,
        txAmount: Int? = null
    ) {
        kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val userUrl = AppConfig.API_URL.replace("/api/mobile/v1", "/api/user")
                val patchBodyObj = JSONObject().apply {
                    put("coins", newCoins)
                    if (txDesc != null) put("transactionDescription", txDesc)
                    if (txType != null) put("transactionType", txType)
                    if (txAmount != null) put("transactionAmount", txAmount)
                }
                val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                val body = okhttp3.RequestBody.create(mediaType, patchBodyObj.toString())
                val token = getFirebaseIdToken()
                val requestBuilder = Request.Builder()
                    .url("$userUrl/$uid")
                    .patch(body)
                    .header("X-API-Key", AppConfig.API_KEY)
                if (token != null) {
                    requestBuilder.header("Authorization", "Bearer $token")
                }
                val request = requestBuilder.build()
                client.newCall(request).execute().use { response -> }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    suspend fun updateVipOnBackend(
        uid: String,
        email: String,
        isVip: Boolean,
        vipExpiry: String,
        txDesc: String? = null,
        txType: String? = null,
        txAmount: Int? = null
    ) {
        kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val userUrl = AppConfig.API_URL.replace("/api/mobile/v1", "/api/user")
                val patchBodyObj = JSONObject().apply {
                    put("isVip", isVip)
                    put("vipExpiry", vipExpiry)
                    if (txDesc != null) put("transactionDescription", txDesc)
                    if (txType != null) put("transactionType", txType)
                    if (txAmount != null) put("transactionAmount", txAmount)
                }
                val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                val body = okhttp3.RequestBody.create(mediaType, patchBodyObj.toString())
                val token = getFirebaseIdToken()
                val requestBuilder = Request.Builder()
                    .url("$userUrl/$uid")
                    .patch(body)
                    .header("X-API-Key", AppConfig.API_KEY)
                if (token != null) {
                    requestBuilder.header("Authorization", "Bearer $token")
                }
                val request = requestBuilder.build()
                client.newCall(request).execute().use { response -> }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    suspend fun getUserTransactions(uid: String, limit: Int): List<CoinTransaction> {
        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val userUrl = AppConfig.API_URL.replace("/api/mobile/v1", "/api/user")
                val request = Request.Builder()
                    .url("$userUrl/$uid/transactions?limit=$limit")
                    .header("x-api-key", AppConfig.API_KEY)
                    .build()
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@use emptyList()
                    val bodyString = response.body?.string() ?: ""
                    val array = JSONArray(bodyString)
                    val list = mutableListOf<CoinTransaction>()
                    for (i in 0 until array.length()) {
                        val obj = array.getJSONObject(i)
                        list.add(
                            CoinTransaction(
                                id = obj.getString("id"),
                                userId = obj.getString("userId"),
                                type = obj.getString("type"),
                                amount = obj.getInt("amount"),
                                description = obj.getString("description"),
                                createdAt = obj.getString("createdAt")
                            )
                        )
                    }
                    list
                }
            } catch (e: Exception) {
                e.printStackTrace()
                emptyList()
            }
        }
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .dispatcher(okhttp3.Dispatcher().apply {
            maxRequests = 64
            maxRequestsPerHost = 32
        })
        .build()

    private fun showToastOnMainThread(message: String) {
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context, message, Toast.LENGTH_LONG).show()
        }
    }

    private fun fetchFromApi(endpoint: String): String {
        val request = Request.Builder()
            .url(endpoint)
            .header("X-API-Key", AppConfig.API_KEY)
            .build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw Exception("Unexpected code $response")
            return response.body?.string() ?: ""
        }
    }

    fun parseSingleDramaJson(obj: JSONObject): Drama {
        val tagsList = mutableListOf<String>()
        val tagsArr = obj.optJSONArray("tags")
        if (tagsArr != null) {
            for (j in 0 until tagsArr.length()) {
                tagsList.add(tagsArr.getString(j))
            }
        }
        val genresList = mutableListOf<String>()
        val genresArr = obj.optJSONArray("genres")
        if (genresArr != null) {
            for (j in 0 until genresArr.length()) {
                genresList.add(genresArr.getString(j))
            }
        }
        return Drama(
            id = obj.optString("id", ""),
            title = obj.optString("title", ""),
            description = obj.optString("description", ""),
            coverUrl = obj.optString("coverUrl", ""),
            featuredCoverUrl = if (obj.has("featuredCoverUrl") && !obj.isNull("featuredCoverUrl") && obj.getString("featuredCoverUrl").isNotEmpty()) obj.getString("featuredCoverUrl") else null,
            category = obj.optString("category", "Drama"),
            genres = genresList,
            rating = obj.optDouble("rating", 4.8).toFloat(),
            totalEpisodes = obj.optInt("totalEpisodes", 10),
            releaseYear = obj.optInt("releaseYear", 2026),
            isTrending = obj.optBoolean("isTrending", false),
            tags = tagsList,
            slug = obj.optString("slug", ""),
            views = obj.optLong("views", 0L),
            likes = obj.optLong("likes", 0L),
            createdAtMillis = obj.optLong("createdAtMillis", 0L)
        )
    }

    private fun parseDramasJson(jsonString: String): List<Drama> {
        val list = mutableListOf<Drama>()
        if (jsonString.isBlank() || !jsonString.trim().startsWith("[")) return list
        val array = JSONArray(jsonString)
        for (i in 0 until array.length()) {
            list.add(parseSingleDramaJson(array.getJSONObject(i)))
        }
        return list
    }

    fun parseSingleEpisodeJson(obj: JSONObject): Episode {
        val base = AppConfig.API_URL.substringBefore("/api/mobile/v1").trimEnd('/')
        val subtitlesList = mutableListOf<SubtitleModel>()
        val subArray = obj.optJSONArray("subtitles")
        if (subArray != null) {
            for (j in 0 until subArray.length()) {
                val subObj = subArray.getJSONObject(j)
                var subUrl = subObj.optString("url", "").trim()
                if (subUrl.isNotBlank()) {
                    if (subUrl.startsWith("/")) {
                        subUrl = "$base$subUrl"
                    }
                    subtitlesList.add(
                        SubtitleModel(
                            language = subObj.optString("language", "English"),
                            languageCode = subObj.optString("languageCode", "en"),
                            url = subUrl
                        )
                    )
                }
            }
        }
        var rawVideoUrl = obj.optString("videoUrl", "").trim()
        if (rawVideoUrl.startsWith("/")) {
            rawVideoUrl = "$base$rawVideoUrl"
        }
        return Episode(
            id = obj.optString("id", ""),
            dramaId = obj.optString("dramaId", ""),
            title = obj.optString("title", "Episode"),
            episodeNumber = obj.optInt("episodeNumber", 1),
            videoUrl = rawVideoUrl,
            isPremium = obj.optBoolean("isPremium", false),
            coinCost = obj.optInt("coinCost", 0),
            durationSec = obj.optInt("durationSec", 0),
            subtitles = subtitlesList
        )
    }

    private fun parseEpisodesJson(jsonString: String): List<Episode> {
        val list = mutableListOf<Episode>()
        if (jsonString.isBlank() || !jsonString.trim().startsWith("[")) return list
        try {
            val array = JSONArray(jsonString)
            for (i in 0 until array.length()) {
                list.add(parseSingleEpisodeJson(array.getJSONObject(i)))
            }
        } catch (_: Exception) {}
        return list
    }

    fun parseShortsJson(jsonString: String): List<ShortItem> {
        val list = mutableListOf<ShortItem>()
        if (jsonString.isBlank() || !jsonString.trim().startsWith("[")) return list
        try {
            val array = JSONArray(jsonString)
            for (i in 0 until array.length()) {
                val itemObj = array.getJSONObject(i)
                val dramaObj = itemObj.optJSONObject("drama")
                val epObj = itemObj.optJSONObject("episode")
                if (dramaObj != null && epObj != null) {
                    try {
                        val drama = parseSingleDramaJson(dramaObj)
                        val episode = parseSingleEpisodeJson(epObj)
                        if (episode.videoUrl.isNotBlank()) {
                            list.add(ShortItem(drama, episode))
                        }
                    } catch (_: Exception) {}
                }
            }
        } catch (_: Exception) {}
        return list
    }

    fun serializeDrama(drama: Drama): JSONObject {
        return JSONObject().apply {
            put("id", drama.id)
            put("title", drama.title)
            put("description", drama.description)
            put("coverUrl", drama.coverUrl)
            put("featuredCoverUrl", drama.featuredCoverUrl ?: "")
            put("category", drama.category)
            put("genres", JSONArray(drama.genres))
            put("rating", drama.rating.toDouble())
            put("totalEpisodes", drama.totalEpisodes)
            put("releaseYear", drama.releaseYear)
            put("isTrending", drama.isTrending)
            put("tags", JSONArray(drama.tags))
            put("slug", drama.slug)
            put("views", drama.views)
            put("likes", drama.likes)
            put("createdAtMillis", drama.createdAtMillis)
        }
    }

    fun serializeEpisode(episode: Episode): JSONObject {
        val subsArr = JSONArray()
        for (s in episode.subtitles) {
            subsArr.put(JSONObject().apply {
                put("language", s.language)
                put("languageCode", s.languageCode)
                put("url", s.url)
            })
        }
        return JSONObject().apply {
            put("id", episode.id)
            put("dramaId", episode.dramaId)
            put("title", episode.title)
            put("episodeNumber", episode.episodeNumber)
            put("videoUrl", episode.videoUrl)
            put("isPremium", episode.isPremium)
            put("coinCost", episode.coinCost)
            put("durationSec", episode.durationSec)
            put("subtitles", subsArr)
        }
    }

    fun getShorts(): Flow<List<ShortItem>> = flow {
        val preferences = context.getSharedPreferences("snapreels_settings", Context.MODE_PRIVATE)
        val langCode = preferences.getString("language_code", "en") ?: "en"
        val cachePrefs = context.getSharedPreferences("snapreels_cache", Context.MODE_PRIVATE)
        val cachedJson = cachePrefs.getString("cached_shorts_$langCode", null)
        var hasEmittedCache = false
        if (!cachedJson.isNullOrBlank()) {
            try {
                val cached = parseShortsJson(cachedJson)
                if (cached.isNotEmpty()) {
                    emit(cached)
                    hasEmittedCache = true
                }
            } catch (_: Exception) {}
        }
        try {
            val response = fetchFromApi("${AppConfig.API_URL}/shorts?lang=$langCode")
            val items = parseShortsJson(response)
            if (items.isNotEmpty()) {
                cachePrefs.edit().putString("cached_shorts_$langCode", response).apply()
                emit(items)
            } else if (!hasEmittedCache) {
                emit(emptyList())
            }
        } catch (e: Exception) {
            if (!hasEmittedCache) emit(emptyList())
        }
    }.flowOn(Dispatchers.IO)

    fun getAllDramas(): Flow<List<Drama>> = flow {
        val preferences = context.getSharedPreferences("snapreels_settings", Context.MODE_PRIVATE)
        val langCode = preferences.getString("language_code", "en") ?: "en"
        val cachePrefs = context.getSharedPreferences("snapreels_cache", Context.MODE_PRIVATE)
        val cachedJson = cachePrefs.getString("cached_dramas_$langCode", null)
        var hasEmittedCache = false
        if (!cachedJson.isNullOrBlank()) {
            try {
                val cachedDramas = parseDramasJson(cachedJson)
                if (cachedDramas.isNotEmpty()) {
                    emit(cachedDramas)
                    hasEmittedCache = true
                }
            } catch (_: Exception) {}
        }
        try {
            val response = fetchFromApi("${AppConfig.API_URL}/series?lang=$langCode")
            val dramas = parseDramasJson(response)
            if (dramas.isNotEmpty()) {
                cachePrefs.edit().putString("cached_dramas_$langCode", response).apply()
            }
            emit(dramas)
        } catch (e: Exception) {
            e.printStackTrace()
            if (!hasEmittedCache) {
                // showToastOnMainThread("Check your internet connection or API keys")
                emit(emptyList())
            }
        }
    }.flowOn(Dispatchers.IO)

    suspend fun getDirectSeries(langCode: String): List<Drama> = kotlinx.coroutines.withContext(Dispatchers.IO) {
        val cachePrefs = context.getSharedPreferences("snapreels_cache", Context.MODE_PRIVATE)
        // 1. Try requested language
        if (langCode.isNotBlank()) {
            try {
                val response = fetchFromApi("${AppConfig.API_URL}/series?lang=$langCode")
                val list = parseDramasJson(response)
                if (list.isNotEmpty()) {
                    cachePrefs.edit().putString("cached_dramas_$langCode", response).apply()
                    return@withContext list
                }
            } catch (_: Exception) {}
        }
        // 2. Fallback to English if requested language returned empty
        if (langCode != "en") {
            try {
                val response = fetchFromApi("${AppConfig.API_URL}/series?lang=en")
                val list = parseDramasJson(response)
                if (list.isNotEmpty()) return@withContext list
            } catch (_: Exception) {}
        }
        // 3. Fallback to all series without language filter
        try {
            val response = fetchFromApi("${AppConfig.API_URL}/series")
            val list = parseDramasJson(response)
            if (list.isNotEmpty()) return@withContext list
        } catch (_: Exception) {}

        emptyList()
    }

    suspend fun getDirectEpisodes(dramaId: String): List<Episode> = kotlinx.coroutines.withContext(Dispatchers.IO) {
        val cachePrefs = context.getSharedPreferences("snapreels_cache", Context.MODE_PRIVATE)
        val cachedJson = cachePrefs.getString("cached_episodes_$dramaId", null)
        if (!cachedJson.isNullOrBlank()) {
            try {
                val cached = parseEpisodesJson(cachedJson)
                if (cached.isNotEmpty()) return@withContext cached
            } catch (_: Exception) {}
        }
        try {
            val response = fetchFromApi("${AppConfig.API_URL}/episodes?seriesId=$dramaId")
            val list = parseEpisodesJson(response)
            if (list.isNotEmpty()) {
                cachePrefs.edit().putString("cached_episodes_$dramaId", response).apply()
            }
            list
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun getEpisodesForDrama(dramaId: String): Flow<List<Episode>> = flow {
        val cachePrefs = context.getSharedPreferences("snapreels_cache", Context.MODE_PRIVATE)
        val cachedJson = cachePrefs.getString("cached_episodes_$dramaId", null)
        var hasEmittedCache = false
        if (!cachedJson.isNullOrBlank()) {
            try {
                val cached = parseEpisodesJson(cachedJson)
                if (cached.isNotEmpty()) {
                    emit(cached)
                    hasEmittedCache = true
                }
            } catch (_: Exception) {}
        }
        try {
            val response = fetchFromApi("${AppConfig.API_URL}/episodes?seriesId=$dramaId")
            val episodes = parseEpisodesJson(response)
            if (episodes.isNotEmpty()) {
                cachePrefs.edit().putString("cached_episodes_$dramaId", response).apply()
            }
            emit(episodes)
        } catch (e: Exception) {
            if (!hasEmittedCache) {
                emit(emptyList())
            }
        }
    }.flowOn(Dispatchers.IO)

    fun getHomepageCategories(): Flow<List<String>> = flow {
        val cachePrefs = context.getSharedPreferences("snapreels_cache", Context.MODE_PRIVATE)
        val cachedJson = cachePrefs.getString("cached_categories", null)
        if (!cachedJson.isNullOrBlank()) {
            try {
                val array = JSONArray(cachedJson)
                val list = mutableListOf<String>()
                for (i in 0 until array.length()) {
                    list.add(array.getString(i))
                }
                if (list.isNotEmpty()) emit(list)
            } catch (_: Exception) {}
        }
        try {
            val response = fetchFromApi("${AppConfig.API_URL}/categories")
            val array = JSONArray(response)
            val list = mutableListOf<String>()
            for (i in 0 until array.length()) {
                list.add(array.getString(i))
            }
            if (list.isNotEmpty()) {
                cachePrefs.edit().putString("cached_categories", response).apply()
            }
            emit(list)
        } catch (e: Exception) {
            emit(emptyList())
        }
    }.flowOn(Dispatchers.IO)

    suspend fun testServerConnection(): Boolean {
        return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url("${AppConfig.API_URL}/settings")
                    .header("X-API-Key", AppConfig.API_KEY)
                    .build()
                client.newCall(request).execute().use { response ->
                    response.isSuccessful
                }
            } catch (e: Exception) {
                false
            }
        }
    }

    suspend fun getAppSettings(): AppSettings {
        return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            try {
                val response = fetchFromApi("${AppConfig.API_URL}/settings")
                val obj = JSONObject(response)
                
                val packsList = mutableListOf<CoinPackModel>()
                val packsArr = obj.optJSONArray("coinPacks")
                if (packsArr != null) {
                    for (i in 0 until packsArr.length()) {
                        val packObj = packsArr.getJSONObject(i)
                        packsList.add(
                            CoinPackModel(
                                id = packObj.getString("id"),
                                name = packObj.optString("name", ""),
                                description = packObj.optString("description", ""),
                                amount = packObj.optInt("amount", 0),
                                price = packObj.optDouble("price", 0.0),
                                type = packObj.optString("type", "coins"),
                                googleProductId = packObj.optString("googleProductId", ""),
                                appleProductId = packObj.optString("appleProductId", "")
                            )
                        )
                    }
                }

                val dailyRewardsList = mutableListOf<Int>()
                val dailyRewardsArr = obj.optJSONArray("dailyRewards")
                if (dailyRewardsArr != null) {
                    for (i in 0 until dailyRewardsArr.length()) {
                        dailyRewardsList.add(dailyRewardsArr.getInt(i))
                    }
                }

                val tasksList = mutableListOf<RewardTaskModel>()
                val tasksArr = obj.optJSONArray("rewardTasks")
                if (tasksArr != null) {
                    for (i in 0 until tasksArr.length()) {
                        val taskObj = tasksArr.getJSONObject(i)
                        tasksList.add(
                            RewardTaskModel(
                                id = taskObj.getString("id"),
                                title = taskObj.getString("title"),
                                type = taskObj.optString("type", "link"),
                                coins = taskObj.optInt("coins", 0),
                                url = taskObj.optString("url", ""),
                                timerSeconds = taskObj.optInt("timerSeconds", 0),
                                frequency = taskObj.optString("frequency", "daily")
                            )
                        )
                    }
                }

                val languagesList = mutableListOf<LanguageModel>()
                val languagesArr = obj.optJSONArray("languages")
                if (languagesArr != null) {
                    for (i in 0 until languagesArr.length()) {
                        val language = languagesArr.getJSONObject(i)
                        languagesList.add(
                            LanguageModel(
                                id = language.optString("id", ""),
                                name = language.optString("name", ""),
                                languageCode = language.optString("languageCode", ""),
                                countryCode = language.optString("countryCode", "")
                            )
                        )
                    }
                }

                AppSettings(
                    siteUrl = obj.optString("siteUrl", ""),
                    emailLoginEnabled = obj.optBoolean("emailLoginEnabled", true),
                    googleLoginEnabled = obj.optBoolean("googleLoginEnabled", true),
                    facebookLoginEnabled = obj.optBoolean("facebookLoginEnabled", false),
                    appleLoginEnabled = obj.optBoolean("appleLoginEnabled", false),
                    phoneLoginEnabled = obj.optBoolean("phoneLoginEnabled", false),
                    stripeEnabled = obj.optBoolean("stripeEnabled", false),
                    paypalEnabled = obj.optBoolean("paypalEnabled", false),
                    razorpayEnabled = obj.optBoolean("razorpayEnabled", false),
                    flutterwaveEnabled = obj.optBoolean("flutterwaveEnabled", false),
                    phonepeEnabled = obj.optBoolean("phonepeEnabled", false),
                    cashfreeEnabled = obj.optBoolean("cashfreeEnabled", false),
                    payuEnabled = obj.optBoolean("payuEnabled", false),
                    googlePayEnabled = obj.optBoolean("googlePayEnabled", false),
                    currency = obj.optString("currency", "USD"),
                    currencySymbol = obj.optString("currencySymbol", "$"),
                    coinPacks = packsList,
                    rewardsEnabled = obj.optBoolean("rewardsEnabled", false),
                    dailyRewards = dailyRewardsList,
                    rewardTasks = tasksList,
                    referralEnabled = obj.optBoolean("referralEnabled", false),
                    referralRewardCoins = obj.optInt("referralRewardCoins", 50),
                    referredBonusCoins = obj.optInt("referredBonusCoins", 30),
                    privacyPolicyUrl = obj.optString("privacyPolicyUrl", ""),
                    termsOfServiceUrl = obj.optString("termsOfServiceUrl", ""),
                    rateUsUrl = obj.optString("rateUsUrl", ""),
                    updateUrl = obj.optString("updateUrl", ""),
                    versionCode = obj.optInt("versionCode", 1),
                    forceUpdateEnabled = obj.optBoolean("forceUpdateEnabled", false),
                    forceLoginEnabled = obj.optBoolean("forceLoginEnabled", false),
                    languages = languagesList,
                    adsProvider = obj.optString("adsProvider", "admob"),
                    admobBannerId = obj.optString("admobBannerId", ""),
                    admobBannerEnabled = obj.optBoolean("admobBannerEnabled", false),
                    admobInterstitialId = obj.optString("admobInterstitialId", ""),
                    admobInterstitialEnabled = obj.optBoolean("admobInterstitialEnabled", false),
                    admobRewardedId = obj.optString("admobRewardedId", ""),
                    admobRewardedEnabled = obj.optBoolean("admobRewardedEnabled", false),
                    admobRewardedLimit = obj.optInt("admobRewardedLimit", 5),
                    applovinSdkKey = obj.optString("applovinSdkKey", ""),
                    applovinBannerId = obj.optString("applovinBannerId", ""),
                    applovinBannerEnabled = obj.optBoolean("applovinBannerEnabled", false),
                    applovinInterstitialId = obj.optString("applovinInterstitialId", ""),
                    applovinInterstitialEnabled = obj.optBoolean("applovinInterstitialEnabled", false),
                    applovinRewardedId = obj.optString("applovinRewardedId", ""),
                    applovinRewardedEnabled = obj.optBoolean("applovinRewardedEnabled", false),
                    facebookBannerId = obj.optString("facebookBannerId", ""),
                    facebookBannerEnabled = obj.optBoolean("facebookBannerEnabled", false),
                    facebookInterstitialId = obj.optString("facebookInterstitialId", ""),
                    facebookInterstitialEnabled = obj.optBoolean("facebookInterstitialEnabled", false),
                    facebookRewardedId = obj.optString("facebookRewardedId", ""),
                    facebookRewardedEnabled = obj.optBoolean("facebookRewardedEnabled", false),
                    oneSignalAppId = obj.optString("oneSignalAppId", ""),
                    watermarkEnabled = obj.optBoolean("watermarkEnabled", false),
                    watermarkUrl = obj.optString("watermarkUrl", ""),
                    watermarkPosition = obj.optString("watermarkPosition", "top-right"),
                    watermarkOpacity = (obj.optDouble("watermarkOpacity", 80.0) / 100.0).toFloat(),
                    admobAppOpenId = obj.optString("admobAppOpenId", ""),
                    admobAppOpenEnabled = obj.optBoolean("admobAppOpenEnabled", false)
                )
            } catch (e: Exception) {
                e.printStackTrace()
                AppSettings()
            }
        }
    }

    // Favorite watchlist handlers
    val favoritesFlow: Flow<List<FavoriteDramaEntity>> = favoriteDao.getAllFavoritesFlow()

    suspend fun toggleFavorite(dramaId: String) {
        val composite = FavoriteDramaEntity(dramaId)
        val list = favoriteDao.getAllFavoritesFlow()
        // Simple write
        favoriteDao.insertFavorite(composite)
    }

    fun isFavorite(dramaId: String): Flow<Boolean> {
        return favoriteDao.isFavoriteFlow(dramaId)
    }

    suspend fun removeFavorite(dramaId: String) {
        favoriteDao.deleteFavorite(FavoriteDramaEntity(dramaId))
    }

    suspend fun addFavorite(dramaId: String) {
        favoriteDao.insertFavorite(FavoriteDramaEntity(dramaId))
    }

    suspend fun toggleFavoriteForUser(uid: String, dramaId: String): Boolean {
        val payload = JSONObject().apply {
            put("action", "toggleFavorite")
            put("seriesId", dramaId)
        }
        return postLibraryAction(uid, payload)
    }

    suspend fun toggleLike(uid: String, dramaId: String): Boolean {
        val payload = JSONObject().apply {
            put("action", "toggleLike")
            put("seriesId", dramaId)
        }
        val success = postLibraryAction(uid, payload)
        if (success) {
            val current = _likedSeriesIds.value.toMutableSet()
            if (current.contains(dramaId)) {
                current.remove(dramaId)
            } else {
                current.add(dramaId)
            }
            _likedSeriesIds.value = current
        }
        return success
    }

    suspend fun updateHistory(uid: String, seriesId: String, episode: Episode) {
        val item = WatchHistoryItem(
            seriesId = seriesId,
            episodeId = episode.id,
            episodeInSeason = episode.episodeNumber,
            watchedAt = Date().time.toString()
        )
        _watchHistory.value = listOf(item) + _watchHistory.value.filterNot { it.seriesId == seriesId }
        postLibraryAction(uid, JSONObject().apply {
            put("action", "updateHistory")
            put("seriesId", seriesId)
            put("episodeId", episode.id)
            put("episodeInSeason", episode.episodeNumber)
            put("progress", 0)
        })
    }

    suspend fun removeHistory(uid: String, seriesId: String) {
        if (postLibraryAction(uid, JSONObject().apply {
                put("action", "removeHistory")
                put("seriesId", seriesId)
            })) {
            _watchHistory.value = _watchHistory.value.filterNot { it.seriesId == seriesId }
        }
    }

    suspend fun clearHistory(uid: String) {
        if (postLibraryAction(uid, JSONObject().apply { put("action", "clearHistory") })) {
            _watchHistory.value = emptyList()
        }
    }

    // User Profile flow
    @OptIn(ExperimentalCoroutinesApi::class)
    val userProfile: Flow<UserProfileEntity?> = _currentEmail.flatMapLatest { email ->
        profileDao.getUserProfileFlow(email)
    }

    // Add Free Coins (reward actions like watching ad, following socials)
    suspend fun awardCoins(amount: Int, txDesc: String? = null, txType: String? = null) {
        val profile = profileDao.getUserProfileDirect(_currentEmail.value)
        if (profile != null) {
            val newCoins = profile.coinBalance + amount
            profileDao.updateCoinBalance(_currentEmail.value, newCoins)
            if (profile.uid.isNotEmpty()) {
                updateCoinsOnBackend(
                    profile.uid,
                    _currentEmail.value,
                    newCoins,
                    txDesc = txDesc ?: "Coins Purchased",
                    txType = txType ?: "purchase",
                    txAmount = amount
                )
            }
        } else {
            profileDao.addCoins(_currentEmail.value, amount)
        }
    }

    suspend fun awardVip(days: Int, txDesc: String? = null, txType: String? = null) {
        val profile = profileDao.getUserProfileDirect(_currentEmail.value)
        if (profile != null) {
            val calendar = java.util.Calendar.getInstance()
            val now = java.util.Date()
            var startDate = now
            val currentExpiryStr = profile.vipExpiry
            if (profile.isVip && !currentExpiryStr.isNullOrBlank() && currentExpiryStr != "null") {
                runCatching {
                    val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                    format.timeZone = java.util.TimeZone.getTimeZone("UTC")
                    val currentExpiry = format.parse(currentExpiryStr)
                    if (currentExpiry != null && currentExpiry.after(now)) {
                        startDate = currentExpiry
                    }
                }
            }
            calendar.time = startDate
            calendar.add(java.util.Calendar.DAY_OF_YEAR, days)
            val expiryString = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(calendar.time)
            
            profileDao.insertUserProfile(
                profile.copy(
                    isVip = true,
                    vipExpiry = expiryString
                )
            )
            if (profile.uid.isNotEmpty()) {
                updateVipOnBackend(
                    profile.uid,
                    _currentEmail.value,
                    isVip = true,
                    vipExpiry = expiryString,
                    txDesc = txDesc ?: "VIP Subscription Purchased",
                    txType = txType ?: "purchase",
                    txAmount = 0
                )
            }
        }
    }

    // Daily check-in system
    suspend fun performDailyCheckIn(): String {
        val email = _currentEmail.value
        val profile = profileDao.getUserProfileDirect(email) ?: return "Error: Profile not found!"
        if (profile.uid.isEmpty()) return "Error: User is not logged in!"

        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val userUrl = AppConfig.API_URL.replace("/api/mobile/v1", "/api/user")
                val token = getFirebaseIdToken()
                val requestBuilder = Request.Builder()
                    .url("$userUrl/${profile.uid}/checkin")
                    .post(okhttp3.RequestBody.create("application/json; charset=utf-8".toMediaTypeOrNull(), "{}"))
                    .header("X-API-Key", AppConfig.API_KEY)
                if (token != null) {
                    requestBuilder.header("Authorization", "Bearer $token")
                }
                val request = requestBuilder.build()
                client.newCall(request).execute().use { response ->
                    val responseBody = response.body?.string().orEmpty()
                    if (response.isSuccessful) {
                        val resObj = JSONObject(responseBody)
                        val reward = resObj.optInt("reward", 0)
                        val dayNum = resObj.optInt("dayNum", 1)
                        val updatedCoins = resObj.optInt("coins", profile.coinBalance)
                        
                        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                        val updated = profile.copy(
                            coinBalance = updatedCoins,
                            checkInStreak = dayNum,
                            lastCheckInDate = today
                        )
                        profileDao.insertUserProfile(updated)
                        "Day $dayNum Check-In successful! Secured +$reward Coin rewards."
                    } else {
                        val errMessage = try {
                            JSONObject(responseBody).optString("error", "Check-in failed.")
                        } catch (jsonEx: Exception) {
                            "Check-in failed (Server error: ${response.code}). Please ensure your backend code is uploaded and running."
                        }
                        errMessage
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                "Error: Network request failed."
            }
        }
    }

    // Premium unlock episode handler
    suspend fun isEpisodeUnlocked(episode: Episode): Boolean {
        if (!episode.isPremium) return true
        if (_unlockedEpisodeIds.value.contains(episode.id)) return true
        val key = "${episode.dramaId}_${episode.episodeNumber}"
        return unlockedDao.isUnlockedDirect(key)
    }

    suspend fun unlockEpisode(episode: Episode, method: String): Boolean {
        val profile = profileDao.getUserProfileDirect(_currentEmail.value) ?: return false
        if (profile.uid.isEmpty()) return false
        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val userUrl = AppConfig.API_URL.replace("/api/mobile/v1", "/api/user")
                val payload = JSONObject().apply {
                    put("seriesId", episode.dramaId)
                    put("episodeId", episode.id)
                    put("episodeNumber", episode.episodeNumber)
                    put("method", method)
                    put("cost", episode.coinCost)
                }
                val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                val body = okhttp3.RequestBody.create(mediaType, payload.toString())
                val request = Request.Builder()
                    .url("$userUrl/${profile.uid}/unlock")
                    .post(body)
                    .header("X-API-Key", AppConfig.API_KEY)
                    .build()
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@use false
                    val result = JSONObject(response.body?.string() ?: "")
                    val key = "${episode.dramaId}_${episode.episodeNumber}"
                    unlockedDao.insertUnlock(UnlockedEpisodeEntity(key))
                    _unlockedEpisodeIds.value = _unlockedEpisodeIds.value + episode.id
                    profileDao.insertUserProfile(
                        profile.copy(
                            coinBalance = result.optInt("coins", profile.coinBalance),
                            todayAdCount = result.optInt("todayAdCount", profile.todayAdCount)
                        )
                    )
                    true
                }
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }
    }

    suspend fun claimRewardOnBackend(uid: String, taskId: String): Boolean {
        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val userUrl = AppConfig.API_URL.replace("/api/mobile/v1", "/api/user")
                val bodyObj = JSONObject().apply {
                    put("taskId", taskId)
                }
                val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                val body = okhttp3.RequestBody.create(mediaType, bodyObj.toString())
                val request = Request.Builder()
                    .url("$userUrl/$uid/claim")
                    .post(body)
                    .header("X-API-Key", AppConfig.API_KEY)
                    .build()
                client.newCall(request).execute().use { response ->
                    response.isSuccessful
                }
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }
    }

    suspend fun createCheckoutSession(userId: String, packId: String, gateway: String): String? {
        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                val bodyObj = JSONObject().apply {
                    put("userId", userId)
                    put("packId", packId)
                    put("gateway", gateway)
                }
                val body = okhttp3.RequestBody.create(mediaType, bodyObj.toString())
                val request = Request.Builder()
                    .url("${AppConfig.API_URL}/checkout")
                    .post(body)
                    .header("X-API-Key", AppConfig.API_KEY)
                    .build()
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val resObj = JSONObject(response.body?.string() ?: "")
                        if (resObj.optBoolean("success", false)) {
                            return@withContext resObj.optString("url", null)
                        }
                    }
                }
                null
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }
    }

    suspend fun verifyPurchase(userId: String, packId: String, gateway: String, sessionId: String): Boolean {
        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                val bodyObj = JSONObject().apply {
                    put("userId", userId)
                    put("packId", packId)
                    put("gateway", gateway)
                    put("sessionId", sessionId)
                }
                val body = okhttp3.RequestBody.create(mediaType, bodyObj.toString())
                val request = Request.Builder()
                    .url("${AppConfig.API_URL}/verify-purchase")
                    .post(body)
                    .header("X-API-Key", AppConfig.API_KEY)
                    .build()
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val resObj = JSONObject(response.body?.string() ?: "")
                        return@withContext resObj.optBoolean("success", false)
                    }
                }
                false
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }
    }


    suspend fun forgotPassword(email: String): Pair<Boolean, String> {
        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val url = AppConfig.API_URL.replace("/api/mobile/v1", "/api/auth/forgot-password")
                val json = org.json.JSONObject().apply { put("email", email) }
                val requestBody = okhttp3.RequestBody.create("application/json; charset=utf-8".toMediaTypeOrNull(), json.toString())
                val request = okhttp3.Request.Builder().url(url).post(requestBody).build()
                client.newCall(request).execute().use { response ->
                    val bodyStr = response.body?.string() ?: ""
                    try {
                        val resJson = org.json.JSONObject(bodyStr)
                        val success = resJson.optBoolean("success", false)
                        val msg = if (success) resJson.optString("message", "Email sent") else resJson.optString("error", "Failed")
                        Pair(success, msg)
                    } catch (e: Exception) {
                        Pair(false, "Failed to parse response")
                    }
                }
            } catch (e: Exception) {
                Pair(false, e.localizedMessage ?: "Network error")
            }
        }
    }

    suspend fun claimReferralCode(referralCode: String): Pair<Boolean, String> {
        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            try {
                val profile = profileDao.getUserProfileDirect(_currentEmail.value)
                val uid = profile?.uid ?: return@withContext Pair(false, "Please sign in first.")
                val claimUrl = "${AppConfig.API_URL}/referral/claim"
                val json = org.json.JSONObject().apply {
                    put("userId", uid)
                    put("referralCode", referralCode.trim())
                }
                val requestBody = okhttp3.RequestBody.create("application/json; charset=utf-8".toMediaTypeOrNull(), json.toString())
                val request = okhttp3.Request.Builder()
                    .url(claimUrl)
                    .post(requestBody)
                    .header("X-API-Key", AppConfig.API_KEY)
                    .build()
                client.newCall(request).execute().use { response ->
                    val bodyStr = response.body?.string() ?: ""
                    try {
                        val resJson = org.json.JSONObject(bodyStr)
                        val success = resJson.optBoolean("success", false)
                        if (success) {
                            val bonus = if (resJson.has("coinsAwarded")) resJson.optInt("coinsAwarded", 0) else resJson.optInt("bonusCoins", 0)
                            if (_currentEmail.value.isNotEmpty()) {
                                syncUserProfile(uid, _currentEmail.value, null, null)
                            }
                            val msg = if (bonus > 0) "Congratulations! You earned +$bonus bonus coins!" else resJson.optString("message", "Congratulations! Referral bonus claimed!")
                            Pair(true, msg)
                        } else {
                            val errorMsg = resJson.optString("error", "Failed to claim referral code.")
                            Pair(false, errorMsg)
                        }
                    } catch (e: Exception) {
                        Pair(false, "Failed to parse response.")
                    }
                }
            } catch (e: Exception) {
                Pair(false, e.localizedMessage ?: "Network error. Please try again.")
            }
        }
    }
}

