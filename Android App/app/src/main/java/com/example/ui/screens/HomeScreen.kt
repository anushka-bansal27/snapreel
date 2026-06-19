package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import com.example.R
import androidx.compose.foundation.Image
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.example.data.*
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.DarkerSlate
import com.example.ui.theme.MetallicGold
import com.example.viewmodel.SnapReelsViewModel
import com.example.util.CategoryTranslator
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.activity.compose.BackHandler
import androidx.compose.material.icons.filled.WorkspacePremium
import android.app.Activity
import android.widget.Toast
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.ui.geometry.Offset
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.util.lerp
import java.util.Locale
import kotlin.math.absoluteValue

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(navController: NavController, viewModel: SnapReelsViewModel) {
    var activeTab by remember { mutableStateOf("home") }
    var myListInitialSection by remember { mutableStateOf("favorites") }
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val appSettings by viewModel.appSettings.collectAsState()

    val context = LocalContext.current
    var lastBackPressTime by remember { mutableLongStateOf(0L) }

    BackHandler {
        if (activeTab != "home") {
            activeTab = "home"
        } else {
            val currentTime = System.currentTimeMillis()
            if (currentTime - lastBackPressTime < 2000) {
                val activity = context as? Activity
                activity?.finish()
            } else {
                lastBackPressTime = currentTime
                Toast.makeText(context, "Press back again to exit", Toast.LENGTH_SHORT).show()
            }
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = Color(0xFF09090C),
                tonalElevation = 0.dp,
                modifier = Modifier.border(
                    BorderStroke(0.8.dp, Color.White.copy(alpha = 0.08f))
                )
            ) {
                NavigationBarItem(
                    selected = activeTab == "home",
                    onClick = { activeTab = "home" },
                    icon = {
                        Icon(
                            imageVector = if (activeTab == "home") Icons.Default.Home else Icons.Outlined.Home,
                            contentDescription = "Home"
                        )
                    },
                    label = { Text(stringResource(R.string.tab_home), fontWeight = if (activeTab == "home") FontWeight.Black else FontWeight.SemiBold, fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = CrimsonRed,
                        selectedTextColor = CrimsonRed,
                        unselectedIconColor = Color.White.copy(alpha = 0.45f),
                        unselectedTextColor = Color.White.copy(alpha = 0.45f),
                        indicatorColor = CrimsonRed.copy(alpha = 0.16f)
                    ),
                    modifier = Modifier.testTag("nav_home_tab")
                )

                NavigationBarItem(
                    selected = activeTab == "shorts",
                    onClick = { activeTab = "shorts" },
                    icon = {
                        Icon(
                            imageVector = Icons.Default.Movie,
                            contentDescription = "Shorts"
                        )
                    },
                    label = { Text(stringResource(R.string.tab_shorts), fontWeight = if (activeTab == "shorts") FontWeight.Black else FontWeight.SemiBold, fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = CrimsonRed,
                        selectedTextColor = CrimsonRed,
                        unselectedIconColor = Color.White.copy(alpha = 0.45f),
                        unselectedTextColor = Color.White.copy(alpha = 0.45f),
                        indicatorColor = CrimsonRed.copy(alpha = 0.16f)
                    ),
                    modifier = Modifier.testTag("nav_rewards_tab")
                )

                NavigationBarItem(
                    selected = activeTab == "mylist",
                    onClick = {
                        myListInitialSection = "favorites"
                        activeTab = "mylist"
                    },
                    icon = {
                        Icon(
                            imageVector = if (activeTab == "mylist") Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder,
                            contentDescription = "My List"
                        )
                    },
                    label = { Text(stringResource(R.string.tab_mylist), fontWeight = if (activeTab == "mylist") FontWeight.Black else FontWeight.SemiBold, fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = CrimsonRed,
                        selectedTextColor = CrimsonRed,
                        unselectedIconColor = Color.White.copy(alpha = 0.45f),
                        unselectedTextColor = Color.White.copy(alpha = 0.45f),
                        indicatorColor = CrimsonRed.copy(alpha = 0.16f)
                    ),
                    modifier = Modifier.testTag("nav_mylist_tab")
                )

                NavigationBarItem(
                    selected = activeTab == "my",
                    onClick = { activeTab = "my" },
                    icon = {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = "My"
                        )
                    },
                    label = { Text(stringResource(R.string.tab_my), fontWeight = if (activeTab == "my") FontWeight.Black else FontWeight.SemiBold, fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = CrimsonRed,
                        selectedTextColor = CrimsonRed,
                        unselectedIconColor = Color.White.copy(alpha = 0.45f),
                        unselectedTextColor = Color.White.copy(alpha = 0.45f),
                        indicatorColor = CrimsonRed.copy(alpha = 0.16f)
                    ),
                    modifier = Modifier.testTag("nav_my_tab")
                )
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF09090C))
                .padding(innerPadding)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                when (activeTab) {
                    "home" -> HomeListingTab(navController, viewModel, onTabChange = { activeTab = it })
                    "shorts" -> ShortsScreen(navController, viewModel)
                    "mylist" -> {
                        if (isLoggedIn) {
                            MyListTab(navController, viewModel, initialSection = myListInitialSection)
                        } else {
                            navController.navigate("login")
                        }
                    }
                    "my" -> MyScreen(navController, viewModel, onTabChange = { target ->
                        if (target == "mylist-history") {
                            myListInitialSection = "history"
                            activeTab = "mylist"
                        } else {
                            activeTab = target
                        }
                    })
                }
            }

            val hasBanner = (appSettings.adsProvider == "multi" || appSettings.adsProvider == "rotation" ||
                    (appSettings.adsProvider == "admob" && appSettings.admobBannerEnabled && appSettings.admobBannerId.isNotBlank()) ||
                    (appSettings.adsProvider == "applovin" && appSettings.applovinBannerEnabled && appSettings.applovinBannerId.isNotBlank()) ||
                    (appSettings.adsProvider == "facebook" && appSettings.facebookBannerEnabled && appSettings.facebookBannerId.isNotBlank()))

            if (activeTab == "home" && hasBanner) {
                AndroidView(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    factory = { ctx ->
                        val container = android.widget.FrameLayout(ctx)
                        val adView = AdsManager.getBannerView(ctx, appSettings)
                        if (adView != null) {
                            val params = android.widget.FrameLayout.LayoutParams(
                                android.widget.FrameLayout.LayoutParams.WRAP_CONTENT,
                                android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
                            )
                            params.gravity = android.view.Gravity.CENTER
                            container.addView(adView, params)
                        }
                        container
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeListingTab(
    navController: NavController,
    viewModel: SnapReelsViewModel,
    onTabChange: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val dramasList by viewModel.filteredDramas.collectAsState()
    val rawDramas by viewModel.dramas.collectAsState()
    val activeCategory by viewModel.selectedCategory.collectAsState()
    val categoriesList by viewModel.categories.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val history by viewModel.watchHistory.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()
    val appSettings by viewModel.appSettings.collectAsState()
    val favorites by viewModel.favoriteDramas.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val hasCompletedDataLoad by viewModel.hasCompletedDataLoad.collectAsState()
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    var isSearchActive by remember { mutableStateOf(false) }
    var moreTitle by remember { mutableStateOf<String?>(null) }
    var moreDramas by remember { mutableStateOf<List<Drama>>(emptyList()) }
    var moreIsHistory by remember { mutableStateOf(false) }
    val currentLang = remember { CategoryTranslator.getAppLanguage(context) }
    val isArabic = remember(currentLang) { currentLang.startsWith("ar") }
    val isLoading = (isRefreshing || !hasCompletedDataLoad) && rawDramas.isEmpty()

    val featuredDramas = remember(rawDramas) {
        val trending = rawDramas.filter { it.isTrending }
        if (trending.isNotEmpty()) trending.take(8) else rawDramas.take(6)
    }
    var activeFeaturedCoverUrl by remember { mutableStateOf<String?>(null) }
    val newestDramas = remember(rawDramas) {
        rawDramas.sortedWith(
            compareByDescending<Drama> { it.createdAtMillis }.thenByDescending { it.releaseYear }
        )
    }
    val dramasById = remember(rawDramas) { rawDramas.associateBy { it.id } }
    val continueWatching = remember(history, dramasById) {
        history.mapNotNull { item -> dramasById[item.seriesId] }.distinctBy { it.id }
    }
    val categorySections = remember(categoriesList, rawDramas) {
        categoriesList.mapNotNull { category ->
            val categoryDramas = rawDramas.filter {
                it.genres.any { genre -> genre.equals(category, ignoreCase = true) } ||
                    it.category.equals(category, ignoreCase = true)
            }
            category.takeIf { categoryDramas.isNotEmpty() }?.let { it to categoryDramas }
        }
    }

    LaunchedEffect(featuredDramas) {
        val availableCovers = featuredDramas.map { if (!it.coverUrl.isNullOrBlank()) it.coverUrl else (it.featuredCoverUrl ?: "") }
        if (activeFeaturedCoverUrl !in availableCovers) {
            activeFeaturedCoverUrl = availableCovers.firstOrNull()
        }
    }

    if (isSearchActive) {
        SearchLibraryDialog(
            query = searchQuery,
            results = dramasList,
            onQueryChange = viewModel::setSearchQuery,
            onClose = {
                isSearchActive = false
                viewModel.setSearchQuery("")
            },
            onDramaClick = { drama ->
                isSearchActive = false
                viewModel.setSearchQuery("")
                viewModel.playDramaDirect(drama) {
                    navController.navigate("player")
                }
            }
        )
    }

    if (moreTitle != null) {
        MoreSeriesPage(
            title = moreTitle!!,
            dramas = moreDramas,
            onBack = { moreTitle = null },
            onDramaClick = { drama ->
                if (moreIsHistory) {
                    val item = history.firstOrNull { it.seriesId == drama.id }
                    if (item != null) {
                        viewModel.resumeHistory(drama, item) { navController.navigate("player") }
                    }
                } else {
                    viewModel.playDramaDirect(drama) {
                        navController.navigate("player")
                    }
                }
            }
        )
        return
    }

    val pullState = rememberPullToRefreshState()

    PullToRefreshBox(
        state = pullState,
        isRefreshing = isRefreshing,
        onRefresh = { viewModel.refreshData(showLoading = true) },
        modifier = Modifier.fillMaxSize()
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF09090C))
        ) {
            // Dynamic ambient lighting behind top section (optimized without heavy GPU blur)
            if (!activeFeaturedCoverUrl.isNullOrBlank() && searchQuery.isBlank() && activeCategory == "All") {
                AsyncImage(
                    model = activeFeaturedCoverUrl,
                    contentDescription = null,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(380.dp)
                        .graphicsLayer { alpha = 0.18f },
                    contentScale = ContentScale.Crop
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(380.dp)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color(0xFF09090C).copy(alpha = 0.45f),
                                    Color(0xFF09090C).copy(alpha = 0.90f),
                                    Color(0xFF09090C)
                                )
                            )
                        )
                )
            }


            Column(modifier = Modifier.fillMaxSize()) {
            // ─── 1. TOP HEADER: Logo + Name + Coins (Sticky) ─────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(start = 16.dp, end = 16.dp, top = 36.dp, bottom = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Logo + Name
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Image(
                        painter = painterResource(id = com.example.R.drawable.app_logo),
                        contentDescription = "Logo",
                        modifier = Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(8.dp))
                    )
                    Text(
                        text = "SnapReels",
                        fontWeight = FontWeight.Black,
                        fontSize = 20.sp,
                        color = Color.White
                    )
                }

                // Header actions: Coins + Rewards + Search
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Coins pill
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(Color.White.copy(alpha = 0.08f))
                            .border(BorderStroke(0.8.dp, MetallicGold.copy(alpha = 0.35f)), RoundedCornerShape(20.dp))
                            .clickable {
                                if (isLoggedIn) {
                                    navController.navigate("topup?tab=coins")
                                } else {
                                    navController.navigate("login")
                                }
                            }
                            .padding(horizontal = 9.dp, vertical = 5.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.MonetizationOn,
                            contentDescription = "Coins",
                            tint = MetallicGold,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${userProfile?.coinBalance ?: 0}",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 11.sp
                        )
                    }

                    if (appSettings.rewardsEnabled) {
                        // Rewards button (pill)
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(Color(0xFFFFB300).copy(alpha = 0.15f))
                                .border(BorderStroke(0.8.dp, Color(0xFFFFB300).copy(alpha = 0.3f)), RoundedCornerShape(20.dp))
                                .clickable {
                                    if (isLoggedIn) {
                                        navController.navigate("rewards")
                                    } else {
                                        navController.navigate("login")
                                    }
                                }
                                .padding(horizontal = 9.dp, vertical = 5.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CardGiftcard,
                                contentDescription = "Rewards icon",
                                tint = Color(0xFFFFB300),
                                modifier = Modifier.size(15.dp)
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(
                                text = stringResource(R.string.tab_rewards),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }
                    }

                    // Frosted Search button
                    Surface(
                        shape = CircleShape,
                        color = Color.White.copy(alpha = 0.08f),
                        border = BorderStroke(0.8.dp, Color.White.copy(alpha = 0.12f)),
                        modifier = Modifier.size(34.dp)
                    ) {
                        IconButton(
                            onClick = {
                                isSearchActive = !isSearchActive
                                if (!isSearchActive) {
                                    viewModel.setSearchQuery("")
                                }
                            }
                        ) {
                            Icon(
                                imageVector = if (isSearchActive) Icons.Default.Close else Icons.Default.Search,
                                contentDescription = "Search icon",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize().weight(1f),
                verticalArrangement = Arrangement.spacedBy(0.dp)
            ) {

            // ─── 3. FEATURED HORIZONTAL CAROUSEL ─────────────────────────
            if (!isLoading && featuredDramas.isNotEmpty() && searchQuery.isBlank()) {
                item(key = "featured") {
                    FeaturedCarousel(
                        featuredDramas = featuredDramas,
                        favoriteDramas = favorites,
                        onActiveDramaChange = { drama ->
                            activeFeaturedCoverUrl = if (!drama.coverUrl.isNullOrBlank()) drama.coverUrl else drama.featuredCoverUrl
                        },
                        onDramaClick = { drama ->
                            viewModel.playDramaDirect(drama) {
                                navController.navigate("player")
                            }
                        },
                        onToggleFavorite = { drama ->
                            if (isLoggedIn) {
                                viewModel.toggleFavorite(drama.id)
                            } else {
                                navController.navigate("login")
                            }
                        },
                        onDetailsClick = { drama ->
                            viewModel.selectDrama(drama)
                            navController.navigate("detail")
                        }
                    )
                }
            }

            // ─── 4. CATEGORIES / FILTER ROW ───────────────────────────────
            if (searchQuery.isBlank() && rawDramas.isNotEmpty()) {
                item(key = "categories_row") {
                    val selectList = remember(categoriesList, rawDramas) {
                        val validCategories = categoriesList.filter { cat ->
                            rawDramas.any { drama -> com.example.util.CategoryTranslator.isDramaInCategory(drama, cat) }
                        }
                        (listOf("All", "Hot 🔥", "New") + validCategories).distinct()
                    }
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        items(selectList) { cat ->
                            val isSelected = (activeCategory == cat) || (activeCategory == "All" && (cat == "All" || cat == "Hot 🔥"))
                            val chipLabel = when (cat) {
                                "All" -> when {
                                    currentLang.startsWith("ar") -> "🔥 لك"
                                    currentLang.startsWith("zh") -> "🔥 推荐"
                                    currentLang.startsWith("hi") -> "🔥 आपके लिए"
                                    else -> "🔥 For You"
                                }
                                "Hot 🔥" -> when {
                                    currentLang.startsWith("ar") -> "🔥 رائج"
                                    currentLang.startsWith("zh") -> "🔥 热门"
                                    currentLang.startsWith("hi") -> "🔥 हॉट"
                                    else -> "🔥 Hot"
                                }
                                "New" -> when {
                                    currentLang.startsWith("ar") -> "⭐ جديد"
                                    currentLang.startsWith("zh") -> "⭐ 最新"
                                    currentLang.startsWith("hi") -> "⭐ नया"
                                    else -> "⭐ New"
                                }
                                else -> CategoryTranslator.localizeForLang(cat, currentLang)
                            }
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = if (isSelected) CrimsonRed else Color(0xFF17181F),
                                border = if (isSelected) null else BorderStroke(0.8.dp, Color.White.copy(alpha = 0.10f)),
                                modifier = Modifier.clickable {
                                    if (cat == "Hot 🔥" || cat == "All") {
                                        viewModel.selectCategory("All")
                                    } else {
                                        viewModel.selectCategory(cat)
                                    }
                                }
                            ) {
                                Text(
                                    text = chipLabel,
                                    fontSize = 13.sp,
                                    fontWeight = if (isSelected) FontWeight.Black else FontWeight.SemiBold,
                                    color = if (isSelected) Color.White else Color.White.copy(alpha = 0.75f),
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
                                )
                            }
                        }
                    }
                }
            }

            // ─── 5. CATEGORY FILTERED GRID VIEW (When category != "All") ─
            if (!isLoading && searchQuery.isBlank() && activeCategory != "All") {
                item(key = "filtered_cat_header") {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        val headerTitle = when (activeCategory) {
                            "Hot 🔥" -> when {
                                currentLang.startsWith("ar") -> "🔥 الأكثر رواجاً"
                                currentLang.startsWith("zh") -> "🔥 热门推荐"
                                currentLang.startsWith("hi") -> "🔥 ट्रेंडिंग हॉट"
                                else -> "🔥 Trending Hot"
                            }
                            "New" -> when {
                                currentLang.startsWith("ar") -> "⭐ أحدث المسلسلات"
                                currentLang.startsWith("zh") -> "⭐ 最新剧集"
                                currentLang.startsWith("hi") -> "⭐ नई रिलीज"
                                else -> "⭐ New Releases"
                            }
                            "Rankings" -> when {
                                currentLang.startsWith("ar") -> "👑 أفضل 10 مسلسلات"
                                currentLang.startsWith("zh") -> "👑 排行榜前10"
                                currentLang.startsWith("hi") -> "👑 टॉप 10 रैंकिंग"
                                else -> "👑 Top 10 Rankings"
                            }
                            else -> CategoryTranslator.localizeForLang(activeCategory, currentLang)
                        }
                        Text(
                            text = headerTitle,
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp
                        )
                        Text(
                            text = "${dramasList.size} " + stringResource(R.string.all_series),
                            color = Color.Gray,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                val chunkedFiltered = dramasList.chunked(3)
                items(chunkedFiltered, key = { chunk -> "cat_row_" + chunk.firstOrNull()?.id }) { rowItems ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        for (drama in rowItems) {
                            Box(modifier = Modifier.weight(1f)) {
                                DramaGridCard(drama = drama, onClick = {
                                    viewModel.playDramaDirect(drama) {
                                        navController.navigate("player")
                                    }
                                })
                            }
                        }
                        repeat(3 - rowItems.size) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }

            // ─── 6. DEFAULT DISCOVERY SECTIONS (When category == "All") ──
            if (!isLoading && searchQuery.isBlank() && activeCategory == "All" && continueWatching.isNotEmpty()) {
                item(key = "continue_watching") {
                    HomeSeriesSection(
                        title = stringResource(R.string.continue_watching),
                        dramas = continueWatching,
                        badgeText = { drama ->
                            history.firstOrNull { it.seriesId == drama.id }?.let { "EP ${it.episodeInSeason}" }
                        },
                        progressFraction = { drama ->
                            val itm = history.firstOrNull { it.seriesId == drama.id }
                            if (itm != null && drama.totalEpisodes > 0) {
                                (itm.episodeInSeason.toFloat() / drama.totalEpisodes.toFloat()).coerceIn(0.1f, 1f)
                            } else null
                        },
                        onMore = {
                            moreTitle = context.getString(R.string.continue_watching)
                            moreDramas = continueWatching
                            moreIsHistory = true
                        },
                        onDramaClick = { drama ->
                            val item = history.firstOrNull { it.seriesId == drama.id }
                            if (item != null) viewModel.resumeHistory(drama, item) { navController.navigate("player") }
                        }
                    )
                }
            }

            // ─── 6.1 TOP 10 RANKINGS SECTION ─────────────────────────────
            if (!isLoading && searchQuery.isBlank() && activeCategory == "All" && rawDramas.isNotEmpty()) {
                item(key = "top_10_rankings") {
                    Top10RankingSection(
                        dramas = rawDramas,
                        onMore = {
                            viewModel.selectCategory("Rankings")
                        },
                        onDramaClick = { drama ->
                            viewModel.playDramaDirect(drama) {
                                navController.navigate("player")
                            }
                        }
                    )
                }
            }

            if (!isLoading && searchQuery.isBlank() && activeCategory == "All" && newestDramas.isNotEmpty()) {
                item(key = "new_release") {
                    HomeSeriesSection(
                        title = stringResource(R.string.new_release),
                        dramas = newestDramas,
                        onMore = {
                            moreTitle = context.getString(R.string.new_release)
                            moreDramas = newestDramas
                            moreIsHistory = false
                        },
                        onDramaClick = { drama ->
                            viewModel.playDramaDirect(drama) {
                                navController.navigate("player")
                            }
                        }
                    )
                }
            }

            if (!isLoading && searchQuery.isBlank() && activeCategory == "All") {
                categorySections.forEach { (category, categoryDramas) ->
                    item(key = "category_$category") {
                        val localizedCatTitle = CategoryTranslator.localizeForLang(category, currentLang)
                        HomeSeriesSection(
                            title = localizedCatTitle,
                            dramas = categoryDramas,
                            onMore = {
                                moreTitle = localizedCatTitle
                                moreDramas = categoryDramas
                                moreIsHistory = false
                            },
                            onDramaClick = { drama ->
                                viewModel.playDramaDirect(drama) {
                                    navController.navigate("player")
                                }
                            }
                        )
                    }
                }
            }

            if (!isLoading && searchQuery.isBlank() && activeCategory == "All" && rawDramas.isNotEmpty()) {
                item(key = "all_series") {
                    HomeSeriesSection(
                        title = stringResource(R.string.all_series),
                        dramas = rawDramas,
                        onMore = {
                            moreTitle = context.getString(R.string.all_series)
                            moreDramas = rawDramas
                            moreIsHistory = false
                        },
                        onDramaClick = { drama ->
                            viewModel.playDramaDirect(drama) {
                                navController.navigate("player")
                            }
                        }
                    )
                }
            }

            // ─── 7. SHIMMER SKELETON LOADING STATE ────────────────────────
            if (isLoading) {
                item(key = "loading_progress") {
                    LinearProgressIndicator(
                        modifier = Modifier.fillMaxWidth().height(2.dp),
                        color = CrimsonRed,
                        trackColor = Color.White.copy(alpha = 0.08f)
                    )
                }
                items(3, key = { "shimmer_row_$it" }) {
                    ShimmerSkeletonRow()
                }
            } else if (rawDramas.isEmpty() && hasCompletedDataLoad) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(300.dp)
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CloudOff,
                                contentDescription = "Error",
                                tint = Color.Gray,
                                modifier = Modifier.size(64.dp)
                            )
                            Text(
                                text = stringResource(R.string.connection_error_msg),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                textAlign = TextAlign.Center
                            )
                            Button(
                                onClick = { viewModel.refreshData(showLoading = true) },
                                colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(stringResource(R.string.retry), fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            } else if (rawDramas.isNotEmpty() && dramasList.isEmpty() && hasCompletedDataLoad) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(300.dp)
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = "Empty",
                                tint = Color.Gray.copy(alpha = 0.7f),
                                modifier = Modifier.size(54.dp)
                            )
                            Text(
                                text = when {
                                    currentLang.startsWith("ar") -> "لا توجد مسلسلات في هذا التصنيف حالياً"
                                    currentLang.startsWith("zh") -> "该分类下暂无剧集"
                                    currentLang.startsWith("hi") -> "इस श्रेणी में कोई सीरीज उपलब्ध नहीं है"
                                    else -> "No series available in this category"
                                },
                                color = Color.White.copy(alpha = 0.85f),
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                textAlign = TextAlign.Center
                            )
                            OutlinedButton(
                                onClick = { viewModel.selectCategory("All") },
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, CrimsonRed)
                            ) {
                                Text(
                                    text = when {
                                        currentLang.startsWith("ar") -> "الرجوع للرئيسية"
                                        currentLang.startsWith("zh") -> "返回全部剧集"
                                        currentLang.startsWith("hi") -> "सभी सीरीज पर वापस जाएं"
                                        else -> "Back to All Series"
                                    },
                                    color = CrimsonRed,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            } else if (searchQuery.isNotBlank()) {
                val chunks = dramasList.chunked(3)
                items(chunks) { chunk ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 10.dp, vertical = 3.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        for (i in 0..2) {
                            if (i < chunk.size) {
                                val drama = chunk[i]
                                Box(modifier = Modifier.weight(1f)) {
                                    DramaGridCard(drama = drama) {
                                        viewModel.playDramaDirect(drama) {
                                            navController.navigate("player")
                                        }
                                    }
                                }
                            } else {
                                Box(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                }
            }

            item {
                Spacer(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(24.dp)
                        .background(DarkerSlate)
                )
            }
        }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURED HORIZONTAL PAGER CAROUSEL
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun HomeSeriesSection(
    title: String,
    dramas: List<Drama>,
    badgeText: (Drama) -> String? = { null },
    progressFraction: (Drama) -> Float? = { null },
    onMore: () -> Unit,
    onDramaClick: (Drama) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = title,
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 20.sp,
                textAlign = TextAlign.Start
            )
            TextButton(onClick = onMore) {
                Text(
                    text = stringResource(R.string.more) + " >",
                    color = CrimsonRed,
                    fontWeight = FontWeight.Black,
                    fontSize = 13.sp
                )
            }
        }

        val screenWidth = LocalConfiguration.current.screenWidthDp.dp
        val cardWidth = ((screenWidth - 44.dp) / 3).coerceAtLeast(105.dp)
        LazyRow(
            contentPadding = PaddingValues(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(dramas.take(12), key = { it.id }) { drama ->
                Box(modifier = Modifier.width(cardWidth)) {
                    DramaGridCard(
                        drama = drama,
                        badgeText = badgeText(drama),
                        progressFraction = progressFraction(drama),
                        onClick = { onDramaClick(drama) }
                    )
                }
            }
        }
    }
}

@Composable
fun SearchLibraryDialog(
    query: String,
    results: List<Drama>,
    onQueryChange: (String) -> Unit,
    onClose: () -> Unit,
    onDramaClick: (Drama) -> Unit
) {
    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.97f))
                .statusBarsPadding()
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(18.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = query,
                    onValueChange = onQueryChange,
                    placeholder = { Text(stringResource(R.string.search_placeholder), color = Color.Gray) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = CrimsonRed,
                        unfocusedBorderColor = CrimsonRed.copy(alpha = 0.7f),
                        cursorColor = CrimsonRed
                    ),
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.weight(1f).height(64.dp)
                )
                IconButton(onClick = onClose) {
                    Icon(Icons.Default.Close, contentDescription = "Close search", tint = Color.White)
                }
            }

            HorizontalDivider(color = Color.White.copy(alpha = 0.08f))

            if (query.isBlank()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Search, contentDescription = null, tint = CrimsonRed, modifier = Modifier.size(56.dp))
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(stringResource(R.string.search_library), color = Color.LightGray, fontSize = 20.sp)
                    }
                }
            } else if (results.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.no_items_found), color = Color.Gray, fontSize = 18.sp)
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    contentPadding = PaddingValues(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    gridItems(results, key = { it.id }) { drama ->
                        DramaGridCard(drama) { onDramaClick(drama) }
                    }
                }
            }
        }
    }
}

@Composable
fun MoreSeriesPage(
    title: String,
    dramas: List<Drama>,
    onBack: () -> Unit,
    onDramaClick: (Drama) -> Unit
) {
    var visibleCount by remember(title, dramas.size) { mutableIntStateOf(minOf(24, dramas.size)) }
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val shouldLoadMore by remember {
        derivedStateOf {
            val lastVisible = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            lastVisible >= listState.layoutInfo.totalItemsCount - 3
        }
    }

    LaunchedEffect(shouldLoadMore, visibleCount, dramas.size) {
        if (shouldLoadMore && visibleCount < dramas.size) {
            delay(250)
            visibleCount = minOf(visibleCount + 24, dramas.size)
        }
    }

    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize().background(DarkerSlate),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
                Text(
                    text = title,
                    color = Color.White,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.padding(start = 8.dp)
                )
            }
        }

        items(dramas.take(visibleCount).chunked(3)) { row ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                repeat(3) { index ->
                    if (index < row.size) {
                        Box(modifier = Modifier.weight(1f)) {
                            DramaGridCard(row[index]) { onDramaClick(row[index]) }
                        }
                    } else {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }

        if (visibleCount < dramas.size) {
            item {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(20.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = CrimsonRed, modifier = Modifier.size(28.dp))
                }
            }
        }
    }
}

@Composable
fun ShimmerSkeletonRow() {
    val transition = rememberInfiniteTransition(label = "shimmer_row")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_anim"
    )
    val shimmerBrush = Brush.linearGradient(
        colors = listOf(
            Color.White.copy(alpha = 0.04f),
            Color.White.copy(alpha = 0.12f),
            Color.White.copy(alpha = 0.04f)
        ),
        start = Offset(translateAnim - 500f, translateAnim - 500f),
        end = Offset(translateAnim, translateAnim)
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        repeat(3) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .aspectRatio(0.68f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(shimmerBrush)
            )
        }
    }
}

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun FeaturedCarousel(
    featuredDramas: List<Drama>,
    favoriteDramas: List<FavoriteDramaEntity> = emptyList(),
    onActiveDramaChange: (Drama) -> Unit,
    onDramaClick: (Drama) -> Unit,
    onToggleFavorite: (Drama) -> Unit = {},
    onDetailsClick: (Drama) -> Unit = {}
) {
    val pagerState = rememberPagerState(pageCount = { featuredDramas.size })
    val coroutineScope = rememberCoroutineScope()
    val screenWidth = LocalConfiguration.current.screenWidthDp.toFloat()
    val posterWidth = (screenWidth * 0.74f).coerceIn(250f, 320f).dp
    val posterHeight = posterWidth * 1.40f // Portrait aspect ratio (~3:4.2)
    val sidePadding = ((screenWidth.dp - posterWidth) / 2f).coerceAtLeast(16.dp)

    LaunchedEffect(pagerState.currentPage, featuredDramas) {
        featuredDramas.getOrNull(pagerState.currentPage)?.let(onActiveDramaChange)
    }

    LaunchedEffect(featuredDramas.size) {
        while (true) {
            delay(5000)
            if (pagerState.pageCount > 1 && !pagerState.isScrollInProgress) {
                val next = (pagerState.currentPage + 1) % pagerState.pageCount
                pagerState.animateScrollToPage(next)
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp, bottom = 8.dp)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .fillMaxWidth()
                .height(posterHeight),
            contentPadding = PaddingValues(horizontal = sidePadding),
            pageSpacing = 14.dp,
            key = { page -> featuredDramas[page].id }
        ) { page ->
            val drama = featuredDramas[page]
            val pageOffset = (
                (pagerState.currentPage - page) + pagerState.currentPageOffsetFraction
            ).absoluteValue.coerceIn(0f, 1f)
            val scale = lerp(1f, 0.90f, pageOffset)
            val cardAlpha = lerp(1f, 0.50f, pageOffset)

            val coverModel = if (!drama.coverUrl.isNullOrBlank()) drama.coverUrl else (drama.featuredCoverUrl ?: "")
            val isFav = favoriteDramas.any { it.dramaId == drama.id }

            Card(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                        alpha = cardAlpha
                    }
                    .clickable { onDramaClick(drama) },
                shape = RoundedCornerShape(22.dp),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.14f)),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF141418)),
                elevation = CardDefaults.cardElevation(
                    defaultElevation = if (pageOffset < 0.5f) 12.dp else 3.dp
                )
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
                    AsyncImage(
                        model = coverModel,
                        contentDescription = drama.title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )

                    // Cinematic multi-stop gradient scrim
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colorStops = arrayOf(
                                        0.0f to Color.Black.copy(alpha = 0.30f),
                                        0.35f to Color.Transparent,
                                        0.60f to Color.Black.copy(alpha = 0.60f),
                                        0.80f to Color.Black.copy(alpha = 0.90f),
                                        1.0f to Color.Black.copy(alpha = 0.98f)
                                    )
                                )
                            )
                    )

                    // Top Badges
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp)
                            .align(Alignment.TopCenter),
                        horizontalArrangement = Arrangement.Start,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = CrimsonRed,
                            shape = RoundedCornerShape(8.dp),
                            shadowElevation = 4.dp
                        ) {
                            Text(
                                text = "🔥 TOP ${page + 1}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    // Bottom info & controls
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .fillMaxWidth()
                            .padding(14.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.padding(bottom = 6.dp)
                        ) {
                            Surface(
                                color = Color.White.copy(alpha = 0.18f),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    text = drama.category.take(12).uppercase(),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                            Text(
                                text = "•",
                                color = Color.White.copy(alpha = 0.6f),
                                fontSize = 10.sp
                            )
                            Text(
                                text = "${drama.totalEpisodes} EP",
                                color = Color.White.copy(alpha = 0.85f),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        Text(
                            text = drama.title,
                            color = Color.White,
                            fontSize = 19.sp,
                            fontWeight = FontWeight.Black,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            lineHeight = 23.sp
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { onDramaClick(drama) },
                                colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                                shape = RoundedCornerShape(20.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(38.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.PlayArrow,
                                    contentDescription = "Play",
                                    modifier = Modifier.size(18.dp),
                                    tint = Color.White
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = stringResource(id = R.string.watch_now),
                                    color = Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }

                            Surface(
                                shape = CircleShape,
                                color = Color.Black.copy(alpha = 0.55f),
                                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f)),
                                modifier = Modifier
                                    .size(38.dp)
                                    .clickable { onToggleFavorite(drama) }
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = if (isFav) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder,
                                        contentDescription = "Bookmark",
                                        tint = if (isFav) CrimsonRed else Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }

                            Surface(
                                shape = CircleShape,
                                color = Color.Black.copy(alpha = 0.55f),
                                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f)),
                                modifier = Modifier
                                    .size(38.dp)
                                    .clickable { onDetailsClick(drama) }
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.Info,
                                        contentDescription = "Details",
                                        tint = Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (featuredDramas.size > 1) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp, bottom = 4.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(featuredDramas.size) { index ->
                    val isActive = index == pagerState.currentPage
                    val targetWidth = if (isActive) 22.dp else 6.dp
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.dp)
                            .size(
                                width = targetWidth,
                                height = 5.dp
                            )
                            .clip(RoundedCornerShape(50))
                            .background(
                                if (isActive) CrimsonRed else Color.White.copy(alpha = 0.25f)
                            )
                            .clickable {
                                coroutineScope.launch {
                                    pagerState.animateScrollToPage(index)
                                }
                            }
                    )
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK PRO ACTIONS BAR — DramaBox style
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun QuickProActionsBar(
    onRankingsClick: () -> Unit,
    onRewardsClick: () -> Unit,
    onCoinsClick: () -> Unit,
    onShortsClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        QuickActionButton(
            icon = Icons.Default.WorkspacePremium,
            label = "Rankings",
            accentColor = MetallicGold,
            onClick = onRankingsClick,
            modifier = Modifier.weight(1f)
        )
        QuickActionButton(
            icon = Icons.Default.CardGiftcard,
            label = "Rewards",
            accentColor = Color(0xFFFFB300),
            onClick = onRewardsClick,
            modifier = Modifier.weight(1f)
        )
        QuickActionButton(
            icon = Icons.Default.MonetizationOn,
            label = "Get Coins",
            accentColor = Color(0xFF4CAF50),
            onClick = onCoinsClick,
            modifier = Modifier.weight(1f)
        )
        QuickActionButton(
            icon = Icons.Default.Movie,
            label = "Shorts",
            accentColor = CrimsonRed,
            onClick = onShortsClick,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
fun QuickActionButton(
    icon: ImageVector,
    label: String,
    accentColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable { onClick() },
        color = Color(0xFF141418),
        border = BorderStroke(0.8.dp, Color.White.copy(alpha = 0.08f)),
        shape = RoundedCornerShape(14.dp)
    ) {
        Column(
            modifier = Modifier.padding(vertical = 10.dp, horizontal = 2.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(accentColor.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = accentColor,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(modifier = Modifier.height(5.dp))
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White.copy(alpha = 0.9f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP 10 RANKINGS SECTION — Stylized Giant Numbers
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun Top10RankingSection(
    dramas: List<Drama>,
    onMore: () -> Unit,
    onDramaClick: (Drama) -> Unit
) {
    if (dramas.isEmpty()) return

    val top10List = remember(dramas) {
        dramas.sortedByDescending { it.rating }.take(10)
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Surface(
                    color = Color(0xFFFFB300).copy(alpha = 0.15f),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(0.8.dp, Color(0xFFFFB300).copy(alpha = 0.3f))
                ) {
                    Icon(
                        imageVector = Icons.Default.WorkspacePremium,
                        contentDescription = null,
                        tint = Color(0xFFFFB300),
                        modifier = Modifier
                            .padding(4.dp)
                            .size(18.dp)
                    )
                }
                Text(
                    text = "Top 10 Rankings",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp
                )
            }

            TextButton(onClick = onMore) {
                Text(
                    text = stringResource(R.string.more) + " >",
                    color = CrimsonRed,
                    fontWeight = FontWeight.Black,
                    fontSize = 13.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        LazyRow(
            contentPadding = PaddingValues(horizontal = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            itemsIndexed(top10List, key = { _, drama -> "top10_${drama.id}" }) { index, drama ->
                Top10RankingCard(
                    rank = index + 1,
                    drama = drama,
                    onClick = { onDramaClick(drama) }
                )
            }
        }
    }
}

@Composable
fun Top10RankingCard(
    rank: Int,
    drama: Drama,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .width(125.dp)
            .clickable { onClick() }
            .padding(vertical = 4.dp, horizontal = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(178.dp)
        ) {
            // Main poster box
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(14.dp))
                    .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)), RoundedCornerShape(14.dp))
                    .background(Color(0xFF141418))
            ) {
                AsyncImage(
                    model = drama.coverUrl,
                    contentDescription = drama.title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )

                // Cinematic bottom gradient
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.6f)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.5f),
                                    Color.Black.copy(alpha = 0.95f)
                                )
                            )
                        )
                )

                // Top-right: Rating badge
                Surface(
                    modifier = Modifier
                        .padding(6.dp)
                        .align(Alignment.TopEnd),
                    color = Color.Black.copy(alpha = 0.65f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = null,
                            tint = MetallicGold,
                            modifier = Modifier.size(10.dp)
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = String.format(Locale.US, "%.1f", drama.rating.coerceAtLeast(9.0f)),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }

            // Giant Stylized Ranking Number
            val numberColor = when (rank) {
                1 -> Color(0xFFFFD700) // Gold
                2 -> Color(0xFFE0E0E0) // Silver
                3 -> Color(0xFFCD7F32) // Bronze
                else -> Color.White.copy(alpha = 0.92f)
            }

            Text(
                text = "$rank",
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .offset(x = 6.dp, y = 4.dp),
                style = TextStyle(
                    fontSize = 46.sp,
                    fontWeight = FontWeight.Black,
                    fontStyle = FontStyle.Italic,
                    color = numberColor,
                    shadow = Shadow(
                        color = Color.Black,
                        offset = Offset(3f, 3f),
                        blurRadius = 6f
                    )
                )
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = drama.title,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 2.dp)
        )

        Text(
            text = drama.category,
            fontSize = 10.sp,
            color = Color.Gray,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 2.dp)
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAMA GRID CARD — DramaBox compact style
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun DramaGridCard(
    drama: Drama,
    badgeText: String? = null,
    progressFraction: Float? = null,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 4.dp, horizontal = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(0.68f)
                .clip(RoundedCornerShape(14.dp))
                .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)), RoundedCornerShape(14.dp))
                .background(Color(0xFF141418))
        ) {
            AsyncImage(
                model = drama.coverUrl,
                contentDescription = drama.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )

            // Deep cinematic gradient bottom overlay
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.55f)
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.4f),
                                Color.Black.copy(alpha = 0.92f)
                            )
                        )
                    )
            )

            // Top-left: Category pill badge
            Surface(
                modifier = Modifier
                    .padding(6.dp)
                    .align(Alignment.TopStart),
                color = Color.Black.copy(alpha = 0.65f),
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = drama.category.take(8).uppercase(),
                    fontSize = 9.sp,
                    color = Color.White.copy(alpha = 0.9f),
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                )
            }

            // Top-right: HOT / Trending badge
            if (drama.isTrending && progressFraction == null) {
                Surface(
                    modifier = Modifier
                        .padding(6.dp)
                        .align(Alignment.TopEnd),
                    color = CrimsonRed,
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "🔥 " + stringResource(R.string.hot),
                            fontSize = 9.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }

            // Play overlay icon for Continue Watching
            if (progressFraction != null) {
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.6f))
                        .border(1.dp, Color.White.copy(alpha = 0.3f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            // Bottom overlay: Episode count or badgeText
            Row(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(horizontal = 6.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.9f),
                    modifier = Modifier.size(12.dp)
                )
                Spacer(modifier = Modifier.width(2.dp))
                Text(
                    text = badgeText ?: stringResource(R.string.ep_count_short, drama.totalEpisodes),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
            }

            // Progress bar at the very bottom edge of poster
            if (progressFraction != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .align(Alignment.BottomCenter)
                        .background(Color.White.copy(alpha = 0.25f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progressFraction.coerceIn(0.05f, 1f))
                            .fillMaxHeight()
                            .background(CrimsonRed)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = drama.title,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            lineHeight = 16.sp,
            modifier = Modifier.padding(horizontal = 2.dp)
        )
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// DRAMA ROW CARD (for My List)
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun DramaRowCard(drama: Drama, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .testTag("drama_card_${drama.id}"),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.05f)),
        shape = RoundedCornerShape(10.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            AsyncImage(
                model = drama.coverUrl,
                contentDescription = null,
                modifier = Modifier
                    .size(width = 100.dp, height = 130.dp)
                    .clip(RoundedCornerShape(10.dp)),
                contentScale = ContentScale.Crop
            )

            Column(
                modifier = Modifier
                    .padding(14.dp)
                    .weight(1f)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Surface(
                        color = Color.White.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = drama.category,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = MetallicGold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = drama.title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Text(
                    text = drama.description,
                    fontSize = 11.sp,
                    color = Color.Gray,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 4.dp),
                    lineHeight = 15.sp
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = stringResource(R.string.episodes_total, drama.totalEpisodes),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = CrimsonRed
                    )

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = stringResource(R.string.stream_now),
                            fontSize = 11.sp,
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = null,
                            tint = CrimsonRed,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MY LIST TAB
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun MyListTab(navController: NavController, viewModel: SnapReelsViewModel, initialSection: String = "favorites") {
    val favorites by viewModel.favoriteDramas.collectAsState()
    val history by viewModel.watchHistory.collectAsState()
    val dramasAll by viewModel.dramas.collectAsState()
    var selectedSection by remember(initialSection) { mutableStateOf(initialSection) }
    var historyLimit by remember { mutableIntStateOf(10) }
    var showLimitMenu by remember { mutableStateOf(false) }

    LaunchedEffect(selectedSection) {
        viewModel.syncLibrary()
    }

    val matchedFavorites = dramasAll.filter { d -> favorites.any { it.dramaId == d.id } }
    val dramasById = dramasAll.associateBy { it.id }
    val displayedHistory = history.mapNotNull { item ->
        dramasById[item.seriesId]?.let { drama -> item to drama }
    }.take(historyLimit)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = stringResource(R.string.my_list),
            fontSize = 26.sp,
            fontWeight = FontWeight.Black,
            color = Color.White,
            modifier = Modifier.padding(bottom = 14.dp)
        )

        // Custom premium designed tabs
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(Color.White.copy(alpha = 0.05f))
                .padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Favorites Tab
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (selectedSection == "favorites") CrimsonRed else Color.Transparent)
                    .clickable { selectedSection = "favorites" }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Favorite,
                        contentDescription = stringResource(R.string.mylist_favorite),
                        tint = if (selectedSection == "favorites") Color.White else Color.Gray,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = stringResource(R.string.mylist_favorite),
                        color = if (selectedSection == "favorites") Color.White else Color.Gray,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }

            // History Tab
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (selectedSection == "history") CrimsonRed else Color.Transparent)
                    .clickable { selectedSection = "history" }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.History,
                        contentDescription = stringResource(R.string.mylist_history),
                        tint = if (selectedSection == "history") Color.White else Color.Gray,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = stringResource(R.string.mylist_history),
                        color = if (selectedSection == "history") Color.White else Color.Gray,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (selectedSection == "history") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(
                    onClick = { viewModel.clearAllHistory() },
                    enabled = history.isNotEmpty(),
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = CrimsonRed,
                        disabledContentColor = Color.Gray.copy(alpha = 0.5f)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.DeleteSweep,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(stringResource(R.string.clear_history), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
                Box {
                    OutlinedButton(
                        onClick = { showLimitMenu = true },
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.15f)),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color.White
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(stringResource(R.string.show_x, historyLimit), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = Icons.Default.ArrowDropDown,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    DropdownMenu(
                        expanded = showLimitMenu,
                        onDismissRequest = { showLimitMenu = false },
                        modifier = Modifier.background(DarkerSlate)
                    ) {
                        listOf(10, 20, 50, 100).forEach { limit ->
                            DropdownMenuItem(
                                text = { 
                                    Text(
                                        text = stringResource(R.string.show_x, limit), 
                                        color = if (historyLimit == limit) CrimsonRed else Color.White,
                                        fontWeight = if (historyLimit == limit) FontWeight.Black else FontWeight.Normal
                                    ) 
                                },
                                onClick = {
                                    historyLimit = limit
                                    showLimitMenu = false
                                }
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        val isEmpty = if (selectedSection == "favorites") matchedFavorites.isEmpty() else displayedHistory.isEmpty()
        if (isEmpty) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = if (selectedSection == "favorites") Icons.Default.FavoriteBorder else Icons.Default.History,
                        contentDescription = "Empty",
                        tint = Color.Gray,
                        modifier = Modifier.size(70.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = stringResource(R.string.no_items_found),
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp
                    )
                }
            }
        } else {
            androidx.compose.foundation.lazy.LazyColumn(
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                if (selectedSection == "favorites") {
                    items(matchedFavorites) { drama ->
                        DramaRowCard(drama = drama) {
                            viewModel.playDramaDirect(drama) {
                                navController.navigate("player")
                            }
                        }
                    }
                } else {
                    items(displayedHistory) { (historyItem, drama) ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    viewModel.resumeHistory(drama, historyItem) {
                                        navController.navigate("player")
                                    }
                                },
                            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.05f)),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                AsyncImage(
                                    model = drama.coverUrl,
                                    contentDescription = null,
                                    modifier = Modifier.size(74.dp).clip(RoundedCornerShape(8.dp)),
                                    contentScale = ContentScale.Crop
                                )
                                Column(modifier = Modifier.weight(1f).padding(horizontal = 12.dp)) {
                                    Text(drama.title, color = Color.White, fontWeight = FontWeight.Bold, maxLines = 1)
                                    Text(
                                        "Continue Episode ${historyItem.episodeInSeason}",
                                        color = CrimsonRed,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                IconButton(onClick = { viewModel.removeHistoryItem(historyItem.seriesId) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Remove history", tint = Color.Gray)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
