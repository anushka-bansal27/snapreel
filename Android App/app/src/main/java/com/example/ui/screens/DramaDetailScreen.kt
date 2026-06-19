package com.example.ui.screens

import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.example.data.Episode
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.DarkerSlate
import com.example.ui.theme.MetallicGold
import com.example.viewmodel.SnapReelsViewModel
import com.example.R
import androidx.compose.ui.res.stringResource

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DramaDetailScreen(navController: NavController, viewModel: SnapReelsViewModel) {
    val context = LocalContext.current
    val drama by viewModel.selectedDrama.collectAsState()
    val episodes by viewModel.episodes.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()
    val isVipActive by viewModel.isVipActive.collectAsState()
    val unlockedStates by viewModel.unlockedStates.collectAsState()
    val favorites by viewModel.favoriteDramas.collectAsState()
    val history by viewModel.watchHistory.collectAsState()
    val appSettings by viewModel.appSettings.collectAsState()

    val currentLang = remember { com.example.util.CategoryTranslator.getAppLanguage(context) }
    val isArabic = remember(currentLang) { currentLang.startsWith("ar") }
    var isDescriptionExpanded by remember { mutableStateOf(false) }

    // Dialog state for buying episode
    var episodeToUnlock by remember { mutableStateOf<Episode?>(null) }
    var showUnlockDialog by remember { mutableStateOf(false) }

    if (drama == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = CrimsonRed)
        }
        return
    }

    val isFavorite = favorites.any { it.dramaId == drama!!.id }
    val firstLockedIndex = episodes.indexOfFirst { ep ->
        !(isVipActive || (unlockedStates[ep.id] ?: !ep.isPremium))
    }

    if (showUnlockDialog && episodeToUnlock != null) {
        androidx.compose.ui.window.Dialog(
            onDismissRequest = { showUnlockDialog = false },
            properties = androidx.compose.ui.window.DialogProperties(dismissOnBackPress = true, dismissOnClickOutside = true)
        ) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF14141A)),
                border = BorderStroke(1.dp, Color(0xFF282834)),
                shape = RoundedCornerShape(22.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(22.dp)
                ) {
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
                                text = stringResource(R.string.coins_count_label, userProfile?.coinBalance ?: 0),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MetallicGold
                            )
                        }
                    }

                    Text(
                        text = stringResource(R.string.unlock_title, episodeToUnlock!!.title),
                        fontWeight = FontWeight.Black,
                        fontSize = 19.sp,
                        color = Color.White,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    Text(
                        text = stringResource(R.string.unlock_premium_desc, episodeToUnlock!!.coinCost),
                        color = Color.Gray,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 4.dp, bottom = 20.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )

                    val hasEnough = (userProfile?.coinBalance ?: 0) >= episodeToUnlock!!.coinCost
                    Button(
                        onClick = {
                            if (!viewModel.requireLogin { showUnlockDialog = false; navController.navigate("login") }) return@Button
                            showUnlockDialog = false
                            if (hasEnough) {
                                viewModel.unlockPremiumEpisode(episodeToUnlock!!) { success ->
                                    if (success) {
                                        Toast.makeText(context, context.getString(R.string.episode_unlocked_msg), Toast.LENGTH_SHORT).show()
                                        viewModel.selectEpisode(episodeToUnlock!!)
                                        navController.navigate("player")
                                    } else {
                                        Toast.makeText(context, context.getString(R.string.transaction_failed_msg), Toast.LENGTH_SHORT).show()
                                    }
                                }
                            } else {
                                Toast.makeText(context, context.getString(R.string.insufficient_coins_toast), Toast.LENGTH_LONG).show()
                                navController.navigate("topup")
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) {
                        Text(
                            text = if (hasEnough) stringResource(R.string.unlock_now_coins, episodeToUnlock!!.coinCost) else stringResource(R.string.insufficient_balance),
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp
                        )
                    }

                    TextButton(
                        onClick = { showUnlockDialog = false },
                        modifier = Modifier.padding(top = 10.dp)
                    ) {
                        Text(text = stringResource(R.string.cancel).uppercase(), color = Color.Gray, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0A0E))
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .navigationBarsPadding()
        ) {
            item {
                // Backdrop cover image with cinematic gradient
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(340.dp)
                ) {
                    AsyncImage(
                        model = drama!!.coverUrl,
                        contentDescription = "Drama Backdrop",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )

                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Black.copy(alpha = 0.35f),
                                        Color(0xFF0A0A0E).copy(alpha = 0.65f),
                                        Color(0xFF0A0A0E)
                                    ),
                                    startY = 60f
                                )
                            )
                    )
                }
            }

            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Drama Title
                    Text(
                        text = drama!!.title,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        lineHeight = 32.sp
                    )

                    // Metadata Badges (Rating 4.8 removed completely)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val localizedCat = com.example.util.CategoryTranslator.localizeForLang(drama!!.category, currentLang)
                        Surface(
                            color = CrimsonRed.copy(alpha = 0.90f),
                            shape = RoundedCornerShape(6.dp),
                            border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.2f))
                        ) {
                            Text(
                                text = localizedCat.uppercase(),
                                color = Color.White,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 11.sp,
                                modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp)
                            )
                        }

                        Surface(
                            color = Color.White.copy(alpha = 0.10f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = stringResource(R.string.episodes_title_count, drama!!.totalEpisodes),
                                color = Color.White.copy(alpha = 0.9f),
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }

                        Surface(
                            color = Color.White.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = "${drama!!.releaseYear}",
                                color = Color.LightGray,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 11.sp,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }

                        Surface(
                            color = Color.White.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(6.dp),
                            border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.2f))
                        ) {
                            Text(
                                text = "HD",
                                color = Color.White.copy(alpha = 0.85f),
                                fontWeight = FontWeight.Black,
                                fontSize = 10.sp,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 4.dp)
                            )
                        }
                    }

                    // Tags list as scrollable LazyRow
                    if (drama!!.tags.isNotEmpty()) {
                        androidx.compose.foundation.lazy.LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(drama!!.tags) { tag ->
                                Surface(
                                    color = Color.White.copy(alpha = 0.06f),
                                    shape = RoundedCornerShape(30.dp),
                                    border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.10f))
                                ) {
                                    Text(
                                        text = tag,
                                        color = Color(0xFFB4B4C4),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                                    )
                                }
                            }
                        }
                    }

                    // Expandable Description
                    if (drama!!.description.isNotBlank()) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text(
                                text = drama!!.description,
                                fontSize = 13.sp,
                                color = Color.White.copy(alpha = 0.75f),
                                lineHeight = 20.sp,
                                maxLines = if (isDescriptionExpanded) 20 else 3,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (drama!!.description.length > 90) {
                                Text(
                                    text = if (isDescriptionExpanded) {
                                        when {
                                            currentLang.startsWith("ar") -> "عرض أقل"
                                            currentLang.startsWith("zh") -> "收起"
                                            currentLang.startsWith("hi") -> "कम दिखाएं"
                                            else -> "Show less"
                                        }
                                    } else {
                                        when {
                                            currentLang.startsWith("ar") -> "عرض المزيد"
                                            currentLang.startsWith("zh") -> "展开更多..."
                                            currentLang.startsWith("hi") -> "और दिखाएं..."
                                            else -> "More..."
                                        }
                                    },
                                    color = CrimsonRed,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .padding(top = 4.dp)
                                        .clickable { isDescriptionExpanded = !isDescriptionExpanded }
                                )
                            }
                        }
                    }

                    // Watch Target from History or Episode 1
                    val lastWatched = remember(history, drama) {
                        history.firstOrNull { it.seriesId == drama!!.id }
                    }
                    val targetEpisode = remember(lastWatched, episodes) {
                        if (lastWatched != null) {
                            episodes.find { it.episodeNumber == lastWatched.episodeInSeason } ?: episodes.firstOrNull()
                        } else {
                            episodes.firstOrNull()
                        }
                    }

                    // Big Primary CTA Button
                    Button(
                        onClick = {
                            if (targetEpisode != null) {
                                val canWatchTarget = isVipActive || (unlockedStates[targetEpisode.id] ?: !targetEpisode.isPremium)
                                if (canWatchTarget) {
                                    viewModel.playDramaDirect(drama!!) {
                                        viewModel.selectEpisode(targetEpisode)
                                        navController.navigate("player")
                                    }
                                } else {
                                    if (viewModel.requireLogin { navController.navigate("login") }) {
                                        episodeToUnlock = targetEpisode
                                        showUnlockDialog = true
                                    }
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (lastWatched != null && lastWatched.episodeInSeason > 1) {
                                when {
                                    currentLang.startsWith("ar") -> "استئناف الحلقة ${lastWatched.episodeInSeason}"
                                    currentLang.startsWith("zh") -> "继续观看第 ${lastWatched.episodeInSeason} 集"
                                    currentLang.startsWith("hi") -> "एपिसोड ${lastWatched.episodeInSeason} पुनः शुरू करें"
                                    else -> "Resume Episode ${lastWatched.episodeInSeason}"
                                }
                            } else {
                                stringResource(R.string.watch_full)
                            },
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    // Secondary Actions: Favorite & Share
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Favorite / My List Button
                        OutlinedButton(
                            onClick = {
                                if (viewModel.requireLogin { navController.navigate("login") }) {
                                    viewModel.toggleFavorite(drama!!.id)
                                }
                            },
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, if (isFavorite) CrimsonRed else Color.White.copy(alpha = 0.15f)),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = if (isFavorite) CrimsonRed.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.05f)
                            ),
                            modifier = Modifier.weight(1f).height(46.dp)
                        ) {
                            Icon(
                                imageVector = if (isFavorite) Icons.Default.Check else Icons.Default.BookmarkBorder,
                                contentDescription = null,
                                tint = if (isFavorite) CrimsonRed else Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (isFavorite) {
                                    when {
                                        currentLang.startsWith("ar") -> "في قائمتي"
                                        currentLang.startsWith("zh") -> "已加入追剧"
                                        currentLang.startsWith("hi") -> "मेरी सूची में है"
                                        else -> "In My List"
                                    }
                                } else {
                                    when {
                                        currentLang.startsWith("ar") -> "قائمتي"
                                        currentLang.startsWith("zh") -> "追剧"
                                        currentLang.startsWith("hi") -> "मेरी सूची"
                                        else -> "My List"
                                    }
                                },
                                color = if (isFavorite) CrimsonRed else Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }

                        // Share Button
                        OutlinedButton(
                            onClick = {
                                val base = appSettings.siteUrl.trim().trimEnd('/').ifEmpty { "https://snapreels.gadohost.com" }
                                val shareUrl = "$base/share/${drama!!.id}"
                                openAndroidShareChooser(context, drama!!.title, shareUrl)
                            },
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.15f)),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = Color.White.copy(alpha = 0.05f)
                            ),
                            modifier = Modifier.weight(1f).height(46.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = "Share",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = when {
                                    currentLang.startsWith("ar") -> "مشاركة"
                                    currentLang.startsWith("zh") -> "分享"
                                    currentLang.startsWith("hi") -> "साझा करें"
                                    else -> "Share"
                                },
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    // Episodes Section Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp, bottom = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = stringResource(R.string.episodes_title_count, drama!!.totalEpisodes),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                        Text(
                            text = when {
                                currentLang.startsWith("ar") -> "تم التحديث بالكامل"
                                currentLang.startsWith("zh") -> "全集已更新"
                                currentLang.startsWith("hi") -> "सभी एपिसोड अपडेट किए गए"
                                else -> "All Episodes"
                            },
                            fontSize = 12.sp,
                            color = Color.Gray,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Episodes List items
            items(episodes) { ep ->
                val episodeIndex = episodes.indexOfFirst { it.id == ep.id }
                val isUnlocked = isVipActive || (unlockedStates[ep.id] ?: !ep.isPremium)

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 5.dp)
                        .clickable {
                            val target = if (firstLockedIndex >= 0 && episodeIndex > firstLockedIndex) {
                                episodes[firstLockedIndex]
                            } else {
                                ep
                            }
                            val canWatchTarget = isVipActive || (unlockedStates[target.id] ?: !target.isPremium)
                            if (canWatchTarget) {
                                viewModel.selectEpisode(target)
                                navController.navigate("player")
                            } else {
                                if (viewModel.requireLogin { navController.navigate("login") }) {
                                    episodeToUnlock = target
                                    showUnlockDialog = true
                                }
                            }
                        }
                        .testTag("episode_card_${ep.episodeNumber}"),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isUnlocked) Color(0xFF16161E) else Color(0xFF121217)
                    ),
                    border = BorderStroke(1.dp, if (isUnlocked) Color(0xFF282834) else Color(0xFF1E1E26)),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (isUnlocked) CrimsonRed else Color(0xFF22222C)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (isUnlocked) Icons.Default.PlayArrow else Icons.Default.Lock,
                                    contentDescription = null,
                                    tint = if (isUnlocked) Color.White else Color.Gray,
                                    modifier = Modifier.size(18.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(14.dp))

                            Column {
                                Text(
                                    text = stringResource(R.string.episode_number_label, ep.episodeNumber),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isUnlocked) Color.White else Color.Gray
                                )
                                val isDuplicate = ep.title.isBlank() ||
                                    ep.title.trim().equals("Episode ${ep.episodeNumber}", ignoreCase = true) ||
                                    ep.title.trim().equals("الحلقة ${ep.episodeNumber}", ignoreCase = true) ||
                                    ep.title.trim() == "${ep.episodeNumber}"
                                if (!isDuplicate) {
                                    Text(
                                        text = ep.title,
                                        fontSize = 11.sp,
                                        color = Color.Gray,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }

                        // Dynamic Unlock Banner
                        if (!isUnlocked) {
                            Surface(
                                color = MetallicGold.copy(alpha = 0.12f),
                                border = BorderStroke(1.dp, MetallicGold.copy(alpha = 0.3f)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.MonetizationOn,
                                        contentDescription = null,
                                        tint = MetallicGold,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text(
                                        text = stringResource(R.string.coins_count_label, ep.coinCost),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Black,
                                        color = MetallicGold
                                    )
                                }
                            }
                        } else {
                            if (ep.isPremium) {
                                Surface(
                                    color = Color(0xFF10B981).copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(
                                        text = if (isVipActive) stringResource(R.string.vip) else stringResource(R.string.unlocked),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFF10B981),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            } else {
                                Surface(
                                    color = CrimsonRed.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(
                                        text = stringResource(R.string.free),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Black,
                                        color = CrimsonRed,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(30.dp))
            }
        }

        // Header floating navigation bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = { navController.popBackStack() },
                modifier = Modifier
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.5f))
                    .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.18f)), CircleShape)
                    .testTag("back_button")
            ) {
                Icon(
                    imageVector = Icons.Default.ArrowBack,
                    contentDescription = null,
                    tint = Color.White
                )
            }

            IconButton(
                onClick = {
                    if (viewModel.requireLogin { navController.navigate("login") }) {
                        viewModel.toggleFavorite(drama!!.id)
                    }
                },
                modifier = Modifier
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.5f))
                    .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.18f)), CircleShape)
                    .testTag("toggle_favorite_button")
            ) {
                Icon(
                    imageVector = if (isFavorite) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                    contentDescription = stringResource(R.string.mylist_favorite),
                    tint = if (isFavorite) CrimsonRed else Color.White
                )
            }
        }
    }
}
