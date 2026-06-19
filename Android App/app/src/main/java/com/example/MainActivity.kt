package com.example

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import android.view.WindowManager
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.ui.screens.*
import com.example.ui.theme.MyApplicationTheme
import com.example.viewmodel.ConnectionState
import com.example.viewmodel.SnapReelsViewModel
import com.example.data.AppConfig
import com.onesignal.OneSignal

class MainActivity : ComponentActivity() {
    private var pendingDeepLink by mutableStateOf<Uri?>(null)

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.data?.let { pendingDeepLink = it }
    }

    private fun getLocaleFromCode(languageCode: String): java.util.Locale {
        return try {
            if (languageCode.contains("-") || languageCode.contains("_")) {
                val tag = languageCode.replace("_", "-")
                java.util.Locale.forLanguageTag(tag)
            } else {
                java.util.Locale(languageCode)
            }
        } catch (e: Exception) {
            java.util.Locale(languageCode)
        }
    }

    override fun attachBaseContext(newBase: android.content.Context) {
        val preferences = newBase.getSharedPreferences("snapreels_settings", android.content.Context.MODE_PRIVATE)
        val languageCode = preferences.getString("language_code", "en") ?: "en"
        val locale = getLocaleFromCode(languageCode)
        java.util.Locale.setDefault(locale)
        val config = android.content.res.Configuration(newBase.resources.configuration)
        config.setLocale(locale)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            config.setLocales(android.os.LocaleList(locale))
        }
        config.setLayoutDirection(locale)
        val context = newBase.createConfigurationContext(config)
        super.attachBaseContext(context)
    }

    private fun setLocale(languageCode: String) {
        val locale = getLocaleFromCode(languageCode)
        java.util.Locale.setDefault(locale)
        val config = resources.configuration
        config.setLocale(locale)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            config.setLocales(android.os.LocaleList(locale))
        }
        config.setLayoutDirection(locale)
        resources.updateConfiguration(config, resources.displayMetrics)
    }

    private fun setFullScreen() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            setFullScreen()
        }
    }

    override fun onResume() {
        super.onResume()
        setFullScreen()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        val preferences = getSharedPreferences("snapreels_settings", android.content.Context.MODE_PRIVATE)
        val languageCode = preferences.getString("language_code", "en") ?: "en"
        setLocale(languageCode)

        // Log screen view to Firebase Analytics
        runCatching {
            val analytics = com.google.firebase.analytics.FirebaseAnalytics.getInstance(this)
            val bundle = android.os.Bundle().apply {
                putString(com.google.firebase.analytics.FirebaseAnalytics.Param.SCREEN_NAME, "MainScreen")
                putString(com.google.firebase.analytics.FirebaseAnalytics.Param.SCREEN_CLASS, "MainActivity")
            }
            analytics.logEvent(com.google.firebase.analytics.FirebaseAnalytics.Event.SCREEN_VIEW, bundle)
        }

        super.onCreate(savedInstanceState)
        intent?.data?.let { pendingDeepLink = it }
        enableEdgeToEdge()
        setFullScreen()
        setContent {
            MyApplicationTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val viewModel: SnapReelsViewModel = viewModel()
                    val connectionState by viewModel.connectionState.collectAsState()
                    val appSettings by viewModel.appSettings.collectAsState()

                    // Initialize OneSignal Push Notifications (Dynamic from Admin Panel or AppConfig)
                    LaunchedEffect(appSettings.oneSignalAppId) {
                        val targetAppId = appSettings.oneSignalAppId.takeIf { it.isNotBlank() }
                            ?: AppConfig.ONESIGNAL_APP_ID
                        if (targetAppId.isNotBlank() && targetAppId != "YOUR_ONESIGNAL_APP_ID_HERE") {
                            try {
                                OneSignal.initWithContext(this@MainActivity, targetAppId)
                                OneSignal.Notifications.requestPermission(true)
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        }
                    }

                    val requiresForceUpdate = appSettings.forceUpdateEnabled &&
                        BuildConfig.VERSION_CODE < appSettings.versionCode &&
                        appSettings.updateUrl.isNotBlank()

                    when (connectionState) {
                        is ConnectionState.Checking, is ConnectionState.Failed -> {
                            BrandedStartupScreen(viewModel = viewModel)
                        }
                        is ConnectionState.Connected -> {
                            if (requiresForceUpdate) {
                                ForceUpdateScreen(
                                    requiredVersion = appSettings.versionCode,
                                    updateUrl = appSettings.updateUrl
                                )
                                return@Surface
                            }

                            // Show AdMob App Open Ad on launch if enabled
                            var hasShownAppOpenAd by rememberSaveable { mutableStateOf(false) }
                            LaunchedEffect(appSettings.admobAppOpenEnabled, appSettings.admobAppOpenId) {
                                if (!hasShownAppOpenAd && appSettings.admobAppOpenEnabled && appSettings.admobAppOpenId.isNotBlank()) {
                                    hasShownAppOpenAd = true
                                    com.example.data.AdsManager.showAppOpenAd(this@MainActivity, appSettings)
                                }
                            }

                            val navController = rememberNavController()
                            val isLoggedIn by viewModel.isLoggedIn.collectAsState()
                            val startDestination = remember { 
                                val isOnboardingCompleted = preferences.getBoolean("is_onboarding_completed", false)
                                if (!isOnboardingCompleted) {
                                    "onboarding"
                                } else if (!viewModel.isLoggedIn.value && appSettings.forceLoginEnabled) {
                                    "login"
                                } else {
                                    "home"
                                }
                            }

                            LaunchedEffect(isLoggedIn, appSettings.forceLoginEnabled) {
                                val isOnboardingCompleted = preferences.getBoolean("is_onboarding_completed", false)
                                if (!isLoggedIn && isOnboardingCompleted && appSettings.forceLoginEnabled) {
                                    navController.navigate("login") {
                                        popUpTo(0) { inclusive = true }
                                    }
                                }
                            }

                            // Deep Link Intent Handler
                            LaunchedEffect(pendingDeepLink) {
                                val uri = pendingDeepLink ?: return@LaunchedEffect
                                pendingDeepLink = null

                                val dramaId = when {
                                    uri.scheme == "snapreels" -> {
                                        if (uri.host == "drama" || uri.host == "share") {
                                            uri.pathSegments.firstOrNull() ?: uri.lastPathSegment
                                        } else {
                                            uri.lastPathSegment
                                        }
                                    }
                                    uri.scheme == "http" || uri.scheme == "https" -> {
                                        val segments = uri.pathSegments
                                        if (segments.contains("ep") && segments.indexOf("ep") + 1 < segments.size) {
                                            segments[segments.indexOf("ep") + 1]
                                        } else if (segments.contains("share") && segments.indexOf("share") + 1 < segments.size) {
                                            segments[segments.indexOf("share") + 1]
                                        } else {
                                            uri.lastPathSegment
                                        }
                                    }
                                    else -> uri.lastPathSegment
                                }

                                if (!dramaId.isNullOrBlank()) {
                                    viewModel.selectDramaById(dramaId) {
                                        navController.navigate("detail") {
                                            launchSingleTop = true
                                        }
                                    }
                                }
                            }

                            NavHost(
                                navController = navController,
                                startDestination = startDestination
                            ) {
                                composable("onboarding") {
                                    OnboardingScreen(navController = navController, viewModel = viewModel)
                                }
                                composable("login") {
                                    LoginScreen(navController = navController, viewModel = viewModel)
                                }
                                composable("home") {
                                    HomeScreen(navController = navController, viewModel = viewModel)
                                }
                                composable("detail") {
                                    DramaDetailScreen(navController = navController, viewModel = viewModel)
                                }
                                composable("player") {
                                    VideoPlayerScreen(navController = navController, viewModel = viewModel)
                                }
                                composable("rewards") {
                                    RewardsScreen(navController = navController, viewModel = viewModel)
                                }
                                composable("topup") {
                                    TopUpScreen(navController = navController, viewModel = viewModel)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ForceUpdateScreen(requiredVersion: Int, updateUrl: String) {
    val context = androidx.compose.ui.platform.LocalContext.current
    Surface(modifier = Modifier.fillMaxSize(), color = com.example.ui.theme.DarkerSlate) {
        Column(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text("Update Required", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Black)
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "A newer version of SnapReels is required to continue.",
                color = Color.LightGray,
                fontSize = 14.sp,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Installed: ${BuildConfig.VERSION_CODE}  •  Required: $requiredVersion",
                color = com.example.ui.theme.MetallicGold,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(28.dp))
            Button(
                onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(updateUrl))) },
                colors = ButtonDefaults.buttonColors(containerColor = com.example.ui.theme.CrimsonRed),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.width(220.dp).height(52.dp)
            ) {
                Text("Update Now", fontWeight = FontWeight.Black)
            }
        }
    }
}
