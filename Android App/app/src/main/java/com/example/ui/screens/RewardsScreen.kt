package com.example.ui.screens

import android.app.Activity
import android.content.ClipboardManager
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Share
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.ui.graphics.Brush
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Handshake
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material.icons.filled.Link
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.DarkerSlate
import com.example.ui.theme.MetallicGold
import com.example.viewmodel.SnapReelsViewModel
import androidx.compose.ui.res.stringResource
import com.example.R
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.navigation.NavController
import androidx.compose.material.icons.filled.ArrowBack
import com.example.data.*
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.platform.LocalLifecycleOwner
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback

data class PendingTaskProgress(
    val id: String,
    val title: String,
    val url: String,
    val requiredSeconds: Int,
    val startTime: Long
)

@Composable
fun RewardsScreen(navController: NavController, viewModel: SnapReelsViewModel) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val userProfile by viewModel.userProfile.collectAsState()
    val checkInMessage by viewModel.checkInMessage.collectAsState()
    val appSettings by viewModel.appSettings.collectAsState()
    val claimedTaskIds by viewModel.claimedTaskIds.collectAsState()
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()

    LaunchedEffect(isLoggedIn) {
        if (!isLoggedIn) {
            navController.navigate("login") {
                popUpTo("rewards") { inclusive = true }
            }
        }
    }

    val scope = rememberCoroutineScope()
    val activeLinkTimers = remember { mutableStateMapOf<String, Int>() }
    val readyToClaimTasks = remember { mutableStateMapOf<String, Boolean>() }
    val clickTimestamps = remember { mutableStateMapOf<String, Long>() }
    var pendingTask by remember { mutableStateOf<PendingTaskProgress?>(null) }
    var earlyReturnDialog by remember { mutableStateOf<Pair<PendingTaskProgress, Int>?>(null) }

    var isLoadingRewardedAd by remember { mutableStateOf(false) }
    var showEnterCodeDialog by remember { mutableStateOf(false) }
    var enteredInviteCode by remember { mutableStateOf("") }
    var isClaimingCode by remember { mutableStateOf(false) }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                val current = pendingTask
                if (current != null) {
                    val now = System.currentTimeMillis()
                    val secondsStayed = ((now - current.startTime) / 1000).toInt()
                    if (secondsStayed < current.requiredSeconds) {
                        // User returned too early from external link/profile!
                        earlyReturnDialog = Pair(current, secondsStayed.coerceAtLeast(1))
                        activeLinkTimers.remove(current.id)
                        readyToClaimTasks[current.id] = false
                        pendingTask = null
                    } else {
                        // User successfully stayed for the required duration!
                        activeLinkTimers.remove(current.id)
                        readyToClaimTasks[current.id] = true
                        pendingTask = null
                    }
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    LaunchedEffect(checkInMessage) {
        checkInMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearCheckInMessage()
        }
    }

    LaunchedEffect(Unit) {
        MobileAds.initialize(context) {}
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0C0C10))
            .statusBarsPadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                IconButton(
                    onClick = { navController.popBackStack() },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                }
                Text(
                    text = stringResource(R.string.coin_rewards_title),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
            }
            Text(
                text = stringResource(R.string.rewards_screen_subtitle),
                fontSize = 12.sp,
                color = Color.Gray,
                modifier = Modifier.padding(top = 2.dp, bottom = 18.dp)
            )

            // Dynamic Coin Dashboard Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("rewards_coin_card"),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF16161E)),
                border = BorderStroke(1.dp, MetallicGold.copy(alpha = 0.35f)),
                shape = RoundedCornerShape(20.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.horizontalGradient(
                                colors = listOf(Color(0xFF221C14), Color(0xFF16161E))
                            )
                        )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = stringResource(R.string.active_digital_balance).uppercase(),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.Gray,
                                letterSpacing = 1.sp
                            )
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(top = 4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.MonetizationOn,
                                    contentDescription = "Coins",
                                    tint = MetallicGold,
                                    modifier = Modifier.size(28.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "${userProfile?.coinBalance ?: 0}",
                                    fontSize = 32.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = stringResource(R.string.coins_suffix),
                                    fontSize = 14.sp,
                                    color = MetallicGold,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(top = 8.dp)
                                )
                            }
                        }
     
                        Surface(
                            color = CrimsonRed.copy(alpha = 0.15f),
                            border = BorderStroke(1.dp, CrimsonRed.copy(alpha = 0.35f)),
                            shape = RoundedCornerShape(30.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = null,
                                    tint = CrimsonRed,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = stringResource(R.string.streak_day, userProfile?.checkInStreak ?: 0),
                                    color = CrimsonRed,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────────
            // Viral Referral & Invite Friends Section
            // ─────────────────────────────────────────────────────────────────
            val referralCode = userProfile?.referralCode.takeIf { !it.isNullOrBlank() }
                ?: (userProfile?.publicId?.takeIf { it.isNotBlank() }?.let { "SNAP-${it.take(6).uppercase()}" } ?: "")

            if (referralCode.isNotEmpty() || appSettings.referralEnabled) {
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF151520)),
                    border = BorderStroke(1.dp, MetallicGold.copy(alpha = 0.35f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        // Title & Subtitle Row
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(MetallicGold.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CardGiftcard,
                                    contentDescription = null,
                                    tint = MetallicGold,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Column {
                                Text(
                                    text = stringResource(R.string.invite_friends_title),
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = stringResource(R.string.invite_friends_desc, appSettings.referralRewardCoins),
                                    fontSize = 11.sp,
                                    color = Color.Gray
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Referral Code Box
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFF0D0D12))
                                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    text = "YOUR INVITE CODE",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MetallicGold,
                                    letterSpacing = 1.sp
                                )
                                Text(
                                    text = referralCode.ifEmpty { "SNAP-REEL" },
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White,
                                    letterSpacing = 1.sp
                                )
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                // Copy Button
                                Button(
                                    onClick = {
                                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                        val clip = ClipData.newPlainText("Referral Code", referralCode)
                                        clipboard.setPrimaryClip(clip)
                                        Toast.makeText(context, context.getString(R.string.referral_copied_toast), Toast.LENGTH_SHORT).show()
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.1f)),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                    modifier = Modifier.height(34.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ContentCopy,
                                        contentDescription = "Copy",
                                        tint = Color.White,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(text = stringResource(R.string.copy_code), fontSize = 11.sp, color = Color.White)
                                }

                                // Share Button
                                Button(
                                    onClick = {
                                        val shareText = "Watch addictive short dramas on SnapReels! Use my invite code $referralCode to get +${appSettings.referredBonusCoins} free coins: ${appSettings.siteUrl.ifEmpty { "https://snapreels.com" }}"
                                        val sendIntent = Intent().apply {
                                            action = Intent.ACTION_SEND
                                            putExtra(Intent.EXTRA_TEXT, shareText)
                                            type = "text/plain"
                                        }
                                        context.startActivity(Intent.createChooser(sendIntent, "Invite Friends"))
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                    modifier = Modifier.height(34.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Share,
                                        contentDescription = "Share",
                                        tint = Color.White,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(text = stringResource(R.string.share_code), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Referral Stats & Redeem Button Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                                Column {
                                    Text(text = stringResource(R.string.friends_invited_label), fontSize = 10.sp, color = Color.Gray)
                                    Text(text = "${userProfile?.referralCount ?: 0}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                                Column {
                                    Text(text = stringResource(R.string.coins_earned_label), fontSize = 10.sp, color = Color.Gray)
                                    Text(text = "+${userProfile?.referralEarnings ?: 0}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MetallicGold)
                                }
                            }

                            if (userProfile?.referredBy.isNullOrBlank()) {
                                TextButton(
                                    onClick = { showEnterCodeDialog = true },
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = stringResource(R.string.have_invite_code_btn),
                                        fontSize = 11.sp,
                                        color = MetallicGold,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            } else {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Color(0xFF22C55E).copy(alpha = 0.15f))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = stringResource(R.string.invite_bonus_claimed),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF22C55E)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 7 Days Check-In Section
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
            ) {
                Text(
                    text = stringResource(R.string.daily_check_in).uppercase(),
                    fontSize = 13.sp,
                    color = MetallicGold,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp
                )
                Text(
                    text = "7 Days Streak",
                    fontSize = 11.sp,
                    color = Color.Gray,
                    fontWeight = FontWeight.SemiBold
                )
            }
 
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                val rewardDays = appSettings.dailyRewards.takeIf { it.isNotEmpty() } ?: listOf(10, 15, 20, 25, 30, 40, 50)
                val activeStreak = userProfile?.checkInStreak ?: 0
                val totalDays = rewardDays.size
                for (dayIndex in 0 until totalDays) {
                    val dayNum = dayIndex + 1
                    val amount = rewardDays[dayIndex]
                    val isCompleted = dayNum <= activeStreak
                    val isJackpot = dayNum == totalDays

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                when {
                                    isCompleted -> CrimsonRed.copy(alpha = 0.2f)
                                    isJackpot -> Color(0xFF261E14)
                                    else -> Color(0xFF16161D)
                                }
                            )
                            .border(
                                width = 1.dp,
                                color = when {
                                    isCompleted -> CrimsonRed
                                    isJackpot -> MetallicGold.copy(alpha = 0.6f)
                                    else -> Color(0xFF282834)
                                },
                                shape = RoundedCornerShape(12.dp)
                            )
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = stringResource(R.string.day_x, dayNum),
                                fontSize = 9.sp,
                                color = if (isCompleted) CrimsonRed else if (isJackpot) MetallicGold else Color.Gray,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Icon(
                                imageVector = when {
                                    isCompleted -> Icons.Default.CheckCircle
                                    isJackpot -> Icons.Default.CardGiftcard
                                    else -> Icons.Default.MonetizationOn
                                },
                                contentDescription = null,
                                tint = if (isCompleted) CrimsonRed else MetallicGold,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "+$amount",
                                fontSize = 11.sp,
                                color = Color.White,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = { viewModel.checkInToday() },
                colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("claim_checkin_button")
            ) {
                Text(
                    text = stringResource(R.string.claim_bonus),
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp
                )
            }
 
            Spacer(modifier = Modifier.height(28.dp))
 
            // Activities / Action Check List Tasks
            Text(
                text = stringResource(R.string.task_rewards),
                fontSize = 13.sp,
                color = MetallicGold,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(bottom = 12.dp)
            )
 
            val tasks = appSettings.rewardTasks
 
            val activeTasks = tasks.filter { it.id !in claimedTaskIds }
 
            if (activeTasks.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = stringResource(R.string.all_tasks_completed),
                        color = Color.Gray,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            } else {
                activeTasks.forEach { task ->
                    val isTimerActive = (activeLinkTimers[task.id] ?: 0) > 0
                    val isReadyToClaim = readyToClaimTasks[task.id] == true
 
                    val icon = if (task.type == "ad") Icons.Default.Tv else Icons.Default.Link
 
                    val actionLabel = when {
                        task.type == "ad" -> stringResource(R.string.watch)
                        isTimerActive -> "${activeLinkTimers[task.id]}s"
                        isReadyToClaim -> stringResource(R.string.claim)
                        else -> stringResource(R.string.go)
                    }
 
                    val enabled = !isTimerActive && !isLoadingRewardedAd
 
                    val desc = if (task.type == "ad") {
                        stringResource(R.string.task_ad_desc, task.coins)
                    } else {
                        val secs = if (task.timerSeconds > 0) task.timerSeconds else 5
                        stringResource(R.string.task_link_desc, secs, task.coins)
                    }

                    TaskItem(
                        title = task.title,
                        desc = desc,
                        coinsText = "+${task.coins}",
                        icon = icon,
                        actionLabel = actionLabel,
                        isLoading = task.type == "ad" && isLoadingRewardedAd,
                        enabled = enabled
                    ) {
                        if (task.type == "ad") {
                            val activity = context as? Activity
                            if (activity == null) {
                                Toast.makeText(context, context.getString(R.string.could_not_open_ad), Toast.LENGTH_SHORT).show()
                            } else {
                                AdsManager.loadAndShowRewarded(
                                    activity = activity,
                                    appSettings = appSettings,
                                    onRewarded = {
                                        isLoadingRewardedAd = false
                                        viewModel.claimReward(task.id, task.coins) { success ->
                                            Toast.makeText(
                                                context,
                                                if (success) context.getString(R.string.claimed_coins_msg, task.coins) else context.getString(R.string.failed_claim_reward),
                                                Toast.LENGTH_SHORT
                                            ).show()
                                        }
                                    },
                                    onError = { errMsg ->
                                        isLoadingRewardedAd = false
                                        Toast.makeText(context, "Ad unavailable: $errMsg", Toast.LENGTH_SHORT).show()
                                    },
                                    onStarted = {
                                        isLoadingRewardedAd = true
                                    }
                                )
                            }
                        } else {
                            if (isReadyToClaim) {
                                viewModel.claimReward(task.id, task.coins) { success ->
                                    if (success) {
                                        Toast.makeText(context, context.getString(R.string.claimed_coins_msg, task.coins), Toast.LENGTH_SHORT).show()
                                        readyToClaimTasks.remove(task.id)
                                        activeLinkTimers.remove(task.id)
                                        clickTimestamps.remove(task.id)
                                    } else {
                                        Toast.makeText(context, context.getString(R.string.failed_claim_reward), Toast.LENGTH_SHORT).show()
                                    }
                                }
                            } else {
                                // Clicked "Go"
                                val duration = if (task.timerSeconds > 0) task.timerSeconds else 5
                                val progress = PendingTaskProgress(
                                    id = task.id,
                                    title = task.title,
                                    url = task.url,
                                    requiredSeconds = duration,
                                    startTime = System.currentTimeMillis()
                                )
                                pendingTask = progress
                                activeLinkTimers[task.id] = duration
                                try {
                                    if (task.url.isNotEmpty()) {
                                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(task.url))
                                        context.startActivity(intent)
                                    }
                                } catch (_: Exception) {
                                    pendingTask = null
                                    activeLinkTimers.remove(task.id)
                                    Toast.makeText(context, "Could not open link", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(50.dp))
        }

        // Early Return Alert Dialog: Enforces that the user actually stays on the page/profile
        earlyReturnDialog?.let { (task, stayedSecs) ->
            AlertDialog(
                onDismissRequest = { earlyReturnDialog = null },
                containerColor = Color(0xFF16161E),
                shape = RoundedCornerShape(20.dp),
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Campaign,
                            contentDescription = null,
                            tint = CrimsonRed,
                            modifier = Modifier.size(26.dp)
                        )
                        Text(
                            text = stringResource(R.string.task_incomplete_title),
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = stringResource(R.string.task_incomplete_msg, stayedSecs, task.requiredSeconds),
                            color = Color.LightGray,
                            fontSize = 13.sp,
                            lineHeight = 19.sp
                        )
                        Text(
                            text = task.title,
                            color = MetallicGold,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val progress = PendingTaskProgress(
                                id = task.id,
                                title = task.title,
                                url = task.url,
                                requiredSeconds = task.requiredSeconds,
                                startTime = System.currentTimeMillis()
                            )
                            pendingTask = progress
                            activeLinkTimers[task.id] = task.requiredSeconds
                            earlyReturnDialog = null
                            try {
                                if (task.url.isNotEmpty()) {
                                    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(task.url))
                                    context.startActivity(intent)
                                }
                            } catch (_: Exception) {
                                pendingTask = null
                                activeLinkTimers.remove(task.id)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = stringResource(R.string.task_continue_btn),
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = { earlyReturnDialog = null }
                    ) {
                        Text(
                            text = stringResource(R.string.task_dismiss_btn),
                            color = Color.Gray,
                            fontSize = 13.sp
                        )
                    }
                }
            )
        }

        if (showEnterCodeDialog) {
            AlertDialog(
                onDismissRequest = { if (!isClaimingCode) showEnterCodeDialog = false },
                containerColor = Color(0xFF181822),
                shape = RoundedCornerShape(20.dp),
                title = {
                    Text(
                        text = stringResource(R.string.enter_invite_code_title),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp
                    )
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "Enter a friend's referral code to instantly claim +${appSettings.referredBonusCoins} free bonus coins!",
                            color = Color.Gray,
                            fontSize = 12.sp
                        )
                        OutlinedTextField(
                            value = enteredInviteCode,
                            onValueChange = { enteredInviteCode = it.uppercase() },
                            placeholder = { Text(stringResource(R.string.enter_invite_code_hint), color = Color.DarkGray, fontSize = 12.sp) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = MetallicGold,
                                unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                                cursorColor = MetallicGold
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (enteredInviteCode.isBlank()) return@Button
                            isClaimingCode = true
                            viewModel.claimReferralCode(enteredInviteCode.trim()) { success, message ->
                                isClaimingCode = false
                                Toast.makeText(context, message, Toast.LENGTH_LONG).show()
                                if (success) {
                                    showEnterCodeDialog = false
                                    enteredInviteCode = ""
                                }
                            }
                        },
                        enabled = !isClaimingCode && enteredInviteCode.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = MetallicGold),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        if (isClaimingCode) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.Black, strokeWidth = 2.dp)
                        } else {
                            Text(stringResource(R.string.claim_invite_btn), color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = { showEnterCodeDialog = false },
                        enabled = !isClaimingCode
                    ) {
                        Text(stringResource(R.string.task_dismiss_btn), color = Color.Gray)
                    }
                }
            )
        }
    }
}

@Composable
fun TaskItem(
    title: String,
    desc: String,
    coinsText: String,
    icon: ImageVector,
    actionLabel: String,
    isLoading: Boolean = false,
    enabled: Boolean = true,
    onActionClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 5.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF16161E)),
        border = BorderStroke(1.dp, Color(0xFF242430)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(CrimsonRed.copy(alpha = 0.15f))
                    .border(BorderStroke(1.dp, CrimsonRed.copy(alpha = 0.3f)), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = icon, contentDescription = null, tint = CrimsonRed, modifier = Modifier.size(22.dp))
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text(text = desc, fontSize = 11.sp, color = Color.Gray, modifier = Modifier.padding(top = 2.dp))
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(horizontalAlignment = Alignment.End) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.MonetizationOn,
                        contentDescription = null,
                        tint = MetallicGold,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(3.dp))
                    Text(text = coinsText, fontSize = 15.sp, fontWeight = FontWeight.Black, color = MetallicGold)
                }
                Spacer(modifier = Modifier.height(6.dp))
                Button(
                    onClick = { if (enabled) onActionClick() },
                    colors = ButtonDefaults.buttonColors(containerColor = if (enabled) CrimsonRed else Color.DarkGray),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 2.dp),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.height(30.dp)
                ) {
                    Text(text = actionLabel, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
