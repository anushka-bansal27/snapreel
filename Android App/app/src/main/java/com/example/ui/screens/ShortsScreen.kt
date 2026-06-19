package com.example.ui.screens

import android.net.Uri
import android.widget.Toast
import android.widget.VideoView
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.example.R
import com.example.data.Drama
import com.example.util.VideoCacheManager
import com.example.data.Episode
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.DarkerSlate
import com.example.ui.theme.MetallicGold
import com.example.viewmodel.SnapReelsViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive



@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun ShortsScreen(navController: NavController, viewModel: SnapReelsViewModel) {
    val context = LocalContext.current
    val siteUrl by viewModel.siteUrl.collectAsState()

    val shortItems by viewModel.preloadedShorts.collectAsState()
    val isPreloading by viewModel.isPreloadingShorts.collectAsState()

    LaunchedEffect(Unit) {
        if (shortItems.isEmpty()) {
            viewModel.loadShorts(force = true)
        }
    }

    val likedSeriesIds by viewModel.likedSeriesIds.collectAsState()
    val favorites by viewModel.favoriteDramas.collectAsState()
    val appSettings by viewModel.appSettings.collectAsState()

    // Capture the initial liked state of the dramas when shortItems is loaded,
    // to dynamically calculate the correct offset for displaying likes.
    val initialLikedIds = remember(shortItems) {
        likedSeriesIds.intersect(shortItems.map { it.drama.id }.toSet())
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        if (shortItems.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                if (isPreloading) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        CircularProgressIndicator(color = CrimsonRed)
                        Text(
                            stringResource(R.string.loading_shorts),
                            color = Color.Gray,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                } else {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        modifier = Modifier.padding(horizontal = 32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayCircleOutline,
                            contentDescription = null,
                            tint = Color.Gray,
                            modifier = Modifier.size(56.dp)
                        )
                        Text(
                            text = "No Shorts available",
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Tap below to refresh and load videos",
                            color = Color.Gray,
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Button(
                            onClick = { viewModel.loadShorts(force = true) },
                            colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Retry", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        } else {
            val lifecycleOwner = LocalLifecycleOwner.current
            val lifecycleState by lifecycleOwner.lifecycle.currentStateFlow.collectAsState()
            val isLifecycleResumed = lifecycleState.isAtLeast(Lifecycle.State.RESUMED)

            val pagerState = rememberPagerState(pageCount = { shortItems.size })

            VerticalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                val item = shortItems[page]
                val isCurrentPage = page == pagerState.currentPage && isLifecycleResumed

                val isLiked = likedSeriesIds.contains(item.drama.id)
                val wasInitiallyLiked = initialLikedIds.contains(item.drama.id)
                val displayLikes = item.drama.likes + when {
                    isLiked && !wasInitiallyLiked -> 1
                    !isLiked && wasInitiallyLiked -> -1
                    else -> 0
                }

                val isSaved = favorites.any { it.dramaId == item.drama.id }

                // Build share URL
                val shareUrl = buildShareUrl(siteUrl, item.drama, item.episode)

                ShortsPageItem(
                    drama = item.drama,
                    episode = item.episode,
                    isPlaying = isCurrentPage,
                    isLiked = isLiked,
                    isSaved = isSaved,
                    displayLikes = displayLikes,
                    onLikeToggle = {
                        if (viewModel.requireLogin { navController.navigate("login") }) {
                            viewModel.toggleLike(item.drama.id) { success ->
                                if (!success) {
                                    Toast.makeText(context, "Could not update like. Please try again.", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    },
                    onSaveToggle = {
                        if (viewModel.requireLogin { navController.navigate("login") }) {
                            viewModel.toggleFavorite(item.drama.id)
                        }
                    },
                    onEpisodesClick = {
                        viewModel.playDramaDirect(item.drama) {
                            viewModel.selectEpisode(item.episode)
                            viewModel.setAutoOpenEpisodes(true)
                            navController.navigate("player")
                        }
                    },
                    onShare = {
                        openAndroidShareChooser(context, item.drama.title, shareUrl)
                    },
                    onWatchFull = {
                        viewModel.playDramaDirect(item.drama) {
                            viewModel.selectEpisode(item.episode)
                            navController.navigate("player")
                        }
                    },
                    appSettings = appSettings
                )
            }

            // Swipe hint at the very bottom (only shown briefly until first swipe)
            if (pagerState.currentPage == 0) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 100.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Surface(
                        color = Color.Black.copy(alpha = 0.45f),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.SwipeUp,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = stringResource(R.string.swipe_up_hint),
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

// ─── Helper to build share URL ────────────────────────────────────────────────
private fun buildShareUrl(siteUrl: String, drama: Drama, episode: Episode): String {
    val base = siteUrl.trim().trimEnd('/').ifEmpty { "https://snapreels.gadohost.com" }
    val dramaId = drama.id
    return if (dramaId.isNotEmpty()) {
        "$base/share/$dramaId"
    } else {
        "$base/share"
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SHORTS PAGE
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun ShortsPageItem(
    drama: Drama,
    episode: Episode,
    isPlaying: Boolean,
    isLiked: Boolean,
    isSaved: Boolean,
    displayLikes: Long,
    onLikeToggle: () -> Unit,
    onSaveToggle: () -> Unit,
    onEpisodesClick: () -> Unit,
    onShare: () -> Unit,
    onWatchFull: () -> Unit,
    appSettings: com.example.data.AppSettings = com.example.data.AppSettings()
) {
    var isVideoPaused by remember { mutableStateOf(false) }
    var isBuffering by remember(episode.id) { mutableStateOf(true) }
    var durationMs by remember { mutableIntStateOf(0) }
    var bufferedPositionMs by remember { mutableIntStateOf(0) }
    var currentPositionMs by remember { mutableIntStateOf(0) }
    var currentCues by remember { mutableStateOf<List<androidx.media3.common.text.Cue>>(emptyList()) }
    
    val currentIsPlaying by rememberUpdatedState(isPlaying && !isVideoPaused)
    val context = LocalContext.current
    
    val exoPlayer = remember(episode.id, context) {
        val extractorsFactory = androidx.media3.extractor.DefaultExtractorsFactory()
            .setConstantBitrateSeekingEnabled(true)
        val mediaSourceFactory = DefaultMediaSourceFactory(VideoCacheManager.getCacheDataSourceFactory(context), extractorsFactory)
        
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .build()
            .apply {
                playWhenReady = currentIsPlaying
                repeatMode = Player.REPEAT_MODE_ALL
                addListener(object : Player.Listener {
                    override fun onCues(cueGroup: androidx.media3.common.text.CueGroup) {
                        currentCues = cueGroup.cues
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
                    override fun onPlaybackStateChanged(state: Int) {
                        isBuffering = state == Player.STATE_BUFFERING
                    }
                    override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                        android.util.Log.e("ShortsPlayer", "Playback error: ${error.errorCodeName} - ${error.message}", error)
                        isBuffering = false
                    }
                })
            }
    }

    DisposableEffect(exoPlayer) {
        onDispose {
            exoPlayer.release()
        }
    }

    LaunchedEffect(episode.videoUrl, episode.subtitles) {
        val base = com.example.data.AppConfig.API_URL.substringBefore("/api/mobile/v1").trimEnd('/')
        var cleanUrl = episode.videoUrl.trim()
        if (cleanUrl.startsWith("/")) {
            cleanUrl = "$base$cleanUrl"
        }
        val subtitleConfigs = episode.subtitles.map { sub ->
            var subUrl = sub.url.trim()
            if (subUrl.startsWith("/")) {
                subUrl = "$base$subUrl"
            }
            val isVtt = subUrl.contains(".vtt", ignoreCase = true) || !subUrl.contains(".srt", ignoreCase = true)
            androidx.media3.common.MediaItem.SubtitleConfiguration.Builder(android.net.Uri.parse(subUrl))
                .setMimeType(if (isVtt) androidx.media3.common.MimeTypes.TEXT_VTT else androidx.media3.common.MimeTypes.APPLICATION_SUBRIP)
                .setLanguage(sub.languageCode)
                .setLabel(sub.language)
                .setSelectionFlags(androidx.media3.common.C.SELECTION_FLAG_DEFAULT)
                .build()
        }
        val mediaItemBuilder = MediaItem.Builder()
            .setUri(cleanUrl)
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

    LaunchedEffect(currentIsPlaying) {
        if (currentIsPlaying) {
            exoPlayer.play()
        } else {
            exoPlayer.pause()
        }
    }

    LaunchedEffect(isPlaying, episode.id) {
        while (isActive && isPlaying) {
            currentPositionMs = exoPlayer.currentPosition.coerceAtLeast(0).toInt()
            bufferedPositionMs = exoPlayer.bufferedPosition.coerceAtLeast(0).toInt()
            delay(250)
        }
    }

    val cleanTitle = remember(episode.title, episode.episodeNumber) {
        val epLabel = "Episode ${episode.episodeNumber}"
        val epLabelCol = "$epLabel:"
        val titleTrim = episode.title.trim()
        if (titleTrim.equals(epLabel, ignoreCase = true)) {
            epLabel
        } else if (titleTrim.startsWith(epLabelCol, ignoreCase = true)) {
            titleTrim
        } else if (titleTrim.startsWith(epLabel, ignoreCase = true)) {
            val rest = titleTrim.substring(epLabel.length).trimStart(':', ' ')
            if (rest.isEmpty()) epLabel else "$epLabel: $rest"
        } else {
            "$epLabel: $titleTrim"
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = {
                        isVideoPaused = !isVideoPaused
                        if (isVideoPaused) exoPlayer.pause() else exoPlayer.play()
                    }
                )
            }
    ) {
        // ── Video Player ──────────────────────────────────────────────────
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    useController = false
                    resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                    player = exoPlayer
                    subtitleView?.visibility = android.view.View.GONE
                }
            },
            update = { view ->
                if (view.player != exoPlayer) {
                    view.player = exoPlayer
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        if (isBuffering) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.25f)),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = CrimsonRed, modifier = Modifier.size(48.dp))
            }
        }

        // Middle screen tap to pause/play
        Box(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTapGestures(
                        onTap = {
                            isVideoPaused = !isVideoPaused
                        }
                    )
                }
        ) {
            if (isVideoPaused) {
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.55f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Paused",
                        tint = Color.White,
                        modifier = Modifier.size(46.dp)
                    )
                }
            }
        }

        // ── Bottom gradient overlay ────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.55f)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.88f))
                    )
                )
        )

        // ── High-Contrast Compose Subtitle Overlay ───────────────────────
        if (currentCues.isNotEmpty()) {
            val subtitleText = currentCues.mapNotNull { it.text?.toString() }.filter { it.isNotBlank() }.joinToString("\n")
            if (subtitleText.isNotBlank()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 120.dp, start = 20.dp, end = 20.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Surface(
                        color = Color.Black.copy(alpha = 0.78f),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.25f))
                    ) {
                        Text(
                            text = subtitleText,
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

        // ── Bottom-left: Drama & Episode info ─────────────────────────────
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth(0.72f)
                .padding(start = 16.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            // Category badge
            Surface(
                color = CrimsonRed,
                shape = RoundedCornerShape(6.dp),
                border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.25f)),
                modifier = Modifier.padding(bottom = 4.dp)
            ) {
                Text(
                    text = drama.category.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                )
            }

            // Drama title
            Text(
                text = drama.title,
                fontSize = 19.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
                maxLines = 2,
                lineHeight = 23.sp
            )

            // Episode label
            Text(
                text = cleanTitle,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White.copy(alpha = 0.85f)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Watch Full Series button
            Surface(
                onClick = onWatchFull,
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                shadowElevation = 4.dp,
                modifier = Modifier.height(38.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayCircle,
                        contentDescription = null,
                        tint = CrimsonRed,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = stringResource(R.string.watch_full),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.Black
                    )
                }
            }
        }

        // ── Bottom-right: Action buttons (TikTok style) ───────────────────
        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 14.dp, bottom = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Like
            ShortsActionButton(
                icon = if (isLiked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                label = formatLikes(displayLikes),
                tint = if (isLiked) CrimsonRed else Color.White,
                isHighlighted = isLiked,
                onClick = onLikeToggle
            )

            // Save
            ShortsActionButton(
                icon = if (isSaved) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder,
                label = if (isSaved) stringResource(R.string.saved) else stringResource(R.string.save),
                tint = if (isSaved) MetallicGold else Color.White,
                isHighlighted = isSaved,
                onClick = onSaveToggle
            )

            // Episodes
            ShortsActionButton(
                icon = Icons.Default.GridView,
                label = stringResource(R.string.episodes),
                tint = MetallicGold,
                onClick = onEpisodesClick
            )

            // Share
            ShortsActionButton(
                icon = Icons.Default.Share,
                label = stringResource(R.string.share),
                tint = Color.White,
                onClick = onShare
            )
        }

        // ── YouTube-style Buffer & Progress Line at Bottom ────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(3.dp)
                .align(Alignment.BottomCenter)
                .background(Color.White.copy(alpha = 0.2f))
        ) {
            val bufferRatio = if (durationMs > 0) (bufferedPositionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f) else 0f
            val progressRatio = if (durationMs > 0) (currentPositionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f) else 0f
            Box(
                modifier = Modifier
                    .fillMaxWidth(bufferRatio)
                    .fillMaxHeight()
                    .background(Color.White.copy(alpha = 0.65f))
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth(progressRatio)
                    .fillMaxHeight()
                    .background(CrimsonRed)
            )
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
                "top-left" -> Modifier.padding(top = 48.dp, start = 16.dp)
                "bottom-left" -> Modifier.padding(bottom = 120.dp, start = 16.dp)
                "bottom-right" -> Modifier.padding(bottom = 120.dp, end = 16.dp)
                else -> Modifier.padding(top = 48.dp, end = 16.dp)
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

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE ACTION BUTTON FOR SHORTS OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun ShortsActionButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
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
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
    }
}
