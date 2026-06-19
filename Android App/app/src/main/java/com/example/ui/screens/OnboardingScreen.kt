package com.example.ui.screens

import android.app.Activity
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.MainActivity
import com.example.R
import com.example.data.LanguageModel
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.DarkerSlate
import com.example.viewmodel.SnapReelsViewModel
import kotlinx.coroutines.launch
import java.util.Locale

@Composable
fun OnboardingScreen(navController: NavController, viewModel: SnapReelsViewModel) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val appSettings by viewModel.appSettings.collectAsState()
    val pagerState = rememberPagerState(pageCount = { 3 })
    
    val preferences = remember { context.getSharedPreferences("snapreels_settings", Context.MODE_PRIVATE) }
    var selectedLanguage by remember { mutableStateOf(preferences.getString("language_code", "en") ?: "en") }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = DarkerSlate
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                when (page) {
                    0 -> LanguageSelectionPage(
                        languages = appSettings.languages,
                        selectedLanguageCode = selectedLanguage,
                        onLanguageSelect = { 
                            selectedLanguage = it.languageCode
                            preferences.edit().putString("language_code", it.languageCode).apply()
                            
                            val locale = Locale(it.languageCode)
                            Locale.setDefault(locale)
                            val config = context.resources.configuration
                            config.setLocale(locale)
                            config.setLayoutDirection(locale)
                            context.resources.updateConfiguration(config, context.resources.displayMetrics)
                            (context as? Activity)?.recreate()
                        }
                    )
                    1 -> FeaturePage(
                        title = stringResource(R.string.onboarding_feature1_title),
                        description = stringResource(R.string.onboarding_feature1_desc),
                        icon = Icons.Rounded.PlayArrow
                    )
                    2 -> FeaturePage(
                        title = stringResource(R.string.onboarding_feature2_title),
                        description = stringResource(R.string.onboarding_feature2_desc),
                        icon = Icons.Rounded.Star
                    )
                }
            }

            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(32.dp)
                    .navigationBarsPadding(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    modifier = Modifier.padding(bottom = 32.dp),
                    horizontalArrangement = Arrangement.Center
                ) {
                    repeat(3) { index ->
                        val isSelected = pagerState.currentPage == index
                        Box(
                            modifier = Modifier
                                .padding(4.dp)
                                .size(if (isSelected) 10.dp else 8.dp)
                                .clip(CircleShape)
                                .background(if (isSelected) CrimsonRed else Color.Gray.copy(alpha = 0.5f))
                        )
                    }
                }

                Button(
                    onClick = {
                        if (pagerState.currentPage < 2) {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(pagerState.currentPage + 1)
                            }
                        } else {
                            preferences.edit().putBoolean("is_onboarding_completed", true).apply()
                            val intent = Intent(context, MainActivity::class.java)
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                            context.startActivity(intent)
                            (context as? Activity)?.finish()
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text(
                        text = if (pagerState.currentPage == 2) stringResource(R.string.onboarding_get_started) else stringResource(R.string.onboarding_next),
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun LanguageSelectionPage(
    languages: List<LanguageModel>,
    selectedLanguageCode: String,
    onLanguageSelect: (LanguageModel) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp)
            .padding(top = 80.dp, bottom = 120.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = stringResource(R.string.onboarding_choose_language),
            color = Color.White,
            fontSize = 28.sp,
            fontWeight = FontWeight.Black,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        Text(
            text = stringResource(R.string.onboarding_language_desc),
            color = Color.LightGray,
            fontSize = 15.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = 40.dp)
        )

        if (languages.isEmpty()) {
            CircularProgressIndicator(color = CrimsonRed)
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(languages) { language ->
                    val isSelected = language.languageCode == selectedLanguageCode
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) CrimsonRed.copy(alpha = 0.15f) else Color(0xFF141414))
                            .clickable { onLanguageSelect(language) }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = language.name,
                            color = if (isSelected) CrimsonRed else Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium
                        )
                        if (isSelected) {
                            Box(
                                modifier = Modifier.size(24.dp).clip(CircleShape).background(CrimsonRed),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = "Selected",
                                    tint = Color.White,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun FeaturePage(title: String, description: String, icon: ImageVector) {
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier.size(120.dp).padding(bottom = 40.dp).clip(CircleShape).background(Color(0xFF141414)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = CrimsonRed,
                modifier = Modifier.size(64.dp)
            )
        }
        Text(
            text = title,
            color = Color.White,
            fontSize = 28.sp,
            fontWeight = FontWeight.Black,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        Text(
            text = description,
            color = Color.LightGray,
            fontSize = 15.sp,
            textAlign = TextAlign.Center,
            lineHeight = 22.sp
        )
    }
}
