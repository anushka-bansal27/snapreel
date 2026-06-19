package com.example.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.PhoneAuthCredential
import java.time.Instant

class SnapReelsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = SnapReelsRepository(application)

    // User authentication state
    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _authError = MutableStateFlow<String?>(null)
    val authError: StateFlow<String?> = _authError.asStateFlow()

    // Main App States
    val userProfile: StateFlow<UserProfileEntity?> = repository.userProfile
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val claimedTaskIds: StateFlow<Set<String>> = repository.claimedTaskIds

    val watchHistory: StateFlow<List<WatchHistoryItem>> = repository.watchHistory

    private val _currentTimeMillis = MutableStateFlow(System.currentTimeMillis())
    val isVipActive: StateFlow<Boolean> = combine(userProfile, _currentTimeMillis) { profile, now ->
        if (profile?.isVip != true) {
            false
        } else if (profile.vipExpiry.isBlank() || profile.vipExpiry == "null") {
            true
        } else {
            runCatching { Instant.parse(profile.vipExpiry).toEpochMilli() > now }.getOrDefault(false)
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Checking)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _dramas = MutableStateFlow<List<Drama>>(emptyList())
    val dramas: StateFlow<List<Drama>> = _dramas.asStateFlow()

    private val _categories = MutableStateFlow<List<String>>(emptyList())
    val categories: StateFlow<List<String>> = _categories.asStateFlow()

    private val _appSettings = MutableStateFlow(AppSettings())
    val appSettings: StateFlow<AppSettings> = _appSettings.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _hasCompletedDataLoad = MutableStateFlow(false)
    val hasCompletedDataLoad: StateFlow<Boolean> = _hasCompletedDataLoad.asStateFlow()

    private var refreshJob: Job? = null
    private var preloadShortsJob: Job? = null

    // Convenience accessor
    val siteUrl: StateFlow<String> get() = _appSettings.map { it.siteUrl }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "")

    private val _preloadedShorts = MutableStateFlow<List<ShortItem>>(emptyList())
    val preloadedShorts: StateFlow<List<ShortItem>> = _preloadedShorts.asStateFlow()

    private val _isPreloadingShorts = MutableStateFlow(false)
    val isPreloadingShorts: StateFlow<Boolean> = _isPreloadingShorts.asStateFlow()

    private val firebaseAuth = FirebaseAuth.getInstance()

    init {
        val currentUser = firebaseAuth.currentUser
        if (currentUser != null) {
            _isLoggedIn.value = true
            val email = currentUser.email ?: ""
            repository.setCurrentEmail(email)
            viewModelScope.launch {
                repository.syncUserProfile(
                    uid = currentUser.uid,
                    email = email,
                    displayName = currentUser.displayName,
                    photoUrl = currentUser.photoUrl?.toString()
                )
                repository.syncLibrary(currentUser.uid)
            }
        }
        viewModelScope.launch {
            while (true) {
                _currentTimeMillis.value = System.currentTimeMillis()
                kotlinx.coroutines.delay(30_000)
            }
        }
        refreshData()
        checkConnection()
    }

    fun checkConnection() {
        viewModelScope.launch {
            _connectionState.value = ConnectionState.Checking
            val success = repository.testServerConnection()
            if (success) {
                val settings = repository.getAppSettings()
                _appSettings.value = settings
                AdsManager.initSdk(getApplication(), settings)
                _connectionState.value = ConnectionState.Connected
            } else {
                _connectionState.value = ConnectionState.Failed
            }
        }
    }

    fun refreshData(showLoading: Boolean = false) {
        if (refreshJob?.isActive == true) return

        refreshJob = viewModelScope.launch {
            _isRefreshing.value = true
            if (showLoading) {
                _dramas.value = emptyList()
            }

            try {
                coroutineScope {
                    val dramasRequest = async { repository.getAllDramas().first() }
                    val categoriesRequest = async { repository.getHomepageCategories().first() }
                    val settingsRequest = async { repository.getAppSettings() }

                    val refreshedDramas = dramasRequest.await()
                    val refreshedCategories = categoriesRequest.await()
                    val refreshedSettings = settingsRequest.await()

                    _dramas.value = refreshedDramas
                    _categories.value = refreshedCategories
                    _appSettings.value = refreshedSettings
                    AdsManager.initSdk(getApplication(), refreshedSettings)
                    loadShorts()
                }
                syncLibrary()
            } finally {
                _hasCompletedDataLoad.value = true
                _isRefreshing.value = false
            }
        }
    }

    fun syncLibrary() {
        val uid = userProfile.value?.uid.orEmpty()
        val email = userProfile.value?.email.orEmpty()
        val displayName = userProfile.value?.username
        val photoUrl = userProfile.value?.photoURL
        if (uid.isNotEmpty() && email.isNotEmpty()) {
            viewModelScope.launch {
                repository.syncUserProfile(uid, email, displayName, photoUrl)
                repository.syncLibrary(uid)
            }
        }
    }

    fun loadShorts(force: Boolean = false) {
        if (!force && _preloadedShorts.value.isNotEmpty()) return
        if (!force && preloadShortsJob?.isActive == true) return
        preloadShortsJob?.cancel()
        preloadShortsJob = viewModelScope.launch(Dispatchers.IO) {
            _isPreloadingShorts.value = true
            val cachePrefs = getApplication<Application>().getSharedPreferences("snapreels_cache", android.content.Context.MODE_PRIVATE)
            val prefs = getApplication<Application>().getSharedPreferences("snapreels_settings", android.content.Context.MODE_PRIVATE)
            val langCode = prefs.getString("language_code", "en") ?: "en"

            try {
                // 1. Instant cache display for 0ms startup
                val cachedJson = cachePrefs.getString("cached_shorts_feed", null)
                    ?: cachePrefs.getString("cached_shorts_$langCode", null)
                if (!cachedJson.isNullOrBlank() && !force) {
                    try {
                        val cached = repository.parseShortsJson(cachedJson)
                        if (cached.isNotEmpty()) {
                            _preloadedShorts.value = cached.shuffled()
                            _isPreloadingShorts.value = false
                        }
                    } catch (_: Exception) {}
                }

                // 2. Fetch candidate dramas with guaranteed fallback
                var candidatesList = _dramas.value
                if (candidatesList.isEmpty()) {
                    candidatesList = repository.getDirectSeries(langCode)
                    if (candidatesList.isNotEmpty()) {
                        _dramas.value = candidatesList
                    }
                }
                if (candidatesList.isEmpty()) {
                    candidatesList = repository.getDirectSeries("en")
                    if (candidatesList.isNotEmpty()) {
                        _dramas.value = candidatesList
                    }
                }
                if (candidatesList.isEmpty()) {
                    candidatesList = repository.getDirectSeries("")
                    if (candidatesList.isNotEmpty()) {
                        _dramas.value = candidatesList
                    }
                }

                if (candidatesList.isEmpty()) {
                    if (_preloadedShorts.value.isEmpty()) {
                        _preloadedShorts.value = emptyList()
                    }
                    return@launch
                }

                // 3. Shuffle dramas randomly ("3achwa2i") so feed changes and stays fresh
                val shuffledDramas = candidatesList.shuffled()
                val accumulated = java.util.Collections.synchronizedList(mutableListOf<ShortItem>())

                // 4. Concurrently fetch episodes for each drama independently
                coroutineScope {
                    shuffledDramas.forEach { drama ->
                        launch(Dispatchers.IO) {
                            try {
                                val epList = repository.getDirectEpisodes(drama.id)
                                val playableEpisodes = epList.filter { ep ->
                                    ep.videoUrl.isNotBlank() &&
                                    !ep.videoUrl.contains("<iframe", ignoreCase = true) &&
                                    !ep.videoUrl.contains("<div", ignoreCase = true) &&
                                    (ep.videoUrl.startsWith("http://") || ep.videoUrl.startsWith("https://") || ep.videoUrl.startsWith("/"))
                                }

                                if (playableEpisodes.isNotEmpty()) {
                                    // Prioritize free episodes, fallback to any available playable episode
                                    val freePlayable = playableEpisodes.filter { !it.isPremium || it.coinCost == 0 }
                                    val pool = if (freePlayable.isNotEmpty()) freePlayable else playableEpisodes

                                    // Pick up to 2 random distinct episodes per drama for great variety
                                    val items = pool.shuffled().take(2).map { ep -> ShortItem(drama, ep) }
                                    accumulated.addAll(items)
                                    // Immediately update preloaded shorts as soon as any drama finishes!
                                    _preloadedShorts.value = accumulated.shuffled().toList()
                                    _isPreloadingShorts.value = false
                                }
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        }
                    }
                }

                // 5. Cache accumulated shorts for instant 0ms future visits
                if (accumulated.isNotEmpty()) {
                    try {
                        val jsonArr = org.json.JSONArray()
                        for (item in accumulated) {
                            val obj = org.json.JSONObject().apply {
                                put("drama", repository.serializeDrama(item.drama))
                                put("episode", repository.serializeEpisode(item.episode))
                            }
                            jsonArr.put(obj)
                        }
                        val serialized = jsonArr.toString()
                        cachePrefs.edit()
                            .putString("cached_shorts_feed", serialized)
                            .putString("cached_shorts_$langCode", serialized)
                            .apply()
                    } catch (_: Exception) {}
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isPreloadingShorts.value = false
            }
        }
    }

    // Returns true if user is logged in. Use this before account actions.
    fun requireLogin(onNotLoggedIn: () -> Unit): Boolean {
        return if (_isLoggedIn.value) {
            true
        } else {
            onNotLoggedIn()
            false
        }
    }

    // Filter states
    private val _selectedCategory = MutableStateFlow("All")
    val selectedCategory: StateFlow<String> = _selectedCategory.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    val filteredDramas: StateFlow<List<Drama>> = combine(dramas, _selectedCategory, searchQuery) { list, cat, query ->
        val filteredList = when (cat) {
            "All" -> list
            "Hot 🔥" -> list.filter { it.isTrending }
            "New" -> list.sortedByDescending { it.releaseYear }
            "Rankings" -> list.sortedByDescending { it.rating }
            "Originals" -> list.filter { it.tags.any { t -> t.contains("Original", ignoreCase = true) || t.contains("Exclusive", ignoreCase = true) } }
            else -> list.filter { com.example.util.CategoryTranslator.isMatch(it.category, it.genres, cat) }
        }
        if (query.isBlank()) {
            filteredList
        } else {
            filteredList.filter {
                it.title.contains(query, ignoreCase = true) ||
                it.description.contains(query, ignoreCase = true) ||
                it.genres.any { g -> g.contains(query, ignoreCase = true) } ||
                com.example.util.CategoryTranslator.isMatch(it.category, it.genres, query)
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Selected drama and episode state
    private val _selectedDrama = MutableStateFlow<Drama?>(null)
    val selectedDrama: StateFlow<Drama?> = _selectedDrama.asStateFlow()

    private val _episodes = MutableStateFlow<List<Episode>>(emptyList())
    val episodes: StateFlow<List<Episode>> = _episodes.asStateFlow()

    private val _currentPlayingEpisode = MutableStateFlow<Episode?>(null)
    val currentPlayingEpisode: StateFlow<Episode?> = _currentPlayingEpisode.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    // Tracking unlocked episodes
    private val _unlockedStates = MutableStateFlow<Map<String, Boolean>>(emptyMap())
    val unlockedStates: StateFlow<Map<String, Boolean>> = _unlockedStates.asStateFlow()

    // Favorited dramas IDs
    val favoriteDramas: StateFlow<List<FavoriteDramaEntity>> = repository.favoritesFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Liked series IDs
    val likedSeriesIds: StateFlow<Set<String>> = repository.likedSeriesIds
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptySet())

    // Check-in trigger result info text
    private val _checkInMessage = MutableStateFlow<String?>(null)
    val checkInMessage: StateFlow<String?> = _checkInMessage.asStateFlow()

    // AI Generator State
    private val _aiResult = MutableStateFlow<Map<String, String>?>(null)
    val aiResult: StateFlow<Map<String, String>?> = _aiResult.asStateFlow()

    private val _aiLoading = MutableStateFlow(false)
    val aiLoading: StateFlow<Boolean> = _aiLoading.asStateFlow()

    private val _savedAiCreations = MutableStateFlow<List<Map<String, String>>>(emptyList())
    val savedAiCreations: StateFlow<List<Map<String, String>>> = _savedAiCreations.asStateFlow()

    fun selectCategory(cat: String) {
        _selectedCategory.value = cat
    }

    fun selectDrama(drama: Drama) {
        _selectedDrama.value = drama
        viewModelScope.launch {
            repository.getEpisodesForDrama(drama.id).collect { epList ->
                _episodes.value = epList
                // Refresh unlocked states for these episodes
                val updatedUnlocks = mutableMapOf<String, Boolean>()
                for (ep in epList) {
                    updatedUnlocks[ep.id] = repository.isEpisodeUnlocked(ep)
                }
                _unlockedStates.value = updatedUnlocks
            }
        }
    }

    fun selectDramaById(idOrSlug: String, onDramaLoaded: (() -> Unit)? = null) {
        viewModelScope.launch {
            var target = _dramas.value.find { it.id == idOrSlug || it.slug == idOrSlug }
            if (target == null) {
                val all = repository.getAllDramas().firstOrNull() ?: emptyList()
                target = all.find { it.id == idOrSlug || it.slug == idOrSlug }
                if (target == null) {
                    for (d in all) {
                        val eps = repository.getEpisodesForDrama(d.id).firstOrNull() ?: emptyList()
                        if (eps.any { it.id == idOrSlug }) {
                            target = d
                            break
                        }
                    }
                }
            }
            if (target != null) {
                selectDrama(target)
                onDramaLoaded?.invoke()
            }
        }
    }

    fun selectEpisode(episode: Episode) {
        _currentPlayingEpisode.value = episode
        _isPlaying.value = true
        val uid = userProfile.value?.uid.orEmpty()
        val seriesId = _selectedDrama.value?.id ?: episode.dramaId
        if (uid.isNotEmpty()) {
            viewModelScope.launch { repository.updateHistory(uid, seriesId, episode) }
        }
    }

    fun togglePlayPause() {
        _isPlaying.value = !_isPlaying.value
    }

    // Toggle favorite state
    fun toggleFavorite(dramaId: String) {
        viewModelScope.launch {
            val isFav = favoriteDramas.value.any { it.dramaId == dramaId }
            if (isFav) {
                repository.removeFavorite(dramaId)
            } else {
                repository.addFavorite(dramaId)
            }
            val uid = userProfile.value?.uid.orEmpty()
            if (uid.isNotEmpty() && !repository.toggleFavoriteForUser(uid, dramaId)) {
                if (isFav) repository.addFavorite(dramaId) else repository.removeFavorite(dramaId)
            }
        }
    }

    // Toggle like state
    fun toggleLike(dramaId: String, onResult: (Boolean) -> Unit = {}) {
        val uid = userProfile.value?.uid.orEmpty().ifEmpty { firebaseAuth.currentUser?.uid.orEmpty() }
        if (uid.isNotEmpty()) {
            viewModelScope.launch {
                val success = repository.toggleLike(uid, dramaId)
                if (success) {
                    refreshData(showLoading = false)
                }
                onResult(success)
            }
        } else {
            onResult(false)
        }
    }

    fun removeHistoryItem(seriesId: String) {
        val uid = userProfile.value?.uid.orEmpty()
        if (uid.isNotEmpty()) viewModelScope.launch { repository.removeHistory(uid, seriesId) }
    }

    fun clearAllHistory() {
        val uid = userProfile.value?.uid.orEmpty()
        if (uid.isNotEmpty()) viewModelScope.launch { repository.clearHistory(uid) }
    }

    fun resumeHistory(drama: Drama, history: WatchHistoryItem, onReady: () -> Unit) {
        _selectedDrama.value = drama
        viewModelScope.launch {
            repository.getEpisodesForDrama(drama.id).collect { epList ->
                _episodes.value = epList
                val updatedUnlocks = mutableMapOf<String, Boolean>()
                for (ep in epList) updatedUnlocks[ep.id] = repository.isEpisodeUnlocked(ep)
                _unlockedStates.value = updatedUnlocks
                val episode = epList.firstOrNull { it.id == history.episodeId }
                    ?: epList.firstOrNull { it.episodeNumber == history.episodeInSeason }
                if (episode != null) {
                    selectEpisode(episode)
                    onReady()
                }
            }
        }
    }

    fun registerWithEmail(email: String, pss: String, displayName: String, onResult: (Boolean) -> Unit) {
        if (email.isBlank() || pss.isBlank()) {
            _authError.value = "Email and password cannot be empty"
            onResult(false)
            return
        }
        viewModelScope.launch {
            firebaseAuth.createUserWithEmailAndPassword(email, pss)
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val firebaseUser = firebaseAuth.currentUser
                        val userEmail = firebaseUser?.email ?: email
                        val uid = firebaseUser?.uid ?: ""
                        repository.setCurrentEmail(userEmail)
                        viewModelScope.launch {
                            repository.syncUserProfile(
                                uid = uid,
                                email = userEmail,
                                displayName = displayName.takeIf { it.isNotEmpty() } ?: firebaseUser?.displayName,
                                photoUrl = firebaseUser?.photoUrl?.toString()
                            )
                            repository.syncLibrary(uid)
                            _isLoggedIn.value = true
                            _authError.value = null
                            onResult(true)
                        }
                    } else {
                        val errorMsg = task.exception?.localizedMessage ?: "Sign-up failed"
                        _authError.value = errorMsg
                        onResult(false)
                    }
                }
        }
    }

    fun loginWithEmail(email: String, pss: String, onResult: (Boolean) -> Unit) {
        if (email.isBlank() || pss.isBlank()) {
            _authError.value = "Email and password cannot be empty"
            onResult(false)
            return
        }
        viewModelScope.launch {
            firebaseAuth.signInWithEmailAndPassword(email, pss)
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val firebaseUser = firebaseAuth.currentUser
                        val userEmail = firebaseUser?.email ?: email
                        val uid = firebaseUser?.uid ?: ""
                        viewModelScope.launch {
                            val exists = repository.checkUserExistsInMongoDB(uid)
                            if (exists) {
                                repository.setCurrentEmail(userEmail)
                                repository.syncUserProfile(
                                    uid = uid,
                                    email = userEmail,
                                    displayName = firebaseUser?.displayName,
                                    photoUrl = firebaseUser?.photoUrl?.toString()
                                )
                                repository.syncLibrary(uid)
                                _isLoggedIn.value = true
                                _authError.value = null
                                onResult(true)
                            } else {
                                firebaseAuth.signOut()
                                _isLoggedIn.value = false
                                _authError.value = "Account not registered. Please sign up first."
                                onResult(false)
                            }
                        }
                    } else {
                        val errorMsg = task.exception?.localizedMessage ?: "Invalid email or password"
                        _authError.value = errorMsg
                        onResult(false)
                    }
                }
        }
    }

    fun claimReward(taskId: String, coins: Int, callback: (Boolean) -> Unit) {
        val uid = userProfile.value?.uid ?: ""
        if (uid.isEmpty()) {
            viewModelScope.launch {
                repository.awardCoins(coins)
                repository.markTaskClaimedLocally(taskId)
                callback(true)
            }
            return
        }
        viewModelScope.launch {
            repository.markTaskClaimedLocally(taskId)
            val success = repository.claimRewardOnBackend(uid, taskId)
            if (success) {
                repository.syncUserProfile(
                    uid = uid,
                    email = repository.currentEmail.value,
                    displayName = userProfile.value?.username,
                    photoUrl = userProfile.value?.photoURL
                )
                callback(true)
            } else {
                callback(false)
            }
        }
    }

    fun signInWithGoogle(idToken: String, fallbackEmail: String, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            val credential = GoogleAuthProvider.getCredential(idToken, null)
            firebaseAuth.signInWithCredential(credential)
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val firebaseUser = firebaseAuth.currentUser
                        val userEmail = firebaseUser?.email ?: fallbackEmail
                        val uid = firebaseUser?.uid ?: ""
                        repository.setCurrentEmail(userEmail)
                        viewModelScope.launch {
                            repository.syncUserProfile(
                                uid = uid,
                                email = userEmail,
                                displayName = firebaseUser?.displayName,
                                photoUrl = firebaseUser?.photoUrl?.toString()
                            )
                            repository.syncLibrary(uid)
                            _isLoggedIn.value = true
                            _authError.value = null
                            onResult(true)
                        }
                    } else {
                        val errorMsg = task.exception?.localizedMessage ?: "Firebase auth failed"
                        _authError.value = errorMsg
                        onResult(false)
                    }
                }
        }
    }

    fun signInWithPhoneCredential(credential: PhoneAuthCredential, phoneNumber: String, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            firebaseAuth.signInWithCredential(credential)
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val firebaseUser = firebaseAuth.currentUser
                        val uid = firebaseUser?.uid ?: ""
                        // Generate email for phone users like backend does: User [uid] @ domain
                        // Or just uid@phone.com, but the user requested: UserId@domain
                        // We can just send uid@snapreels.com or let backend handle it, backend user sync requires email
                        val domain = AppConfig.API_URL.replace("https://", "").replace("http://", "").split("/").firstOrNull() ?: "snapreels.com"
                        val shortId = (10000000..99999999).random().toString()
                        val userEmail = firebaseUser?.email ?: "${shortId}@${domain}"
                        
                        repository.setCurrentEmail(userEmail)
                        viewModelScope.launch {
                            repository.syncUserProfile(
                                uid = uid,
                                email = userEmail,
                                displayName = "User $shortId", // Use short ID instead of long UID
                                photoUrl = firebaseUser?.photoUrl?.toString()
                            )
                            repository.syncLibrary(uid)
                            _isLoggedIn.value = true
                            _authError.value = null
                            onResult(true)
                        }
                    } else {
                        val errorMsg = task.exception?.localizedMessage ?: "Firebase phone auth failed"
                        _authError.value = errorMsg
                        onResult(false)
                    }
                }
        }
    }

    fun logout() {
        firebaseAuth.signOut()
        _isLoggedIn.value = false
        repository.setCurrentEmail("")
    }

    fun deleteAccount(onResult: (Boolean, String) -> Unit) {
        val user = firebaseAuth.currentUser
        if (user == null) {
            onResult(false, "You must be signed in to delete your account.")
            return
        }

        user.getIdToken(true).addOnCompleteListener { tokenTask ->
            if (!tokenTask.isSuccessful) {
                onResult(false, "Could not verify your account. Please sign in again.")
                return@addOnCompleteListener
            }
            val idToken = tokenTask.result?.token
            if (idToken.isNullOrBlank()) {
                onResult(false, "Could not verify your account. Please sign in again.")
                return@addOnCompleteListener
            }

            viewModelScope.launch {
                val (success, message) = repository.deleteAccount(user.uid, idToken)
                if (success) {
                    firebaseAuth.signOut()
                    _isLoggedIn.value = false
                    _transactions.value = emptyList()
                }
                onResult(success, message)
            }
        }
    }

    fun forgotPassword(email: String, onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            val (success, message) = repository.forgotPassword(email)
            onResult(success, message)
        }
    }

    // Add general rewards
    fun earnReward(coins: Int) {
        viewModelScope.launch {
            repository.awardCoins(coins)
        }
    }

    // Trigger check-in
    fun checkInToday() {
        viewModelScope.launch {
            val res = repository.performDailyCheckIn()
            _checkInMessage.value = res
        }
    }

    fun clearCheckInMessage() {
        _checkInMessage.value = null
    }

    // Unlock premium episode
    fun unlockPremiumEpisode(episode: Episode, method: String = "coins", callback: (Boolean) -> Unit) {
        viewModelScope.launch {
            val success = repository.unlockEpisode(episode, method)
            if (success) {
                // Refresh unlock status locally
                val current = _unlockedStates.value.toMutableMap()
                current[episode.id] = true
                _unlockedStates.value = current
                callback(true)
            } else {
                callback(false)
            }
        }
    }

    // AI Generative Trigger
    fun generateDramaConcept(prompt: String) {
        viewModelScope.launch {
            _aiLoading.value = true
            _aiResult.value = null
            val result = GeminiService.generateDramaMetadata(prompt)
            _aiResult.value = result
            _aiLoading.value = false
        }
    }

    fun saveAiConcept(concept: Map<String, String>) {
        val current = _savedAiCreations.value.toMutableList()
        current.add(0, concept)
        _savedAiCreations.value = current
        _aiResult.value = null
    }

    private val _shouldAutoOpenEpisodes = MutableStateFlow(false)
    val shouldAutoOpenEpisodes: StateFlow<Boolean> = _shouldAutoOpenEpisodes.asStateFlow()

    fun setAutoOpenEpisodes(value: Boolean) {
        _shouldAutoOpenEpisodes.value = value
    }

    fun playDramaDirect(drama: Drama, onReady: () -> Unit) {
        _selectedDrama.value = drama
        viewModelScope.launch {
            repository.getEpisodesForDrama(drama.id).collect { epList ->
                _episodes.value = epList
                val updatedUnlocks = mutableMapOf<String, Boolean>()
                for (ep in epList) {
                    updatedUnlocks[ep.id] = repository.isEpisodeUnlocked(ep)
                }
                _unlockedStates.value = updatedUnlocks

                val historyItem = watchHistory.value.firstOrNull { it.seriesId == drama.id }
                val episodeToPlay = if (historyItem != null) {
                    epList.firstOrNull { it.id == historyItem.episodeId }
                        ?: epList.firstOrNull { it.episodeNumber == historyItem.episodeInSeason }
                        ?: epList.firstOrNull()
                } else {
                    epList.firstOrNull()
                }

                if (episodeToPlay != null) {
                    selectEpisode(episodeToPlay)
                    onReady()
                }
            }
        }
    }

    fun clearAiResult() {
        _aiResult.value = null
    }

    private val _transactions = MutableStateFlow<List<CoinTransaction>>(emptyList())
    val transactions: StateFlow<List<CoinTransaction>> = _transactions.asStateFlow()

    fun fetchTransactions(limit: Int = 100) {
        val uid = userProfile.value?.uid.orEmpty()
        if (uid.isNotEmpty()) {
            viewModelScope.launch {
                val list = repository.getUserTransactions(uid, limit)
                _transactions.value = list
            }
        }
    }

    fun purchaseCoins(coins: Int, desc: String) {
        viewModelScope.launch {
            repository.awardCoins(coins, txDesc = desc, txType = "purchase")
            syncLibrary()
            fetchTransactions()
        }
    }

    fun purchaseVip(days: Int, desc: String) {
        viewModelScope.launch {
            repository.awardVip(days, txDesc = desc, txType = "purchase")
            syncLibrary()
            fetchTransactions()
        }
    }

    suspend fun createCheckoutSession(packId: String, gateway: String): String? {
        val uid = userProfile.value?.uid.orEmpty()
        if (uid.isEmpty()) return null
        return repository.createCheckoutSession(uid, packId, gateway)
    }

    suspend fun verifyAndAwardPurchase(packId: String, gateway: String, sessionId: String): Boolean {
        val uid = userProfile.value?.uid.orEmpty()
        if (uid.isEmpty()) return false
        val success = repository.verifyPurchase(uid, packId, gateway, sessionId)
        if (success) {
            syncLibrary()
            fetchTransactions()
        }
        return success
    }

    fun verifyGooglePlayPurchase(packId: String, sessionId: String, onResult: (Boolean) -> Unit) {
        val uid = userProfile.value?.uid.orEmpty()
        if (uid.isEmpty()) {
            onResult(false)
            return
        }
        viewModelScope.launch {
            val success = repository.verifyPurchase(uid, packId, "gplay", sessionId)
            if (success) {
                repository.syncUserProfile(
                    uid = uid,
                    email = repository.currentEmail.value,
                    displayName = userProfile.value?.username,
                    photoUrl = userProfile.value?.photoURL
                )
                repository.syncLibrary(uid)
                fetchTransactions()
                onResult(true)
            } else {
                onResult(false)
            }
        }
    }

    fun claimReferralCode(code: String, onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            val result = repository.claimReferralCode(code)
            onResult(result.first, result.second)
        }
    }
}

sealed class ConnectionState {
    object Checking : ConnectionState()
    object Connected : ConnectionState()
    object Failed : ConnectionState()
}
