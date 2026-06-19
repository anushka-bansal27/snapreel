package com.example.ui.screens

import android.content.Context
import android.content.ContextWrapper
import android.net.Uri
import android.widget.Toast
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.example.util.VideoCacheManager
import androidx.activity.ComponentActivity
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.graphics.graphicsLayer
import coil.compose.AsyncImage
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import com.example.data.*
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.DarkerSlate
import com.example.ui.theme.MetallicGold
import com.example.viewmodel.SnapReelsViewModel
import com.example.R
import androidx.compose.ui.res.stringResource
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import android.app.Activity
import androidx.activity.compose.BackHandler
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.layout.ContentScale
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.FullScreenContentCallback

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun VideoPlayerScreen(navController: NavController, viewModel: SnapReelsViewModel) {
    val context = LocalContext.current
    val view = LocalView.current
    val episodes by viewModel.episodes.collectAsState()
    val currentEpisode by viewModel.currentPlayingEpisode.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()
    val isVipActive by viewModel.isVipActive.collectAsState()
    val unlockedStates by viewModel.unlockedStates.collectAsState()
    val drama by viewModel.selectedDrama.collectAsState()
    val siteUrl by viewModel.siteUrl.collectAsState()
    val favoriteDramas by viewModel.favoriteDramas.collectAsState()
    val likedSeriesIds by viewModel.likedSeriesIds.collectAsState()
    val appSettings by viewModel.appSettings.collectAsState()

    val preferences = remember { context.getSharedPreferences("snapreels_settings", android.content.Context.MODE_PRIVATE) }
    var autoUnlockEnabled by remember { mutableStateOf(preferences.getBoolean("auto_unlock_enabled", false)) }

    var showUnlockConfirm by remember { mutableStateOf(false) }
    var showEpisodes by remember { mutableStateOf(false) }
    var episodeToUnlock by remember { mutableStateOf<Episode?>(null) }
    val scope = rememberCoroutineScope()
    var isLoadingRewardedAd by remember { mutableStateOf(false) }

    val shouldAutoOpenEpisodes by viewModel.shouldAutoOpenEpisodes.collectAsState()
    LaunchedEffect(shouldAutoOpenEpisodes) {
        if (shouldAutoOpenEpisodes) {
            showEpisodes = true
            viewModel.setAutoOpenEpisodes(false)
        }
    }

    val activity = view.context.findActivity()
    var mInterstitialAd by remember { mutableStateOf<Any?>(null) }

    LaunchedEffect(Unit) {
        AdsManager.loadInterstitial(
            context = context,
            appSettings = appSettings,
            onLoaded = { ad ->
                mInterstitialAd = ad
            },
            onError = {
                mInterstitialAd = null
            }
        )
    }

    val triggerBackWithAd = {
        val ad = mInterstitialAd
        if (ad != null && activity != null) {
            AdsManager.showInterstitial(activity, ad) {
                navController.popBackStack()
            }
        } else {
            navController.popBackStack()
        }
    }

    BackHandler {
        triggerBackWithAd()
    }

    DisposableEffect(view) {
        val controller = activity?.window?.let { WindowCompat.getInsetsController(it, view) }
        controller?.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller?.hide(WindowInsetsCompat.Type.systemBars())
        onDispose {
            // Keep app in immersive full screen mode
        }
    }

    // Build pager starting at currentEpisode index
    val startPage = remember(currentEpisode, episodes) {
        episodes.indexOfFirst { it.id == currentEpisode?.id }.coerceAtLeast(0)
    }

    val pagerState = rememberPagerState(
        initialPage = startPage,
        pageCount = { episodes.size }
    )

    val firstLockedIndex = episodes.indexOfFirst { episode ->
        !(isVipActive || (unlockedStates[episode.id] ?: !episode.isPremium))
    }

    // Keep users on the first locked episode until it is unlocked.
    LaunchedEffect(pagerState.currentPage, firstLockedIndex) {
        val ep = episodes.getOrNull(pagerState.currentPage)
        if (firstLockedIndex >= 0 && pagerState.currentPage > firstLockedIndex) {
            val required = episodes[firstLockedIndex]
            pagerState.animateScrollToPage(firstLockedIndex)
            episodeToUnlock = required
            showUnlockConfirm = true
        } else if (ep != null && ep.id != currentEpisode?.id) {
            val canWatch = isVipActive || (unlockedStates[ep.id] ?: !ep.isPremium)
            if (canWatch) {
                viewModel.selectEpisode(ep)
            } else {
                episodeToUnlock = ep
                showUnlockConfirm = true
            }
        }
    }

    // Pre-emptively auto-unlock the next episode in the background
    LaunchedEffect(currentEpisode, autoUnlockEnabled, unlockedStates, userProfile?.coinBalance) {
        val current = currentEpisode ?: return@LaunchedEffect
        if (autoUnlockEnabled) {
            val currentIndex = episodes.indexOfFirst { it.id == current.id }
            if (currentIndex >= 0) {
                val nextEpisode = episodes.getOrNull(currentIndex + 1)
                if (nextEpisode != null) {
                    val isNextUnlocked = isVipActive || (unlockedStates[nextEpisode.id] ?: !nextEpisode.isPremium)
                    if (!isNextUnlocked) {
                        val userCoins = userProfile?.coinBalance ?: 0
                        if (userCoins >= nextEpisode.coinCost) {
                            viewModel.unlockPremiumEpisode(nextEpisode, "coins") { success ->
                                if (success) {
                                    Toast.makeText(context, context.getString(R.string.episode_unlocked_msg), Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Background Pre-caching Engine: Pre-fetch upcoming episode (N+1) into local disk cache for instant playback on weak networks
    LaunchedEffect(currentEpisode, episodes, autoUnlockEnabled, unlockedStates) {
        val current = currentEpisode ?: return@LaunchedEffect
        val currentIndex = episodes.indexOfFirst { it.id == current.id }
        if (currentIndex >= 0 && currentIndex + 1 < episodes.size) {
            val nextEp = episodes[currentIndex + 1]
            val isNextUnlocked = isVipActive || (unlockedStates[nextEp.id] ?: !nextEp.isPremium)
            if (isNextUnlocked) {
                kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                    try {
                        val cacheDir = java.io.File(context.cacheDir, "http_video_cache")
                        if (!cacheDir.exists()) cacheDir.mkdirs()
                        val cache = okhttp3.Cache(cacheDir, 50L * 1024L * 1024L) // 50 MB cache
                        val client = okhttp3.OkHttpClient.Builder().cache(cache).build()
                        val request = okhttp3.Request.Builder()
                            .url(nextEp.videoUrl)
                            .header("Range", "bytes=0-5242880") // Pre-fetch first 5MB
                            .build()
                        client.newCall(request).execute().use { response ->
                            response.body?.bytes()
                        }
                    } catch (_: Exception) {}
                }
            }
        }
    }


    val activeEpisode = episodes.getOrNull(pagerState.currentPage) ?: currentEpisode

    if (showUnlockConfirm && episodeToUnlock != null) {
        UnlockEpisodeOptionsDialog(
            episode = episodeToUnlock!!,
            balance = userProfile?.coinBalance ?: 0,
            todayAdCount = userProfile?.todayAdCount ?: 0,
            dailyAdLimit = appSettings.admobRewardedLimit,
            isLoadingAd = isLoadingRewardedAd,
            autoUnlockEnabled = autoUnlockEnabled,
            onAutoUnlockToggle = { enabled ->
                autoUnlockEnabled = enabled
                preferences.edit().putBoolean("auto_unlock_enabled", enabled).apply()
            },
            onDismiss = { if (!isLoadingRewardedAd) showUnlockConfirm = false },
            onUnlock = { method ->
                val target = episodeToUnlock!!
                if (!viewModel.requireLogin { showUnlockConfirm = false; navController.navigate("login") }) return@UnlockEpisodeOptionsDialog
                if (method == "coins") {
                    if ((userProfile?.coinBalance ?: 0) < target.coinCost) {
                        Toast.makeText(context, context.getString(R.string.insufficient_coins), Toast.LENGTH_LONG).show()
                        showUnlockConfirm = false
                        navController.navigate("topup")
                    } else {
                        viewModel.unlockPremiumEpisode(target, method) { success ->
                            Toast.makeText(
                                context,
                                if (success) context.getString(R.string.episode_unlocked_msg) else context.getString(R.string.unlock_failed_msg),
                                Toast.LENGTH_LONG
                            ).show()
                            if (success) {
                                showUnlockConfirm = false
                                val targetIndex = episodes.indexOfFirst { it.id == target.id }
                                if (targetIndex >= 0) scope.launch { pagerState.animateScrollToPage(targetIndex) }
                                viewModel.selectEpisode(target)
                            }
                        }
                    }
                } else {
                    val activity = context as? Activity
                    if (activity == null) {
                        Toast.makeText(context, context.getString(R.string.please_retry_again), Toast.LENGTH_SHORT).show()
                    } else {
                        AdsManager.loadAndShowRewarded(
                            activity = activity,
                            appSettings = appSettings,
                            onRewarded = {
                                isLoadingRewardedAd = false
                                viewModel.unlockPremiumEpisode(target, "ad") { success ->
                                    Toast.makeText(
                                        context,
                                        if (success) context.getString(R.string.episode_unlocked_msg) else context.getString(R.string.unlock_failed_msg),
                                        Toast.LENGTH_LONG
                                    ).show()
                                    if (success) {
                                        showUnlockConfirm = false
                                        val targetIndex = episodes.indexOfFirst { it.id == target.id }
                                        if (targetIndex >= 0) scope.launch { pagerState.animateScrollToPage(targetIndex) }
                                        viewModel.selectEpisode(target)
                                    }
                                }
                            },
                            onError = { _ ->
                                isLoadingRewardedAd = false
                                Toast.makeText(context, context.getString(R.string.please_retry_again), Toast.LENGTH_SHORT).show()
                            },
                            onStarted = {
                                isLoadingRewardedAd = true
                            }
                        )
                    }
                }
            }
        )
    }

    if (showEpisodes) {
        EpisodesGridDialog(
            episodes = episodes,
            currentEpisodeId = activeEpisode?.id,
            unlockedStates = unlockedStates,
            isVipActive = isVipActive,
            firstLockedIndex = firstLockedIndex,
            onDismiss = { showEpisodes = false },
            onEpisodeClick = { index, episode ->
                showEpisodes = false
                val targetIndex = if (firstLockedIndex >= 0 && index > firstLockedIndex) firstLockedIndex else index
                val target = episodes[targetIndex]
                scope.launch { pagerState.animateScrollToPage(targetIndex) }
                val canWatch = isVipActive || (unlockedStates[target.id] ?: !target.isPremium)
                if (canWatch) {
                    viewModel.selectEpisode(target)
                } else {
                    if (viewModel.requireLogin { navController.navigate("login") }) {
                        episodeToUnlock = target
                        showUnlockConfirm = true
                    }
                }
            }
        )
    }

    if (episodes.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = CrimsonRed)
        }
        return
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        val navBackStackEntry by navController.currentBackStackEntryAsState()
        val isPlayerActive = navBackStackEntry?.destination?.route == "player"
        val lifecycleOwner = LocalLifecycleOwner.current
        val lifecycleState by lifecycleOwner.lifecycle.currentStateFlow.collectAsState()
        val isLifecycleResumed = lifecycleState.isAtLeast(Lifecycle.State.RESUMED)

        VerticalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
            key = { page -> episodes.getOrNull(page)?.id ?: page }
        ) { page ->
            val episode = episodes.getOrNull(page) ?: return@VerticalPager
            val isCurrentPage = page == pagerState.currentPage && isPlayerActive && isLifecycleResumed
            val epId = episode.id
            val isUnlocked = isVipActive || (unlockedStates[epId] ?: !episode.isPremium)
            val dramaId = drama?.id.orEmpty()
            val isLiked = dramaId.isNotEmpty() && likedSeriesIds.contains(dramaId)
            val isFavorite = favoriteDramas.any { it.dramaId == drama?.id }

            val displayLikes = (drama?.likes ?: 0L).coerceAtLeast(0L)

            // Build the share URL
            val shareUrl = buildShareUrl(siteUrl, drama, episode)

            EpisodePlayerPage(
                episode = episode,
                drama = drama,
                isCurrentPage = isCurrentPage,
                isUnlocked = isUnlocked,
                isLiked = isLiked,
                isFavorite = isFavorite,
                displayLikes = displayLikes,
                userProfile = userProfile,
                onBack = { triggerBackWithAd() },
                onLikeToggle = {
                    if (viewModel.requireLogin { navController.navigate("login") }) {
                        drama?.let { currentDrama ->
                            viewModel.toggleLike(currentDrama.id) { success ->
                                if (!success) {
                                    Toast.makeText(context, "Could not update like. Please try again.", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    }
                },
                onFavoriteToggle = {
                    if (viewModel.requireLogin { navController.navigate("login") }) {
                        drama?.let { d -> viewModel.toggleFavorite(d.id) }
                    }
                },
                onShareClick = {
                    openAndroidShareChooser(context, drama?.title ?: episode.title, shareUrl)
                },
                onUnlockClick = {
                    if (viewModel.requireLogin { navController.navigate("login") }) {
                        episodeToUnlock = episode
                        showUnlockConfirm = true
                    }
                },
                onEpisodesClick = { showEpisodes = true },
                onVideoCompleted = {
                    if (page == pagerState.currentPage) {
                        val nextIndex = page + 1
                        val nextEpisode = episodes.getOrNull(nextIndex)
                        if (nextEpisode != null) {
                            scope.launch { pagerState.animateScrollToPage(nextIndex) }
                            val canWatchNext = isVipActive || (unlockedStates[nextEpisode.id] ?: !nextEpisode.isPremium)
                            if (canWatchNext) {
                                viewModel.selectEpisode(nextEpisode)
                            } else {
                                if (viewModel.requireLogin { navController.navigate("login") }) {
                                    val userCoins = userProfile?.coinBalance ?: 0
                                    if (autoUnlockEnabled && userCoins >= nextEpisode.coinCost) {
                                        viewModel.unlockPremiumEpisode(nextEpisode, "coins") { success ->
                                            if (success) {
                                                viewModel.selectEpisode(nextEpisode)
                                                Toast.makeText(context, context.getString(R.string.episode_unlocked_msg), Toast.LENGTH_SHORT).show()
                                            } else {
                                                episodeToUnlock = nextEpisode
                                                showUnlockConfirm = true
                                            }
                                        }
                                    } else {
                                        episodeToUnlock = nextEpisode
                                        showUnlockConfirm = true
                                    }
                                }
                            }
                        }
                    }
                },
                totalPages = episodes.size,
                nextEpisodeUrl = episodes.getOrNull(page + 1)?.videoUrl,
                appSettings = appSettings
            )
        }
    }
}

// ─── Helper to build share URL ────────────────────────────────────────────────
@Composable
private fun UnlockEpisodeOptionsDialog(
    episode: Episode,
    balance: Int,
    todayAdCount: Int,
    dailyAdLimit: Int,
    isLoadingAd: Boolean,
    autoUnlockEnabled: Boolean,
    onAutoUnlockToggle: (Boolean) -> Unit,
    onDismiss: () -> Unit,
    onUnlock: (String) -> Unit
) {
    Dialog(
        onDismissRequest = { if (!isLoadingAd) onDismiss() },
        properties = DialogProperties(dismissOnBackPress = !isLoadingAd, dismissOnClickOutside = !isLoadingAd)
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF131318)),
            border = BorderStroke(1.dp, Color(0xFF282834)),
            shape = RoundedCornerShape(22.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(modifier = Modifier.fillMaxWidth()) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(22.dp)
                ) {
                    // Balance pill at top
                    Surface(
                        color = MetallicGold.copy(alpha = 0.12f),
                        border = BorderStroke(1.dp, MetallicGold.copy(alpha = 0.35f)),
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier.padding(bottom = 12.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.MonetizationOn,
                                contentDescription = null,
                                tint = MetallicGold,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = stringResource(R.string.your_balance, balance),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MetallicGold
                            )
                        }
                    }

                    Text(
                        stringResource(R.string.unlock_episode_num, episode.episodeNumber),
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        stringResource(R.string.choose_option_to_watch),
                        color = Color.Gray,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 4.dp, bottom = 20.dp),
                        textAlign = TextAlign.Center
                    )

                    // Unlock with coins button
                    Button(
                        onClick = { if (!isLoadingAd) onUnlock("coins") },
                        enabled = !isLoadingAd,
                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth().height(66.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.MonetizationOn,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(22.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column(horizontalAlignment = Alignment.Start) {
                                Text(
                                    stringResource(R.string.unlock_with_coins, episode.coinCost),
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Black
                                )
                                Text(
                                    text = if (balance >= episode.coinCost) "Instant playback" else "Insufficient coins — Tap to recharge",
                                    fontSize = 10.sp,
                                    color = Color.White.copy(alpha = 0.8f)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Watch Ad button
                    Surface(
                        onClick = { if (todayAdCount < dailyAdLimit && !isLoadingAd) onUnlock("ad") },
                        enabled = todayAdCount < dailyAdLimit && !isLoadingAd,
                        color = Color(0xFF1E1E26),
                        border = BorderStroke(1.dp, Color(0xFF333344)),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth().height(66.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                            modifier = Modifier.padding(horizontal = 16.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.PlayCircle,
                                contentDescription = null,
                                tint = if (todayAdCount < dailyAdLimit) Color.White else Color.Gray,
                                modifier = Modifier.size(22.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column(horizontalAlignment = Alignment.Start) {
                                val buttonText = if (todayAdCount >= dailyAdLimit) {
                                    "DAILY LIMIT REACHED"
                                } else {
                                    stringResource(R.string.watch_ad_to_unlock)
                                }
                                Text(
                                    buttonText,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (todayAdCount < dailyAdLimit) Color.White else Color.Gray
                                )
                                Text(
                                    stringResource(R.string.free_unlocks_remaining, todayAdCount, dailyAdLimit),
                                    fontSize = 10.sp,
                                    color = Color.Gray
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Auto-unlock toggle
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color(0xFF181820))
                            .border(BorderStroke(1.dp, Color(0xFF282834)), RoundedCornerShape(14.dp))
                            .clickable { if (!isLoadingAd) onAutoUnlockToggle(!autoUnlockEnabled) }
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = stringResource(R.string.auto_unlock_title),
                                color = Color.White,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = stringResource(R.string.auto_unlock_desc),
                                color = Color.Gray,
                                fontSize = 11.sp
                            )
                        }
                        Switch(
                            checked = autoUnlockEnabled,
                            onCheckedChange = { if (!isLoadingAd) onAutoUnlockToggle(it) },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = CrimsonRed,
                                uncheckedThumbColor = Color.Gray,
                                uncheckedTrackColor = Color.DarkGray
                            )
                        )
                    }

                    TextButton(onClick = onDismiss, enabled = !isLoadingAd, modifier = Modifier.padding(top = 10.dp)) {
                        Text(stringResource(R.string.cancel).uppercase(), color = Color.Gray, fontWeight = FontWeight.Bold)
                    }
                }
                if (isLoadingAd) {
                    Box(
                        modifier = Modifier
                            .matchParentSize()
                            .background(Color.Black.copy(alpha = 0.72f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            CircularProgressIndicator(color = CrimsonRed)
                            Text(stringResource(R.string.loading_ad), color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EpisodesGridDialog(
    episodes: List<Episode>,
    currentEpisodeId: String?,
    unlockedStates: Map<String, Boolean>,
    isVipActive: Boolean,
    firstLockedIndex: Int,
    onDismiss: () -> Unit,
    onEpisodeClick: (Int, Episode) -> Unit
) {
    val rangeSize = 30
    val currentEpisodeIndex = episodes.indexOfFirst { it.id == currentEpisodeId }.coerceAtLeast(0)
    var selectedRangeIndex by remember(episodes.size, currentEpisodeId) {
        mutableIntStateOf(currentEpisodeIndex / rangeSize)
    }
    val rangeCount = ((episodes.size + rangeSize - 1) / rangeSize).coerceAtLeast(1)
    val rangeStart = selectedRangeIndex * rangeSize
    val visibleEpisodes = episodes.drop(rangeStart).take(rangeSize)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.75f))
                .clickable(onClick = onDismiss),
            contentAlignment = Alignment.BottomCenter
        ) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF121217)),
                border = BorderStroke(1.dp, Color(0xFF282834)),
                shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.65f)
                    .clickable(enabled = false) {}
            ) {
                Column(modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(stringResource(R.string.episodes).uppercase(), color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Black)
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                color = Color.White.copy(alpha = 0.08f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = "${episodes.size}",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.LightGray,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                )
                            }
                        }
                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.08f))
                        ) {
                            Icon(Icons.Default.Close, contentDescription = stringResource(R.string.close), tint = Color.White, modifier = Modifier.size(18.dp))
                        }
                    }

                    // Range selection pills
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(top = 12.dp, bottom = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        repeat(rangeCount) { rangeIndex ->
                            val start = rangeIndex * rangeSize + 1
                            val end = minOf((rangeIndex + 1) * rangeSize, episodes.size)
                            val selected = rangeIndex == selectedRangeIndex
                            Surface(
                                onClick = { selectedRangeIndex = rangeIndex },
                                color = if (selected) CrimsonRed else Color(0xFF1C1C24),
                                shape = RoundedCornerShape(12.dp),
                                border = if (selected) null else BorderStroke(1.dp, Color(0xFF2E2E3C))
                            ) {
                                Text(
                                    "$start-$end",
                                    color = if (selected) Color.White else Color.LightGray,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                                )
                            }
                        }
                    }

                    LazyVerticalGrid(
                        columns = GridCells.Fixed(5),
                        contentPadding = PaddingValues(top = 10.dp, bottom = 24.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        itemsIndexed(visibleEpisodes, key = { _, episode -> episode.id }) { localIndex, episode ->
                            val index = rangeStart + localIndex
                            val directlyUnlocked = isVipActive || (unlockedStates[episode.id] ?: !episode.isPremium)
                            val blockedByPrevious = firstLockedIndex >= 0 && index > firstLockedIndex
                            val isOpen = directlyUnlocked && !blockedByPrevious
                            val isCurrent = episode.id == currentEpisodeId
                            Surface(
                                onClick = { onEpisodeClick(index, episode) },
                                color = when {
                                    isCurrent -> CrimsonRed
                                    isOpen -> Color(0xFF1E1E26)
                                    else -> Color(0xFF131318)
                                },
                                shape = RoundedCornerShape(14.dp),
                                border = when {
                                    isCurrent -> BorderStroke(1.5.dp, Color(0xFFFF5252))
                                    isOpen -> BorderStroke(1.dp, Color(0xFF2E2E3C))
                                    else -> BorderStroke(1.dp, Color(0xFF202028))
                                },
                                modifier = Modifier.aspectRatio(1f)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    if (isOpen) {
                                        Text(
                                            episode.episodeNumber.toString(),
                                            color = Color.White,
                                            fontSize = 17.sp,
                                            fontWeight = FontWeight.Black
                                        )
                                    } else {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(
                                                Icons.Default.Lock,
                                                contentDescription = "Locked",
                                                tint = Color.Gray,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                episode.episodeNumber.toString(),
                                                color = Color.Gray,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun buildShareUrl(siteUrl: String, drama: Drama?, episode: Episode?): String {
    val base = siteUrl.trim().trimEnd('/').ifEmpty { "https://snapreels.gadohost.com" }
    val dramaId = drama?.id.orEmpty()
    return if (dramaId.isNotEmpty()) {
        "$base/share/$dramaId"
    } else {
        "$base/share"
    }
}

// ─── Single Episode Page Item ─────────────────────────────────────────────────
@Composable
fun EpisodePlayerPage(
    episode: Episode,
    drama: Drama?,
    isCurrentPage: Boolean,
    isUnlocked: Boolean,
    isLiked: Boolean,
    isFavorite: Boolean,
    displayLikes: Long,
    userProfile: com.example.data.UserProfileEntity?,
    onBack: () -> Unit,
    onLikeToggle: () -> Unit,
    onFavoriteToggle: () -> Unit,
    onShareClick: () -> Unit,
    onUnlockClick: () -> Unit,
    onEpisodesClick: () -> Unit,
    onVideoCompleted: () -> Unit,
    totalPages: Int,
    nextEpisodeUrl: String? = null,
    appSettings: com.example.data.AppSettings = com.example.data.AppSettings()
) {
    val context = LocalContext.current
    var isVideoPaused by remember { mutableStateOf(false) }
    var showPlayerControls by remember { mutableStateOf(true) }
    var isFullscreenMode by remember { mutableStateOf(false) }
    var lastInteractionTime by remember { mutableLongStateOf(0L) }
    var currentPositionMs by remember { mutableIntStateOf(0) }
    var durationMs by remember { mutableIntStateOf(0) }
    var isUserSeeking by remember { mutableStateOf(false) }
    var seekPositionMs by remember { mutableFloatStateOf(0f) }
    var zoomToFill by remember { mutableStateOf(true) }
    var playbackSpeed by remember { mutableFloatStateOf(1.0f) }
    var gestureLabel by remember { mutableStateOf<String?>(null) }
    var bufferedPositionMs by remember { mutableIntStateOf(0) }
    var isBuffering by remember(episode.id) { mutableStateOf(true) }
    var subtitlesEnabled by remember { mutableStateOf(true) }
    var selectedSubtitleIndex by remember { mutableIntStateOf(0) }
    var showSubtitleMenu by remember { mutableStateOf(false) }
    var currentCues by remember { mutableStateOf<List<androidx.media3.common.text.Cue>>(emptyList()) }
    var lastTapTimeMs by remember { mutableLongStateOf(0L) }
    var lastTapX by remember { mutableFloatStateOf(0f) }
    val gestureScope = rememberCoroutineScope()
    val currentIsPlaying by rememberUpdatedState(isCurrentPage && !isVideoPaused)

    LaunchedEffect(episode.id) {
        durationMs = 0
        currentPositionMs = 0
        bufferedPositionMs = 0
        isUserSeeking = false
        selectedSubtitleIndex = 0
        currentCues = emptyList()
    }

    val exoPlayer = remember(episode.id, context) {
        val extractorsFactory = androidx.media3.extractor.DefaultExtractorsFactory()
            .setConstantBitrateSeekingEnabled(true)
        val mediaSourceFactory = DefaultMediaSourceFactory(VideoCacheManager.getCacheDataSourceFactory(context), extractorsFactory)
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .build()
            .apply {
                playWhenReady = currentIsPlaying
                repeatMode = Player.REPEAT_MODE_OFF
                addListener(object : Player.Listener {
                    override fun onCues(cueGroup: androidx.media3.common.text.CueGroup) {
                        currentCues = cueGroup.cues
                    }
                    override fun onPlaybackStateChanged(playbackState: Int) {
                        isBuffering = (playbackState == Player.STATE_BUFFERING)
                        if (playbackState == Player.STATE_ENDED) {
                            onVideoCompleted()
                        }
                    }
                    override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                        android.util.Log.e("VideoPlayer", "Playback error: ${error.errorCodeName} - ${error.message}", error)
                        isBuffering = false
                    }
                    override fun onTimelineChanged(timeline: androidx.media3.common.Timeline, reason: Int) {
                        if (!timeline.isEmpty) {
                            val window = androidx.media3.common.Timeline.Window()
                            timeline.getWindow(0, window)
                            if (window.durationMs > 0 && window.durationMs != androidx.media3.common.C.TIME_UNSET) {
                                durationMs = window.durationMs.toInt()
                            }
                        }
                    }
                    override fun onEvents(player: Player, events: Player.Events) {
                        val dur = if (player.duration > 0 && player.duration != androidx.media3.common.C.TIME_UNSET) player.duration else player.contentDuration
                        if (dur > 0 && dur != androidx.media3.common.C.TIME_UNSET) {
                            durationMs = dur.toInt()
                        }
                    }
                })
            }
    }

    DisposableEffect(exoPlayer) {
        onDispose {
            exoPlayer.release()
        }
    }

    // Configure MediaItem and subtitles
    LaunchedEffect(episode.id, episode.videoUrl, episode.subtitles) {
        val isEmbed = episode.videoUrl.contains("<iframe", ignoreCase = true) || 
                      episode.videoUrl.contains("dailymotion.com", ignoreCase = true) || 
                      episode.videoUrl.contains("dai.ly", ignoreCase = true)
        if (!isEmbed && episode.videoUrl.isNotBlank()) {
            val base = com.example.data.AppConfig.API_URL.substringBefore("/api/mobile/v1").trimEnd('/')
            var cleanUrl = episode.videoUrl.trim()
            if (cleanUrl.startsWith("/")) {
                cleanUrl = "$base$cleanUrl"
            }
            val subtitleConfigs = episode.subtitles.mapIndexed { index, sub ->
                var subUrl = sub.url.trim()
                if (subUrl.startsWith("/")) {
                    subUrl = "$base$subUrl"
                }
                val isVtt = subUrl.contains(".vtt", ignoreCase = true) || !subUrl.contains(".srt", ignoreCase = true)
                androidx.media3.common.MediaItem.SubtitleConfiguration.Builder(Uri.parse(subUrl))
                    .setMimeType(if (isVtt) androidx.media3.common.MimeTypes.TEXT_VTT else androidx.media3.common.MimeTypes.APPLICATION_SUBRIP)
                    .setLanguage(sub.languageCode)
                    .setLabel(sub.language)
                    .setSelectionFlags(if (index == 0) androidx.media3.common.C.SELECTION_FLAG_DEFAULT else 0)
                    .build()
            }
            val mediaItemBuilder = MediaItem.Builder()
                .setUri(Uri.parse(cleanUrl))
                .setSubtitleConfigurations(subtitleConfigs)

            if (cleanUrl.contains(".m3u8", ignoreCase = true)) {
                mediaItemBuilder.setMimeType(androidx.media3.common.MimeTypes.APPLICATION_M3U8)
            } else if (cleanUrl.contains(".mpd", ignoreCase = true)) {
                mediaItemBuilder.setMimeType(androidx.media3.common.MimeTypes.APPLICATION_MPD)
            } else if (cleanUrl.contains(".ts", ignoreCase = true)) {
                mediaItemBuilder.setMimeType(androidx.media3.common.MimeTypes.VIDEO_MP2T)
            }

            val mediaItem = mediaItemBuilder.build()
            if (cleanUrl.contains(".m3u8", ignoreCase = true)) {
                val hlsSource = androidx.media3.exoplayer.hls.HlsMediaSource.Factory(
                    com.example.util.VideoCacheManager.getHttpDataSourceFactory()
                ).setAllowChunklessPreparation(true)
                 .createMediaSource(mediaItem)
                exoPlayer.setMediaSource(hlsSource)
            } else {
                exoPlayer.setMediaItem(mediaItem)
            }
            exoPlayer.prepare()
        }
    }

    LaunchedEffect(subtitlesEnabled, selectedSubtitleIndex, episode.subtitles, exoPlayer) {
        if (episode.subtitles.isNotEmpty()) {
            val selectedSub = episode.subtitles.getOrNull(selectedSubtitleIndex)
            val builder = exoPlayer.trackSelectionParameters.buildUpon()
                .setTrackTypeDisabled(androidx.media3.common.C.TRACK_TYPE_TEXT, !subtitlesEnabled)
            if (selectedSub != null && selectedSub.languageCode.isNotBlank()) {
                builder.setPreferredTextLanguage(selectedSub.languageCode)
            }
            exoPlayer.trackSelectionParameters = builder.build()
        } else {
            val builder = exoPlayer.trackSelectionParameters.buildUpon()
                .setTrackTypeDisabled(androidx.media3.common.C.TRACK_TYPE_TEXT, true)
            exoPlayer.trackSelectionParameters = builder.build()
        }
    }

    // Background pre-buffering of next episode (N+1)
    LaunchedEffect(nextEpisodeUrl) {
        if (!nextEpisodeUrl.isNullOrEmpty()) {
            VideoCacheManager.preCacheVideo(context, nextEpisodeUrl)
        }
    }

    LaunchedEffect(isCurrentPage, isUnlocked, episode.id, exoPlayer) {
        while (isActive && isCurrentPage && isUnlocked) {
            if (!isUserSeeking) {
                currentPositionMs = exoPlayer.currentPosition.coerceAtLeast(0).toInt()
            }
            val dur = if (exoPlayer.duration > 0 && exoPlayer.duration != androidx.media3.common.C.TIME_UNSET) exoPlayer.duration else exoPlayer.contentDuration
            if (dur > 0 && dur != androidx.media3.common.C.TIME_UNSET) {
                durationMs = dur.toInt()
            } else if (durationMs <= 0 && episode.durationSec > 0 && episode.durationSec != 120) {
                durationMs = episode.durationSec * 1000
            }
            bufferedPositionMs = exoPlayer.bufferedPosition.coerceAtLeast(0).toInt()
            delay(250)
        }
    }

    LaunchedEffect(currentIsPlaying) {
        if (currentIsPlaying) {
            exoPlayer.play()
        } else {
            exoPlayer.pause()
        }
    }

    LaunchedEffect(playbackSpeed) {
        try {
            exoPlayer.setPlaybackSpeed(playbackSpeed)
        } catch (_: Exception) {}
    }

    LaunchedEffect(showPlayerControls, isVideoPaused, lastInteractionTime) {
        if (showPlayerControls && !isVideoPaused) {
            delay(3000)
            showPlayerControls = false
        }
    }

    val isEmbedCode = episode.videoUrl.contains("<iframe", ignoreCase = true) || episode.videoUrl.contains("dailymotion.com", ignoreCase = true) || episode.videoUrl.contains("dai.ly", ignoreCase = true)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        if (isUnlocked) {

            if (isEmbedCode) {
                var finalHtmlUrl = episode.videoUrl
                if (!episode.videoUrl.contains("<iframe", ignoreCase = true)) {
                    val dmRegex = Regex("video/([a-zA-Z0-9]+)|dai\\.ly/([a-zA-Z0-9]+)")
                    val match = dmRegex.find(episode.videoUrl)
                    if (match != null) {
                        val id = match.groupValues[1].ifEmpty { match.groupValues[2] }
                        finalHtmlUrl = "<iframe src=\"https://www.dailymotion.com/embed/video/$id?autoplay=1\" width=\"100%\" height=\"100%\" allowfullscreen allow=\"autoplay\" style=\"border:none;\"></iframe>"
                    }
                }
                
                var iframeWidth = 1920f
                var iframeHeight = 1080f
                
                val widthMatch = Regex("width=[\"']?([0-9.]+)[\"']?", RegexOption.IGNORE_CASE).find(finalHtmlUrl)
                val heightMatch = Regex("height=[\"']?([0-9.]+)[\"']?", RegexOption.IGNORE_CASE).find(finalHtmlUrl)
                if (widthMatch != null && heightMatch != null) {
                    val w = widthMatch.groupValues[1].toFloatOrNull()
                    val h = heightMatch.groupValues[1].toFloatOrNull()
                    if (w != null && h != null && w > 0 && h > 0) {
                        iframeWidth = w
                        iframeHeight = h
                    }
                }
                
                if (episode.videoUrl.contains("shorts", ignoreCase = true) || finalHtmlUrl.contains("shorts", ignoreCase = true)) {
                    if (iframeWidth >= iframeHeight) {
                        iframeWidth = 1080f
                        iframeHeight = 1920f
                    }
                }
                
                val isHorizontal = (iframeWidth / iframeHeight) > 1.2f

                AndroidView(
                    factory = { ctx ->
                        android.webkit.WebView(ctx).apply {
                            settings.javaScriptEnabled = true
                            settings.domStorageEnabled = true
                            settings.mediaPlaybackRequiresUserGesture = false
                            settings.userAgentString = settings.userAgentString.replace("; wv", "")
                            settings.loadWithOverviewMode = false
                            settings.useWideViewPort = false
                            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                            android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                            
                            setOnTouchListener { _, event ->
                                if (event.action == android.view.MotionEvent.ACTION_DOWN) {
                                    showPlayerControls = true
                                    lastInteractionTime = System.currentTimeMillis()
                                }
                                false
                            }

                            webChromeClient = android.webkit.WebChromeClient()
                            webViewClient = object : android.webkit.WebViewClient() {
                                override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
                                    super.onPageFinished(view, url)
                                    isBuffering = false
                                }
                            }
                            setBackgroundColor(android.graphics.Color.BLACK)
                            layoutParams = android.view.ViewGroup.LayoutParams(
                                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                                android.view.ViewGroup.LayoutParams.MATCH_PARENT
                            )
                        }
                    },
                    update = { view ->
                        if (isCurrentPage) {
                            val doCover = !isHorizontal || zoomToFill
                            val htmlData = """
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                                    <style>
                                        * { margin: 0; padding: 0; box-sizing: border-box; }
                                        html, body { 
                                            width: 100%; 
                                            height: 100%; 
                                            background-color: black; 
                                            overflow: hidden; 
                                            position: relative;
                                        }
                                        .iframe-container {
                                            width: 100%;
                                            height: 100%;
                                            position: absolute;
                                            top: 0;
                                            left: 0;
                                            overflow: hidden;
                                            background-color: black;
                                        }
                                        iframe { 
                                            position: absolute !important;
                                            top: 50% !important;
                                            left: 50% !important;
                                            transform: translate(-50%, -50%) !important;
                                            border: none !important; 
                                            margin: 0 !important; 
                                            padding: 0 !important;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <div class="iframe-container">
                                        $finalHtmlUrl
                                    </div>
                                    <script>
                                        function resize() {
                                            var iframe = document.querySelector('iframe');
                                            if (!iframe) return;
                                            var winW = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
                                            var winH = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
                                            
                                            var targetRatio = $iframeWidth / $iframeHeight;
                                            var cover = $doCover;
                                            
                                            if (cover) {
                                                var w = winW;
                                                var h = winW / targetRatio;
                                                if (h < winH) {
                                                    h = winH;
                                                    w = winH * targetRatio;
                                                }
                                                iframe.style.width = Math.round(w) + 'px';
                                                iframe.style.height = Math.round(h) + 'px';
                                                iframe.style.position = 'absolute';
                                                iframe.style.top = '50%';
                                                iframe.style.left = '50%';
                                                iframe.style.transform = 'translate(-50%, -50%)';
                                            } else {
                                                iframe.style.width = '100%';
                                                iframe.style.height = '100%';
                                                iframe.style.position = 'absolute';
                                                iframe.style.top = '0';
                                                iframe.style.left = '0';
                                                iframe.style.transform = 'none';
                                            }
                                        }
                                        
                                        window.addEventListener('resize', resize);
                                        document.addEventListener('DOMContentLoaded', resize);
                                        setTimeout(resize, 50);
                                        setTimeout(resize, 300);
                                        resize();
                                    </script>
                                </body>
                                </html>
                            """.trimIndent()
                            
                            val currentUrl = view.tag as? String
                            if (currentUrl != episode.videoUrl) {
                                view.tag = episode.videoUrl
                                view.loadDataWithBaseURL("https://snapreels.gadohost.com/", htmlData, "text/html", "UTF-8", null)
                            }
                            
                            if (isVideoPaused) {
                                view.evaluateJavascript("document.querySelectorAll('video').forEach(v => v.pause()); document.querySelectorAll('iframe').forEach(i => i.contentWindow.postMessage('{\"event\":\"command\",\"func\":\"pauseVideo\",\"args\":\"\"}', '*'));", null)
                            } else {
                                view.evaluateJavascript("document.querySelectorAll('video').forEach(v => v.play()); document.querySelectorAll('iframe').forEach(i => i.contentWindow.postMessage('{\"event\":\"command\",\"func\":\"playVideo\",\"args\":\"\"}', '*'));", null)
                            }
                        } else {
                            // Force stop playback when swiping away
                            view.evaluateJavascript("document.querySelectorAll('video').forEach(v => v.pause()); document.querySelectorAll('iframe').forEach(i => i.contentWindow.postMessage('{\"event\":\"command\",\"func\":\"pauseVideo\",\"args\":\"\"}', '*'));", null)
                        }
                    },
                    modifier = Modifier.fillMaxSize().testTag("webview_${episode.id}")
                )
            } else {
                AndroidView(
                    factory = { ctx ->
                        PlayerView(ctx).apply {
                            useController = false
                            player = exoPlayer
                            resizeMode = if (zoomToFill) AspectRatioFrameLayout.RESIZE_MODE_ZOOM else AspectRatioFrameLayout.RESIZE_MODE_FIT
                            layoutParams = android.view.ViewGroup.LayoutParams(
                                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                                android.view.ViewGroup.LayoutParams.MATCH_PARENT
                            )
                            subtitleView?.visibility = android.view.View.GONE
                        }
                    },
                    update = { view ->
                        view.resizeMode = if (zoomToFill) AspectRatioFrameLayout.RESIZE_MODE_ZOOM else AspectRatioFrameLayout.RESIZE_MODE_FIT
                        if (view.player != exoPlayer) {
                            view.player = exoPlayer
                        }
                    },
                    modifier = Modifier
                        .fillMaxSize()
                        .testTag("video_view_${episode.id}")
                )
            }

            if (isBuffering && isUnlocked) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.25f)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = CrimsonRed, modifier = Modifier.size(52.dp))
                }
            }

            // Tap to play/pause. Hold right for 2x speed; hold left to rewind.
            if (!isEmbedCode) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .pointerInput(isUnlocked, episode.id) {
                            awaitEachGesture {
                            val down = awaitFirstDown()
                            var longPressTriggered = false
                            val holdJob = gestureScope.launch {
                                delay(viewConfiguration.longPressTimeoutMillis)
                                longPressTriggered = true
                                if (down.position.x >= size.width / 2f) {
                                    gestureLabel = "2X"
                                    try {
                                        exoPlayer.setPlaybackSpeed(2f)
                                    } catch (_: Exception) {
                                    }
                                } else {
                                    gestureLabel = "2X REWIND"
                                    while (isActive) {
                                        exoPlayer.seekTo((exoPlayer.currentPosition - 1_000).coerceAtLeast(0))
                                        delay(500)
                                    }
                                }
                            }
                            val up = waitForUpOrCancellation()
                            holdJob.cancel()
                            if (longPressTriggered) {
                                try {
                                    exoPlayer.setPlaybackSpeed(playbackSpeed)
                                } catch (_: Exception) {
                                }
                                gestureLabel = null
                            } else if (up != null) {
                                val now = System.currentTimeMillis()
                                val isCenter = down.position.x >= size.width * 0.30f && down.position.x <= size.width * 0.70f
                                val isDoubleTap = (now - lastTapTimeMs < 350L) && !isCenter &&
                                    ((down.position.x >= size.width / 2f && lastTapX >= size.width / 2f) || 
                                     (down.position.x < size.width / 2f && lastTapX < size.width / 2f))

                                if (isDoubleTap) {
                                    lastTapTimeMs = 0L
                                    val isRight = down.position.x >= size.width / 2f
                                    val newPos = if (isRight) {
                                        (exoPlayer.currentPosition + 10_000).coerceAtMost(exoPlayer.duration.coerceAtLeast(0))
                                    } else {
                                        (exoPlayer.currentPosition - 10_000).coerceAtLeast(0)
                                    }
                                    exoPlayer.seekTo(newPos)
                                    currentPositionMs = newPos.toInt()
                                    gestureLabel = if (isRight) "+10s ⏭️" else "⏮️ -10s"
                                    gestureScope.launch {
                                        delay(800)
                                        if (gestureLabel == "+10s ⏭️" || gestureLabel == "⏮️ -10s") {
                                            gestureLabel = null
                                        }
                                    }
                                    lastInteractionTime = System.currentTimeMillis()
                                } else {
                                    lastTapTimeMs = now
                                    lastTapX = down.position.x
                                    lastInteractionTime = System.currentTimeMillis()
                                    if (!showPlayerControls) {
                                        showPlayerControls = true
                                    } else if (isCenter) {
                                        isVideoPaused = !isVideoPaused
                                        if (isVideoPaused) exoPlayer.pause() else exoPlayer.play()
                                    }
                                }
                            }
                        }
                    }
            ) {
                gestureLabel?.let { label ->
                    val align = when (label) {
                        "⏮️ -10s", "2X REWIND" -> Alignment.CenterStart
                        "+10s ⏭️", "2X" -> Alignment.CenterEnd
                        else -> Alignment.Center
                    }
                    val padStart = if (align == Alignment.CenterStart) 40.dp else 0.dp
                    val padEnd = if (align == Alignment.CenterEnd) 40.dp else 0.dp
                    Box(
                        modifier = Modifier
                            .align(align)
                            .padding(start = padStart, end = padEnd)
                            .clip(RoundedCornerShape(20.dp))
                            .background(Color.Black.copy(alpha = 0.75f))
                            .padding(horizontal = 24.dp, vertical = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(label, color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp)
                    }
                }

                // Central player controls when visible
                if (showPlayerControls && isUnlocked) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.65f))
                            .clickable {
                                isVideoPaused = !isVideoPaused
                                if (isVideoPaused) exoPlayer.pause() else exoPlayer.play()
                                lastInteractionTime = System.currentTimeMillis()
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isVideoPaused) Icons.Default.PlayArrow else Icons.Default.Pause,
                            contentDescription = if (isVideoPaused) "Play" else "Pause",
                            tint = Color.White,
                            modifier = Modifier.size(40.dp)
                        )
                    }
                } else if (isVideoPaused) {
                    Box(
                        modifier = Modifier.align(Alignment.Center)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.5f))
                                .clickable {
                                    isVideoPaused = false
                                    exoPlayer.play()
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.PlayArrow,
                                contentDescription = "Play",
                                tint = Color.White,
                                modifier = Modifier.size(40.dp)
                            )
                        }
                    }
                }
            }
            } // End of if (!isEmbedCode)

        } else {
            // ── Locked Episode Screen ──────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(DarkerSlate)
                    .testTag("premium_lock_screen"),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(24.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(MetallicGold.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = null,
                            tint = MetallicGold,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(18.dp))
                    Text(stringResource(R.string.premium_lock_msg), fontSize = 22.sp, fontWeight = FontWeight.Black, color = Color.White)
                    Text(
                        stringResource(R.string.episode_number_label, episode.episodeNumber) + ": ${episode.title}",
                        fontSize = 14.sp, color = Color.Gray,
                        modifier = Modifier.padding(top = 4.dp),
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = onUnlockClick,
                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth(0.85f).height(48.dp)
                    ) {
                        Icon(imageVector = Icons.Default.MonetizationOn, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(stringResource(R.string.unlock_coins, episode.coinCost), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(stringResource(R.string.balance_coins_label, userProfile?.coinBalance ?: 0), fontSize = 12.sp, color = Color.LightGray)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        stringResource(R.string.swipe_navigation_hint),
                        fontSize = 10.sp,
                        color = Color.Gray,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }

        // ── Persistent Top bar: Back + Episode index ───────────────────────
        if (!isUnlocked || showPlayerControls) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 8.dp)
                    .align(Alignment.TopCenter),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (!isFullscreenMode) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.5f))
                            .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.18f)), CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ChevronLeft,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        color = Color.Black.copy(alpha = 0.55f),
                        shape = RoundedCornerShape(20.dp),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.18f))
                    ) {
                        Text(
                            text = stringResource(R.string.episode_of_total, episode.episodeNumber, totalPages),
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.weight(1f))
                IconButton(
                    onClick = {
                        isFullscreenMode = !isFullscreenMode
                        lastInteractionTime = System.currentTimeMillis()
                    },
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.5f))
                        .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.18f)), CircleShape)
                ) {
                    Icon(
                        imageVector = if (isFullscreenMode) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                        contentDescription = "Fullscreen",
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }
        }

        // ── Bottom gradient overlay ───────────────────────────────────────
        if (!isFullscreenMode && showPlayerControls) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.35f)
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.90f))
                        )
                    )
            )
        }

        // ── Bottom-left: Drama + Episode info ────────────────────────────
        if (!isFullscreenMode && showPlayerControls) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth(0.72f)
                    .navigationBarsPadding()
                    .padding(start = 16.dp, bottom = 96.dp), // Clear bottom controls
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Category badge
                if (drama != null) {
                    Surface(color = CrimsonRed, shape = RoundedCornerShape(4.dp)) {
                        Text(
                            text = drama.category.uppercase(),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                        )
                    }
                }

                // Drama title
                Text(
                    text = drama?.title ?: "",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    maxLines = 2
                )
            }
        }

        // ── Bottom-right: Action buttons (TikTok style) ──────────────────
        if (!isFullscreenMode && showPlayerControls) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .navigationBarsPadding()
                    .padding(end = 14.dp, bottom = 100.dp), // Clear bottom controls
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                // ❤️ Like with count
                OverlayActionButton(
                    icon = if (isLiked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                    valueText = formatLikes(displayLikes),
                    tint = if (isLiked) CrimsonRed else Color.White,
                    isHighlighted = isLiked,
                    onClick = onLikeToggle
                )

                // 🔖 Add to Watchlist
                OverlayActionButton(
                    icon = if (isFavorite) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder,
                    valueText = if (isFavorite) stringResource(R.string.saved) else stringResource(R.string.save),
                    tint = if (isFavorite) MetallicGold else Color.White,
                    isHighlighted = isFavorite,
                    onClick = onFavoriteToggle
                )

                // 🪙 Episodes list grid
                OverlayActionButton(
                    icon = Icons.Default.GridView,
                    valueText = stringResource(R.string.episodes),
                    tint = MetallicGold,
                    onClick = onEpisodesClick
                )

                // 🔗 Share (copies real URL)
                OverlayActionButton(
                    icon = Icons.Default.Share,
                    valueText = stringResource(R.string.share),
                    tint = Color.White,
                    onClick = onShareClick
                )
            }
        }

        // ── Persistent Bottom Seekbar and Controls ──────────────────────────
        if (isUnlocked && !isFullscreenMode && showPlayerControls && !isEmbedCode) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp)
            ) {
                Box(
                    modifier = Modifier.fillMaxWidth().height(20.dp),
                    contentAlignment = Alignment.Center
                ) {
                    val bufferRatio = if (durationMs > 0) (bufferedPositionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f) else 0f
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(Color.White.copy(alpha = 0.2f))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(bufferRatio)
                                .fillMaxHeight()
                                .background(Color.White.copy(alpha = 0.65f))
                        )
                    }

                    val sliderMax = durationMs.coerceAtLeast(1).toFloat()
                    val sliderValue = if (isUserSeeking) {
                        seekPositionMs.coerceIn(0f, sliderMax)
                    } else {
                        currentPositionMs.toFloat().coerceIn(0f, sliderMax)
                    }

                    Slider(
                        value = sliderValue,
                        onValueChange = { value ->
                            if (durationMs > 0) {
                                isUserSeeking = true
                                seekPositionMs = value
                                lastInteractionTime = System.currentTimeMillis()
                            }
                        },
                        onValueChangeFinished = {
                            if (isUserSeeking && durationMs > 0) {
                                isUserSeeking = false
                                currentPositionMs = seekPositionMs.toInt()
                                exoPlayer.seekTo(seekPositionMs.toLong())
                                lastInteractionTime = System.currentTimeMillis()
                            }
                        },
                        valueRange = 0f..sliderMax,
                        colors = SliderDefaults.colors(
                            thumbColor = CrimsonRed,
                            activeTrackColor = CrimsonRed,
                            inactiveTrackColor = Color.Transparent
                        ),
                        modifier = Modifier.fillMaxWidth().height(20.dp)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "${formatVideoTime(currentPositionMs)} / ${formatVideoTime(durationMs)}",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Playback speed cycle button
                        Text(
                            text = "${playbackSpeed}x",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(Color.White.copy(alpha = 0.12f))
                                .clickable {
                                    val nextSpeed = when (playbackSpeed) {
                                        1.0f -> 1.25f
                                        1.25f -> 1.5f
                                        1.5f -> 2.0f
                                        else -> 1.0f
                                    }
                                    playbackSpeed = nextSpeed
                                    try {
                                        exoPlayer.setPlaybackSpeed(nextSpeed)
                                    } catch (_: Exception) {}
                                    lastInteractionTime = System.currentTimeMillis()
                                }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        )

                        if (episode.subtitles.isNotEmpty()) {
                            // Subtitles [CC] button
                            Box {
                                Text(
                                    text = "CC",
                                    color = if (subtitlesEnabled) Color(0xFFFFD700) else Color.White.copy(alpha = 0.5f),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(if (subtitlesEnabled) Color(0xFFFFD700).copy(alpha = 0.2f) else Color.White.copy(alpha = 0.12f))
                                        .border(
                                            width = 1.dp,
                                            color = if (subtitlesEnabled) Color(0xFFFFD700).copy(alpha = 0.6f) else Color.Transparent,
                                            shape = RoundedCornerShape(6.dp)
                                        )
                                        .clickable {
                                            if (episode.subtitles.size > 1) {
                                                showSubtitleMenu = !showSubtitleMenu
                                            } else {
                                                subtitlesEnabled = !subtitlesEnabled
                                            }
                                            lastInteractionTime = System.currentTimeMillis()
                                        }
                                        .padding(horizontal = 9.dp, vertical = 6.dp)
                                )

                                DropdownMenu(
                                    expanded = showSubtitleMenu,
                                    onDismissRequest = { showSubtitleMenu = false },
                                    modifier = Modifier.background(Color(0xFF1E1E26))
                                ) {
                                    DropdownMenuItem(
                                        text = {
                                            Text(
                                                text = if (!subtitlesEnabled) "✓ Subtitles Off" else "Subtitles Off",
                                                color = if (!subtitlesEnabled) Color(0xFFFFD700) else Color.White,
                                                fontSize = 13.sp
                                            )
                                        },
                                        onClick = {
                                            subtitlesEnabled = false
                                            showSubtitleMenu = false
                                            lastInteractionTime = System.currentTimeMillis()
                                        }
                                    )
                                    episode.subtitles.forEachIndexed { idx, sub ->
                                        val isSelected = subtitlesEnabled && selectedSubtitleIndex == idx
                                        DropdownMenuItem(
                                            text = {
                                                Text(
                                                    text = if (isSelected) "✓ ${sub.language} (${sub.languageCode.uppercase()})" else "${sub.language} (${sub.languageCode.uppercase()})",
                                                    color = if (isSelected) Color(0xFFFFD700) else Color.White,
                                                    fontSize = 13.sp
                                                )
                                            },
                                            onClick = {
                                                subtitlesEnabled = true
                                                selectedSubtitleIndex = idx
                                                showSubtitleMenu = false
                                                lastInteractionTime = System.currentTimeMillis()
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // High-contrast, beautiful Compose Subtitle Overlay (always visible when subtitles enabled)
        if (isUnlocked && subtitlesEnabled && currentCues.isNotEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .padding(bottom = if (showPlayerControls) 115.dp else 48.dp, start = 20.dp, end = 20.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    currentCues.forEach { cue ->
                        val cueText = cue.text?.toString().orEmpty()
                        if (cueText.isNotBlank()) {
                            Surface(
                                color = Color.Black.copy(alpha = 0.78f),
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.25f))
                            ) {
                                Text(
                                    text = cueText,
                                    color = Color.White,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Video Player Watermark Overlay (العلامة المائية)
        if (appSettings.watermarkEnabled && appSettings.watermarkUrl.isNotBlank()) {
            val alignment = when (appSettings.watermarkPosition.lowercase()) {
                "top-left" -> Alignment.TopStart
                "bottom-left" -> Alignment.BottomStart
                "bottom-right" -> Alignment.BottomEnd
                else -> Alignment.TopEnd
            }
            val paddingModifier = when (appSettings.watermarkPosition.lowercase()) {
                "top-left" -> Modifier.padding(top = 56.dp, start = 16.dp)
                "bottom-left" -> Modifier.padding(bottom = if (showPlayerControls) 120.dp else 48.dp, start = 16.dp)
                "bottom-right" -> Modifier.padding(bottom = if (showPlayerControls) 120.dp else 48.dp, end = 16.dp)
                else -> Modifier.padding(top = 56.dp, end = 16.dp)
            }

            AsyncImage(
                model = appSettings.watermarkUrl,
                contentDescription = "Watermark",
                modifier = Modifier
                    .align(alignment)
                    .then(paddingModifier)
                    .height(28.dp)
                    .widthIn(max = 100.dp)
                    .graphicsLayer(alpha = appSettings.watermarkOpacity),
                contentScale = ContentScale.Fit
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Format large like counts (e.g. 12400 → 12.4K)
// ─────────────────────────────────────────────────────────────────────────────
private fun formatLikes(count: Long): String {
    return when {
        count >= 1_000_000 -> "${String.format("%.1f", count / 1_000_000.0)}M"
        count >= 1_000 -> "${String.format("%.1f", count / 1_000.0)}K"
        else -> count.toString()
    }
}

private fun formatVideoTime(milliseconds: Int): String {
    val totalSeconds = (milliseconds.coerceAtLeast(0) / 1_000)
    val hours = totalSeconds / 3_600
    val minutes = (totalSeconds % 3_600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%02d:%02d", minutes, seconds)
    }
}

private tailrec fun Context.findActivity(): ComponentActivity? {
    return when (this) {
        is ComponentActivity -> this
        is ContextWrapper -> baseContext.findActivity()
        else -> null
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERLAY ACTION BUTTON (used in VideoPlayerScreen)
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun OverlayActionButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    valueText: String,
    tint: Color,
    isHighlighted: Boolean = false,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable { onClick() }
    ) {
        Surface(
            shape = CircleShape,
            color = if (isHighlighted) Color.Black.copy(alpha = 0.65f) else Color.Black.copy(alpha = 0.45f),
            border = BorderStroke(1.dp, if (isHighlighted) tint.copy(alpha = 0.5f) else Color.White.copy(alpha = 0.18f)),
            modifier = Modifier.size(48.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = tint,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = valueText,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
    }
}
