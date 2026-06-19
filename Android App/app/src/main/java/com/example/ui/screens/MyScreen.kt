package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.graphics.Brush
import com.example.data.AppConfig
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.DarkerSlate
import com.example.ui.theme.MetallicGold
import com.example.viewmodel.SnapReelsViewModel
import androidx.compose.ui.res.stringResource
import com.example.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.text.SimpleDateFormat
import java.util.Locale
import java.time.Instant
import androidx.compose.material.icons.filled.WorkspacePremium

@Composable
fun MyScreen(
    navController: NavController,
    viewModel: SnapReelsViewModel,
    onTabChange: (String) -> Unit = {}
) {
    var currentSubScreen by remember { mutableStateOf("profile") }

    when (currentSubScreen) {
        "profile" -> MyProfileContent(
            navController = navController,
            viewModel = viewModel,
            onTabChange = onTabChange,
            onSettingsClick = { currentSubScreen = "settings" }
        )
        "settings" -> MySettingsContent(
            viewModel = viewModel,
            onBackClick = { currentSubScreen = "profile" },
            onDeleteAccountClick = { currentSubScreen = "delete-account" }
        )
        "delete-account" -> DeleteAccountContent(
            viewModel = viewModel,
            onBackClick = { currentSubScreen = "settings" }
        )
    }
}

@Composable
fun MyProfileContent(
    navController: NavController,
    viewModel: SnapReelsViewModel,
    onTabChange: (String) -> Unit,
    onSettingsClick: () -> Unit
) {
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val profile by viewModel.userProfile.collectAsState()
    val appSettings by viewModel.appSettings.collectAsState()
    val context = LocalContext.current

    val firebaseUser = remember(isLoggedIn) { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser }
    val displayEmail = firebaseUser?.email ?: profile?.email ?: "visitor"
    val displayUsername = profile?.username?.takeIf { it.isNotEmpty() } ?: firebaseUser?.displayName ?: displayEmail.substringBefore("@")
    val displayId = profile?.publicId?.takeIf { it.isNotEmpty() } ?: firebaseUser?.uid?.take(8)?.uppercase() ?: "VISITOR"
    val photoUrl = profile?.photoURL?.takeIf { it.isNotEmpty() } ?: firebaseUser?.photoUrl?.toString()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkerSlate)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // 1. Profile Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Avatar Circle
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            colors = listOf(CrimsonRed, MetallicGold)
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (photoUrl != null) {
                    coil.compose.AsyncImage(
                        model = photoUrl,
                        contentDescription = "Avatar",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    val initial = if (isLoggedIn) displayUsername.take(1).uppercase() else "V"
                    Text(
                        text = initial,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }
            }

            // Username & ID
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (isLoggedIn) displayUsername else stringResource(R.string.visitor),
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
                Text(
                    text = "ID: $displayId",
                    fontSize = 13.sp,
                    color = Color.Gray
                )
            }
 
            // Sign in / Logout Button
            Button(
                onClick = {
                    if (isLoggedIn) {
                        viewModel.logout()
                    } else {
                        navController.navigate("login")
                    }
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isLoggedIn) Color.White.copy(alpha = 0.1f) else CrimsonRed
                ),
                shape = RoundedCornerShape(20.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp)
            ) {
                Text(
                    text = if (isLoggedIn) stringResource(R.string.sign_out) else stringResource(R.string.login),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }

        // 2. Profile Details (shown ONLY if logged in)
        if (isLoggedIn) {
            // "My account" card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF141418)),
                shape = RoundedCornerShape(18.dp),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f))
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = stringResource(R.string.my_account),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
 
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Left block: Coins
                        Card(
                            modifier = Modifier.weight(1f),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A20)),
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(0.8.dp, Color.White.copy(alpha = 0.06f))
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                horizontalAlignment = Alignment.Start,
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(stringResource(R.string.coins), fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.MonetizationOn,
                                        contentDescription = "Coin",
                                        tint = MetallicGold,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Text(
                                        text = "${profile?.coinBalance ?: 0}",
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                 Button(
                                    onClick = {
                                        if (isLoggedIn) {
                                            navController.navigate("topup?tab=coins")
                                        } else {
                                            navController.navigate("login")
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                                    shape = RoundedCornerShape(18.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                                    modifier = Modifier.fillMaxWidth().height(32.dp)
                                ) {
                                    Text(stringResource(R.string.topup_wallet), fontWeight = FontWeight.Bold, color = Color.White, fontSize = 11.sp)
                                }
                            }
                        }
 
                        // Right block: VIP
                        Card(
                            modifier = Modifier.weight(1f),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF191710)),
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, MetallicGold.copy(alpha = 0.35f))
                        ) {
                            val isVip by viewModel.isVipActive.collectAsState()
                            val vipLabel = if (isVip) stringResource(R.string.vip_active) else stringResource(R.string.vip_not_active)
                            val vipButtonText = if (isVip) stringResource(R.string.renew) else stringResource(R.string.join_vip)
                            val expiryStr = profile?.vipExpiry
                            val expiryText = if (isVip && !expiryStr.isNullOrBlank() && expiryStr != "null") {
                                runCatching {
                                    val date = java.util.Date(Instant.parse(expiryStr).toEpochMilli())
                                    SimpleDateFormat("MMM dd, yyyy", Locale.US).format(date)
                                }.getOrDefault("")
                            } else ""
 
                            Column(
                                modifier = Modifier.padding(12.dp),
                                horizontalAlignment = Alignment.Start,
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(stringResource(R.string.vip_membership), fontSize = 11.sp, color = MetallicGold.copy(alpha = 0.8f), fontWeight = FontWeight.Bold)
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.WorkspacePremium,
                                        contentDescription = "VIP",
                                        tint = if (isVip) MetallicGold else Color.Gray,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Text(
                                        text = vipLabel,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Black,
                                        color = if (isVip) MetallicGold else Color.White
                                    )
                                }
                                if (expiryText.isNotEmpty()) {
                                    Text(
                                        text = stringResource(R.string.expires_date, expiryText),
                                        fontSize = 9.sp,
                                        color = Color.LightGray,
                                        maxLines = 1
                                    )
                                } else {
                                    Spacer(modifier = Modifier.height(8.dp))
                                }
                                Button(
                                    onClick = {
                                        if (isLoggedIn) {
                                            navController.navigate("topup?tab=vip")
                                        } else {
                                            navController.navigate("login")
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = if (isVip) Color.White.copy(alpha = 0.15f) else MetallicGold),
                                    shape = RoundedCornerShape(18.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                                    modifier = Modifier.fillMaxWidth().height(32.dp)
                                ) {
                                    Text(vipButtonText, fontWeight = FontWeight.Black, color = if (isVip) Color.White else Color.Black, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            }

            // Grouped Profile Options Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF141418))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    if (appSettings.rewardsEnabled) {
                        ProfileOptionRow(
                            icon = Icons.Default.CardGiftcard,
                            iconBg = Color(0xFFFFB300),
                            title = stringResource(R.string.earn_rewards),
                            subtitle = stringResource(R.string.get_free_bonus),
                            onClick = {
                                if (isLoggedIn) {
                                    navController.navigate("rewards")
                                } else {
                                    navController.navigate("login")
                                }
                            }
                        )
                        Divider(color = Color.White.copy(alpha = 0.06f))
                    }
 
                    ProfileOptionRow(
                        icon = Icons.Default.History,
                        iconBg = Color(0xFF3B82F6),
                        title = stringResource(R.string.watch_history),
                        onClick = {
                            if (isLoggedIn) {
                                onTabChange("mylist-history")
                            } else {
                                navController.navigate("login")
                            }
                        }
                    )
                    Divider(color = Color.White.copy(alpha = 0.06f))
 
                    ProfileOptionRow(
                        icon = Icons.Default.Settings,
                        iconBg = Color(0xFF8B5CF6),
                        title = stringResource(R.string.settings),
                        onClick = onSettingsClick
                    )
                }
            }
        } else {
            // Visitor placeholder card encouraging login
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
                shape = RoundedCornerShape(14.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "Lock",
                        tint = Color.Gray,
                        modifier = Modifier.size(48.dp)
                    )
                    Text(
                        text = stringResource(R.string.sign_in_access_profile),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = stringResource(R.string.visitor_profile_desc),
                        fontSize = 12.sp,
                        color = Color.Gray,
                        modifier = Modifier.padding(horizontal = 8.dp),
                        lineHeight = 18.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Button(
                        onClick = { navController.navigate("login") },
                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(stringResource(R.string.sign_in_now), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileOptionRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String? = null,
    iconBg: Color = CrimsonRed,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(iconBg.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = iconBg,
                    modifier = Modifier.size(20.dp)
                )
            }
            Text(
                text = title,
                fontSize = 15.sp,
                color = Color.White,
                fontWeight = FontWeight.Medium
            )
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    fontSize = 12.sp,
                    color = CrimsonRed
                )
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = Color.Gray,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MySettingsContent(
    viewModel: SnapReelsViewModel,
    onBackClick: () -> Unit,
    onDeleteAccountClick: () -> Unit
) {
    val context = LocalContext.current
    val appSettings by viewModel.appSettings.collectAsState()
    val preferences = remember { context.getSharedPreferences("snapreels_settings", android.content.Context.MODE_PRIVATE) }
    var selectedLanguageCode by remember { mutableStateOf(preferences.getString("language_code", "en") ?: "en") }
    var showLanguages by remember { mutableStateOf(false) }
    val selectedLanguage = appSettings.languages.firstOrNull { it.languageCode == selectedLanguageCode }
        ?: appSettings.languages.firstOrNull()

    fun openLink(url: String) {
        if (url.isBlank()) {
            Toast.makeText(context, "Link is not configured yet.", Toast.LENGTH_SHORT).show()
        } else {
            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
                .onFailure { Toast.makeText(context, "Could not open link.", Toast.LENGTH_SHORT).show() }
        }
    }

    if (showLanguages) {
        AlertDialog(
            onDismissRequest = { showLanguages = false },
            title = { Text(stringResource(R.string.language), color = Color.White, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    appSettings.languages.forEach { language ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedLanguageCode = language.languageCode
                                    preferences.edit().putString("language_code", language.languageCode).apply()
                                    showLanguages = false
                                    
                                    // Show toast
                                    val reloadMsg = context.getString(com.example.R.string.reload_app_msg)
                                    Toast.makeText(context, reloadMsg, Toast.LENGTH_SHORT).show()
                                    
                                    // Reload/Restart app
                                    val intent = android.content.Intent(context, com.example.MainActivity::class.java).apply {
                                        addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK)
                                    }
                                    context.startActivity(intent)
                                }
                                .padding(vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(language.name, color = Color.White)
                            if (language.languageCode == selectedLanguageCode) {
                                RadioButton(selected = true, onClick = null)
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { showLanguages = false }) { Text(stringResource(R.string.close)) } },
            containerColor = DarkerSlate
        )
    }
 
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = stringResource(R.string.setting),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.close),
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkerSlate)
            )
        },
        containerColor = DarkerSlate
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(DarkerSlate)
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            SettingOptionRow(
                title = stringResource(R.string.language),
                subtitle = selectedLanguage?.name ?: "English",
                onClick = { showLanguages = true }
            )
 
            SettingOptionRow(
                title = stringResource(R.string.privacy_policy),
                onClick = { openLink(appSettings.privacyPolicyUrl) }
            )
 
            SettingOptionRow(
                title = stringResource(R.string.terms_of_service),
                onClick = { openLink(appSettings.termsOfServiceUrl) }
            )
 
            SettingOptionRow(
                title = stringResource(R.string.delete_account),
                onClick = onDeleteAccountClick
            )
 
            SettingOptionRow(
                title = stringResource(R.string.rate_us),
                onClick = { openLink(appSettings.rateUsUrl) }
            )
 
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = stringResource(R.string.clear_cache),
                    fontSize = 15.sp,
                    color = Color.White,
                    fontWeight = FontWeight.Medium
                )
                Button(
                    onClick = { Toast.makeText(context, context.getString(R.string.cache_cleared_msg), Toast.LENGTH_SHORT).show() },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.1f)),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    Text(stringResource(R.string.clear), color = Color.White, fontSize = 12.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeleteAccountContent(
    viewModel: SnapReelsViewModel,
    onBackClick: () -> Unit
) {
    val context = LocalContext.current
    var secondsRemaining by remember { mutableIntStateOf(10) }
    var isConfirmed by remember { mutableStateOf(false) }
    var isDeleting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        while (secondsRemaining > 0) {
            delay(1_000)
            secondsRemaining -= 1
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = stringResource(R.string.delete_account_title),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick, enabled = !isDeleting) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.close),
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkerSlate)
            )
        },
        containerColor = DarkerSlate
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 20.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            Box(
                modifier = Modifier
                    .size(88.dp)
                    .clip(CircleShape)
                    .background(CrimsonRed.copy(alpha = 0.16f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.WarningAmber,
                    contentDescription = null,
                    tint = CrimsonRed,
                    modifier = Modifier.size(48.dp)
                )
            }

            Text(
                text = stringResource(R.string.delete_account_confirm),
                color = Color.White,
                fontSize = 22.sp,
                fontWeight = FontWeight.Black
            )
 
            Card(
                colors = CardDefaults.cardColors(containerColor = CrimsonRed.copy(alpha = 0.10f)),
                border = androidx.compose.foundation.BorderStroke(1.dp, CrimsonRed.copy(alpha = 0.35f)),
                shape = RoundedCornerShape(14.dp)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = stringResource(R.string.action_cannot_undone),
                        color = CrimsonRed,
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp
                    )
                    Text(
                        text = stringResource(R.string.delete_account_warning),
                        color = Color.LightGray,
                        fontSize = 13.sp,
                        lineHeight = 20.sp
                    )
                }
            }
 
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = !isDeleting) { isConfirmed = !isConfirmed },
                colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.05f)),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (isConfirmed) CrimsonRed else Color.White.copy(alpha = 0.12f)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Checkbox(
                        checked = isConfirmed,
                        onCheckedChange = { isConfirmed = it },
                        enabled = !isDeleting,
                        colors = CheckboxDefaults.colors(checkedColor = CrimsonRed)
                    )
                    Text(
                        text = stringResource(R.string.delete_account_checkbox),
                        color = Color.White,
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            if (secondsRemaining > 0) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(
                            color = CrimsonRed,
                            trackColor = Color.White.copy(alpha = 0.10f),
                            modifier = Modifier.size(58.dp)
                        )
                        Text(
                            text = "$secondsRemaining",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp
                        )
                    }
                    Text(
                        text = stringResource(R.string.please_wait_delete),
                        color = Color.Gray,
                        fontSize = 12.sp
                    )
                }
            } else {
                Button(
                    onClick = {
                        isDeleting = true
                        errorMessage = null
                        viewModel.deleteAccount { success, message ->
                            isDeleting = false
                            if (success) {
                                Toast.makeText(context, message, Toast.LENGTH_LONG).show()
                            } else {
                                errorMessage = message
                            }
                        }
                    },
                    enabled = isConfirmed && !isDeleting,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CrimsonRed,
                        disabledContainerColor = Color.White.copy(alpha = 0.08f)
                    ),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth().height(52.dp)
                ) {
                    if (isDeleting) {
                        CircularProgressIndicator(
                            color = Color.White,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(stringResource(R.string.deleting_account_progress), fontWeight = FontWeight.Bold)
                    } else {
                        Icon(Icons.Default.DeleteForever, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(stringResource(R.string.delete_my_account_permanently), fontWeight = FontWeight.Bold)
                    }
                }
            }

            if (errorMessage != null) {
                Text(
                    text = errorMessage!!,
                    color = CrimsonRed,
                    fontSize = 13.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
fun SettingOptionRow(
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = title,
            fontSize = 15.sp,
            color = Color.White,
            fontWeight = FontWeight.Medium
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    fontSize = 14.sp,
                    color = CrimsonRed
                )
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = Color.Gray,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}
