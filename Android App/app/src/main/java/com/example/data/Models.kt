package com.example.data

data class Drama(
    val id: String,
    val title: String,
    val description: String,
    val coverUrl: String,
    val featuredCoverUrl: String? = null,
    val category: String,
    val genres: List<String> = emptyList(),
    val rating: Float,
    val totalEpisodes: Int,
    val releaseYear: Int,
    val isTrending: Boolean,
    val tags: List<String> = emptyList(),
    val slug: String = "",
    val views: Long = 0L,
    val likes: Long = 0L,
    val createdAtMillis: Long = 0L
)

data class SubtitleModel(
    val language: String = "English",
    val languageCode: String = "en",
    val url: String = ""
)

data class Episode(
    val id: String,
    val dramaId: String,
    val title: String,
    val episodeNumber: Int,
    val videoUrl: String,
    val isPremium: Boolean = false,
    val coinCost: Int = 0,
    val durationSec: Int = 120,
    val subtitles: List<SubtitleModel> = emptyList()
)

data class ShortItem(val drama: Drama, val episode: Episode)

data class WatchHistoryItem(
    val seriesId: String,
    val episodeId: String,
    val episodeInSeason: Int,
    val progress: Int = 0,
    val watchedAt: String = ""
)

data class CoinPackModel(
    val id: String,
    val name: String,
    val description: String,
    val amount: Int,
    val price: Double,
    val type: String,
    val googleProductId: String = "",
    val appleProductId: String = ""
)

data class RewardTaskModel(
    val id: String,
    val title: String,
    val type: String,
    val coins: Int,
    val url: String,
    val timerSeconds: Int,
    val frequency: String
)

data class LanguageModel(
    val id: String,
    val name: String,
    val languageCode: String,
    val countryCode: String
)

data class AppSettings(
    val siteUrl: String = "",
    val emailLoginEnabled: Boolean = true,
    val googleLoginEnabled: Boolean = true,
    val facebookLoginEnabled: Boolean = false,
    val appleLoginEnabled: Boolean = false,
    val phoneLoginEnabled: Boolean = false,
    val stripeEnabled: Boolean = false,
    val paypalEnabled: Boolean = false,
    val razorpayEnabled: Boolean = false,
    val flutterwaveEnabled: Boolean = false,
    val phonepeEnabled: Boolean = false,
    val cashfreeEnabled: Boolean = false,
    val payuEnabled: Boolean = false,
    val googlePayEnabled: Boolean = false,
    val currency: String = "USD",
    val currencySymbol: String = "$",
    val coinPacks: List<CoinPackModel> = emptyList(),
    val rewardsEnabled: Boolean = false,
    val dailyRewards: List<Int> = emptyList(),
    val rewardTasks: List<RewardTaskModel> = emptyList(),
    val referralEnabled: Boolean = false,
    val referralRewardCoins: Int = 50,
    val referredBonusCoins: Int = 30,
    val privacyPolicyUrl: String = "",
    val termsOfServiceUrl: String = "",
    val rateUsUrl: String = "",
    val updateUrl: String = "",
    val versionCode: Int = 1,
    val forceUpdateEnabled: Boolean = false,
    val forceLoginEnabled: Boolean = false,
    val languages: List<LanguageModel> = emptyList(),
    val adsProvider: String = "admob",
    val admobBannerId: String = "",
    val admobBannerEnabled: Boolean = false,
    val admobInterstitialId: String = "",
    val admobInterstitialEnabled: Boolean = false,
    val admobRewardedId: String = "",
    val admobRewardedEnabled: Boolean = false,
    val admobRewardedLimit: Int = 5,
    val applovinSdkKey: String = "",
    val applovinBannerId: String = "",
    val applovinBannerEnabled: Boolean = false,
    val applovinInterstitialId: String = "",
    val applovinInterstitialEnabled: Boolean = false,
    val applovinRewardedId: String = "",
    val applovinRewardedEnabled: Boolean = false,
    val facebookBannerId: String = "",
    val facebookBannerEnabled: Boolean = false,
    val facebookInterstitialId: String = "",
    val facebookInterstitialEnabled: Boolean = false,
    val facebookRewardedId: String = "",
    val facebookRewardedEnabled: Boolean = false,
    val oneSignalAppId: String = "",
    val watermarkEnabled: Boolean = false,
    val watermarkUrl: String = "",
    val watermarkPosition: String = "top-right",
    val watermarkOpacity: Float = 0.8f,
    val admobAppOpenId: String = "",
    val admobAppOpenEnabled: Boolean = false
)

object DummyData {
    val Categories = listOf("Romance", "Billionaire", "Revenge", "Suspense", "Fantasy")

    val Dramas = listOf(
        Drama(
            id = "billionaires_bride",
            title = "The Billionaire's Secret Bride",
            description = "To save her family, Maya agrees to pretend-marry her sister's runaway fiancé, the mysterious billionaire CEO Christian Vance. But christian has secrets of his own and Maya soon uncovers a dark conspiracy that threatens both their families, while fighting a burning passion that neither of them expected.",
            coverUrl = "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
            category = "Billionaire",
            rating = 4.8f,
            totalEpisodes = 10,
            releaseYear = 2026,
            isTrending = true,
            tags = listOf("CEO", "Contract Marriage", "Secret Identity", "Romance")
        ),
        Drama(
            id = "ceo_maid_revenge",
            title = "Revenge of the CEO's Maid",
            description = "Wrongly accused of a scandal and humiliated, Sophia returns five years later as a quiet maid in the lavish villa of the cold-hearted CEO Adrian Pierce, who destroyed her life. Armed with a disguise and an iron will, Sophia plans her ultimate vengeance, only to realize Adrian isn't the villain she thought.",
            coverUrl = "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80",
            category = "Revenge",
            rating = 4.9f,
            totalEpisodes = 8,
            releaseYear = 2026,
            isTrending = true,
            tags = listOf("Revenge", "Drama", "Betrayal", "CEO")
        ),
        Drama(
            id = "dragon_king",
            title = "Return of the Dragon King",
            description = "Abandoned by his family and left for dead in a remote valley, Tyler unearths an ancient mystical power. Ten years later, he returns as the Dragon King, wielding colossal power and astronomical wealth, determined to reclaim his family's lost honor and avenge his mother's death.",
            coverUrl = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80",
            category = "Fantasy",
            rating = 4.7f,
            totalEpisodes = 6,
            releaseYear = 2025,
            isTrending = false,
            tags = listOf("Secret Hero", "Magic", "Unbeatable", "Action")
        ),
        Drama(
            id = "sweet_lies",
            title = "Whispered Lies of Love",
            description = "When rising model Clara starts receiving anonymous, thrilling letters detailing her deepest desires, she thinks she's found her perfect soulmate. Little does she know the sender is her cold boss David, who handles her contract during the day, but is obsessed with her by night.",
            coverUrl = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80",
            category = "Romance",
            rating = 4.5f,
            totalEpisodes = 7,
            releaseYear = 2026,
            isTrending = false,
            tags = listOf("Stalker", "Enemies to Lovers", "Romance", "Intrigue")
        ),
        Drama(
            id = "conspiracy_love",
            title = "Chasing the Shadow Lover",
            description = "A hardened female detective, Nora, has one objective: catch the mysterious mastermind 'Shadow' who was framed for a global heist. She joins forces under absolute secrecy with her billionaire partner Leo, only to find the lines between justice and love blurred as they run for their lives.",
            coverUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
            category = "Suspense",
            rating = 4.6f,
            totalEpisodes = 8,
            releaseYear = 2026,
            isTrending = true,
            tags = listOf("Detective", "Partners-in-Crime", "Suspense", "Action")
        )
    )

    // Vertical video playlist loops (exclusively using highly stable public mp4 clips from Google's GTV Video Sample bucket)
    val VideoUrls = listOf(
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4"
    )

    fun getEpisodesForDrama(dramaId: String): List<Episode> {
        val dramaObj = Dramas.firstOrNull { it.id == dramaId } ?: return emptyList()
        val totalCount = dramaObj.totalEpisodes
        return (1..totalCount).map { epNum ->
            val videoIndex = (dramaId.hashCode() + epNum) % VideoUrls.size
            // Make episode 1-3 free, others premium
            val isPremium = epNum > 3
            Episode(
                id = "${dramaId}_ep_${epNum}",
                dramaId = dramaId,
                title = "Episode $epNum: ${if (isPremium) "Unlock Premium Secret" else "Truth Revealed"}",
                episodeNumber = epNum,
                videoUrl = VideoUrls[Math.abs(videoIndex)],
                isPremium = isPremium,
                coinCost = if (isPremium) 12 else 0,
                durationSec = 80 + (epNum * 10)
            )
        }
    }
}

data class CoinTransaction(
    val id: String,
    val userId: String,
    val type: String,
    val amount: Int,
    val description: String,
    val createdAt: String
)
