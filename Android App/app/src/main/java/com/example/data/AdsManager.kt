package com.example.data

import android.app.Activity
import android.content.Context
import android.view.View
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback

import com.applovin.sdk.AppLovinSdk
import com.applovin.mediation.ads.MaxAdView
import com.applovin.mediation.ads.MaxInterstitialAd
import com.applovin.mediation.ads.MaxRewardedAd
import com.applovin.mediation.MaxAd
import com.applovin.mediation.MaxAdListener
import com.applovin.mediation.MaxRewardedAdListener
import com.applovin.mediation.MaxAdViewAdListener
import com.applovin.mediation.MaxError
import com.applovin.mediation.MaxReward

import com.facebook.ads.AudienceNetworkAds
import com.facebook.ads.AdView as FbAdView
import com.facebook.ads.AdSize as FbAdSize
import com.facebook.ads.AdListener as FbAdListener
import com.facebook.ads.AdError as FbAdError
import com.facebook.ads.InterstitialAd as FbInterstitialAd
import com.facebook.ads.InterstitialAdListener as FbInterstitialAdListener
import com.facebook.ads.RewardedVideoAd as FbRewardedVideoAd
import com.facebook.ads.RewardedVideoAdListener as FbRewardedVideoAdListener
import com.facebook.ads.Ad as FbAd

object AdsManager {
    private var isAdMobInitialized = false
    private var isAppLovinInitialized = false
    private var isFacebookInitialized = false

    private var bannerRotationIndex = 0
    private var interstitialRotationIndex = 0
    private var rewardedRotationIndex = 0

    fun initSdk(context: Context, appSettings: AppSettings) {
        // Initialize AdMob
        if (!isAdMobInitialized) {
            runCatching {
                MobileAds.initialize(context) {}
                isAdMobInitialized = true
            }
        }

        // Initialize AppLovin
        if (!isAppLovinInitialized && appSettings.applovinSdkKey.isNotBlank()) {
            runCatching {
                val settings = com.applovin.sdk.AppLovinSdkSettings(context)
                val sdkInstance = AppLovinSdk.getInstance(appSettings.applovinSdkKey.trim(), settings, context)
                sdkInstance.initializeSdk {
                    isAppLovinInitialized = true
                }
            }
        }

        // Initialize Facebook Audience Network
        if (!isFacebookInitialized) {
            runCatching {
                AudienceNetworkAds.initialize(context)
                isFacebookInitialized = true
            }
        }
    }

    private fun getProviderForType(type: String, appSettings: AppSettings): String {
        val provider = appSettings.adsProvider
        if (provider != "multi" && provider != "rotation") {
            return provider
        }

        val enabledProviders = mutableListOf<String>()
        when (type) {
            "banner" -> {
                if (appSettings.admobBannerEnabled && appSettings.admobBannerId.isNotBlank()) enabledProviders.add("admob")
                if (appSettings.applovinBannerEnabled && appSettings.applovinBannerId.isNotBlank()) enabledProviders.add("applovin")
                if (appSettings.facebookBannerEnabled && appSettings.facebookBannerId.isNotBlank()) enabledProviders.add("facebook")
            }
            "interstitial" -> {
                if (appSettings.admobInterstitialEnabled && appSettings.admobInterstitialId.isNotBlank()) enabledProviders.add("admob")
                if (appSettings.applovinInterstitialEnabled && appSettings.applovinInterstitialId.isNotBlank()) enabledProviders.add("applovin")
                if (appSettings.facebookInterstitialEnabled && appSettings.facebookInterstitialId.isNotBlank()) enabledProviders.add("facebook")
            }
            "rewarded" -> {
                if (appSettings.admobRewardedEnabled && appSettings.admobRewardedId.isNotBlank()) enabledProviders.add("admob")
                if (appSettings.applovinRewardedEnabled && appSettings.applovinRewardedId.isNotBlank()) enabledProviders.add("applovin")
                if (appSettings.facebookRewardedEnabled && appSettings.facebookRewardedId.isNotBlank()) enabledProviders.add("facebook")
            }
        }

        if (enabledProviders.isEmpty()) {
            return "admob"
        }

        val index = when (type) {
            "banner" -> {
                val idx = bannerRotationIndex
                bannerRotationIndex = (idx + 1) % enabledProviders.size
                idx
            }
            "interstitial" -> {
                val idx = interstitialRotationIndex
                interstitialRotationIndex = (idx + 1) % enabledProviders.size
                idx
            }
            "rewarded" -> {
                val idx = rewardedRotationIndex
                rewardedRotationIndex = (idx + 1) % enabledProviders.size
                idx
            }
            else -> 0
        }

        return enabledProviders[index]
    }

    fun getBannerView(
        context: Context,
        appSettings: AppSettings,
        onLoaded: () -> Unit = {},
        onError: (String) -> Unit = {}
    ): View? {
        val provider = getProviderForType("banner", appSettings)
        when (provider) {
            "admob" -> {
                if (!appSettings.admobBannerEnabled || appSettings.admobBannerId.isBlank()) return null
                val adView = AdView(context)
                adView.setAdSize(AdSize.BANNER)
                adView.adUnitId = appSettings.admobBannerId.trim()
                adView.adListener = object : com.google.android.gms.ads.AdListener() {
                    override fun onAdLoaded() { onLoaded() }
                    override fun onAdFailedToLoad(error: LoadAdError) { onError(error.message) }
                }
                adView.loadAd(AdRequest.Builder().build())
                return adView
            }
            "applovin" -> {
                if (!appSettings.applovinBannerEnabled || appSettings.applovinBannerId.isBlank()) return null
                val maxAdView = MaxAdView(appSettings.applovinBannerId.trim(), context)
                maxAdView.setListener(object : MaxAdViewAdListener {
                    override fun onAdLoaded(ad: MaxAd) { onLoaded() }
                    override fun onAdLoadFailed(adUnitId: String, error: MaxError) { onError(error.message) }
                    override fun onAdDisplayFailed(ad: MaxAd, error: MaxError) {}
                    override fun onAdClicked(ad: MaxAd) {}
                    override fun onAdExpanded(ad: MaxAd) {}
                    override fun onAdCollapsed(ad: MaxAd) {}
                    override fun onAdDisplayed(ad: MaxAd) {}
                    override fun onAdHidden(ad: MaxAd) {}
                })
                maxAdView.loadAd()
                return maxAdView
            }
            "facebook" -> {
                if (!appSettings.facebookBannerEnabled || appSettings.facebookBannerId.isBlank()) return null
                val fbAdView = FbAdView(context, appSettings.facebookBannerId.trim(), FbAdSize.BANNER_HEIGHT_50)
                fbAdView.loadAd(fbAdView.buildLoadAdConfig().withAdListener(object : FbAdListener {
                    override fun onAdLoaded(ad: FbAd) { onLoaded() }
                    override fun onError(ad: FbAd, error: FbAdError) { onError(error.errorMessage) }
                    override fun onAdClicked(ad: FbAd) {}
                    override fun onLoggingImpression(ad: FbAd) {}
                }).build())
                return fbAdView
            }
            else -> return null
        }
    }

    fun loadInterstitial(
        context: Context,
        appSettings: AppSettings,
        onLoaded: (Any) -> Unit,
        onError: (String) -> Unit
    ) {
        val provider = getProviderForType("interstitial", appSettings)
        when (provider) {
            "admob" -> {
                if (!appSettings.admobInterstitialEnabled || appSettings.admobInterstitialId.isBlank()) {
                    onError("AdMob Interstitial is disabled or missing ID")
                    return
                }
                InterstitialAd.load(
                    context,
                    appSettings.admobInterstitialId.trim(),
                    AdRequest.Builder().build(),
                    object : InterstitialAdLoadCallback() {
                        override fun onAdLoaded(interstitialAd: InterstitialAd) { onLoaded(interstitialAd) }
                        override fun onAdFailedToLoad(error: LoadAdError) { onError(error.message) }
                    }
                )
            }
            "applovin" -> {
                if (!appSettings.applovinInterstitialEnabled || appSettings.applovinInterstitialId.isBlank()) {
                    onError("AppLovin Interstitial is disabled or missing ID")
                    return
                }
                val activity = context as? Activity
                if (activity == null) {
                    onError("Context is not an Activity")
                    return
                }
                val maxInterstitial = MaxInterstitialAd(appSettings.applovinInterstitialId.trim(), activity)
                maxInterstitial.setListener(object : MaxAdListener {
                    override fun onAdLoaded(ad: MaxAd) { onLoaded(maxInterstitial) }
                    override fun onAdLoadFailed(adUnitId: String, error: MaxError) { onError(error.message) }
                    override fun onAdDisplayFailed(ad: MaxAd, error: MaxError) { onError(error.message) }
                    override fun onAdClicked(ad: MaxAd) {}
                    override fun onAdDisplayed(ad: MaxAd) {}
                    override fun onAdHidden(ad: MaxAd) {}
                })
                maxInterstitial.loadAd()
            }
            "facebook" -> {
                if (!appSettings.facebookInterstitialEnabled || appSettings.facebookInterstitialId.isBlank()) {
                    onError("Facebook Interstitial is disabled or missing ID")
                    return
                }
                val fbInterstitial = FbInterstitialAd(context, appSettings.facebookInterstitialId.trim())
                val listener = object : FbInterstitialAdListener {
                    override fun onAdLoaded(ad: FbAd) { onLoaded(fbInterstitial) }
                    override fun onError(ad: FbAd, error: FbAdError) { onError(error.errorMessage) }
                    override fun onAdClicked(ad: FbAd) {}
                    override fun onLoggingImpression(ad: FbAd) {}
                    override fun onInterstitialDisplayed(ad: FbAd) {}
                    override fun onInterstitialDismissed(ad: FbAd) {}
                }
                fbInterstitial.loadAd(fbInterstitial.buildLoadAdConfig().withAdListener(listener).build())
            }
            else -> onError("Unknown provider: $provider")
        }
    }

    fun showInterstitial(
        activity: Activity,
        ad: Any,
        onDismissed: () -> Unit
    ) {
        runCatching {
            when (ad) {
                is InterstitialAd -> {
                    ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                        override fun onAdDismissedFullScreenContent() { onDismissed() }
                        override fun onAdFailedToShowFullScreenContent(error: com.google.android.gms.ads.AdError) { onDismissed() }
                    }
                    ad.show(activity)
                }
                is MaxInterstitialAd -> {
                    ad.setListener(object : MaxAdListener {
                        override fun onAdLoaded(ad: MaxAd) {}
                        override fun onAdLoadFailed(adUnitId: String, error: MaxError) { onDismissed() }
                        override fun onAdDisplayFailed(ad: MaxAd, error: MaxError) { onDismissed() }
                        override fun onAdClicked(ad: MaxAd) {}
                        override fun onAdDisplayed(ad: MaxAd) {}
                        override fun onAdHidden(ad: MaxAd) { onDismissed() }
                    })
                    if (ad.isReady) {
                        ad.showAd()
                    } else {
                        onDismissed()
                    }
                }
                is FbInterstitialAd -> {
                    val listener = object : FbInterstitialAdListener {
                        override fun onAdLoaded(ad: FbAd) {}
                        override fun onError(ad: FbAd, error: FbAdError) { onDismissed() }
                        override fun onAdClicked(ad: FbAd) {}
                        override fun onLoggingImpression(ad: FbAd) {}
                        override fun onInterstitialDisplayed(ad: FbAd) {}
                        override fun onInterstitialDismissed(ad: FbAd) { onDismissed() }
                    }
                    if (ad.isAdLoaded) {
                        ad.show()
                    } else {
                        onDismissed()
                    }
                }
                else -> onDismissed()
            }
        }.onFailure {
            it.printStackTrace()
            onDismissed()
        }
    }

    fun loadAndShowRewarded(
        activity: Activity,
        appSettings: AppSettings,
        onRewarded: () -> Unit,
        onError: (String) -> Unit,
        onStarted: () -> Unit = {}
    ) {
        val provider = getProviderForType("rewarded", appSettings)
        onStarted()
        when (provider) {
            "admob" -> {
                if (!appSettings.admobRewardedEnabled || appSettings.admobRewardedId.isBlank()) {
                    onError("AdMob Rewarded is disabled or missing ID")
                    return
                }
                RewardedAd.load(
                    activity,
                    appSettings.admobRewardedId.trim(),
                    AdRequest.Builder().build(),
                    object : RewardedAdLoadCallback() {
                        override fun onAdLoaded(rewardedAd: RewardedAd) {
                            rewardedAd.fullScreenContentCallback = object : FullScreenContentCallback() {
                                override fun onAdFailedToShowFullScreenContent(error: com.google.android.gms.ads.AdError) {
                                    onError(error.message)
                                }
                            }
                            rewardedAd.show(activity) {
                                onRewarded()
                            }
                        }
                        override fun onAdFailedToLoad(error: LoadAdError) {
                            onError(error.message)
                        }
                    }
                )
            }
            "applovin" -> {
                if (!appSettings.applovinRewardedEnabled || appSettings.applovinRewardedId.isBlank()) {
                    onError("AppLovin Rewarded is disabled or missing ID")
                    return
                }
                val maxRewarded = MaxRewardedAd.getInstance(appSettings.applovinRewardedId.trim(), activity)
                var hasRewarded = false
                maxRewarded.setListener(object : MaxRewardedAdListener {
                    override fun onAdLoaded(ad: MaxAd) {
                        if (maxRewarded.isReady) {
                            maxRewarded.showAd()
                        } else {
                            onError("AppLovin ad loaded but not ready")
                        }
                    }
                    override fun onAdLoadFailed(adUnitId: String, error: MaxError) {
                        onError(error.message)
                    }
                    override fun onAdDisplayFailed(ad: MaxAd, error: MaxError) {
                        onError(error.message)
                    }
                    override fun onAdClicked(ad: MaxAd) {}
                    override fun onAdDisplayed(ad: MaxAd) {}
                    override fun onAdHidden(ad: MaxAd) {
                        if (hasRewarded) {
                            // User earned reward
                        } else {
                            onError("Ad closed without reward")
                        }
                    }
                    override fun onUserRewarded(ad: MaxAd, reward: MaxReward) {
                        hasRewarded = true
                        onRewarded()
                    }
                })
                maxRewarded.loadAd()
            }
            "facebook" -> {
                if (!appSettings.facebookRewardedEnabled || appSettings.facebookRewardedId.isBlank()) {
                    onError("Facebook Rewarded is disabled or missing ID")
                    return
                }
                val fbRewarded = FbRewardedVideoAd(activity, appSettings.facebookRewardedId.trim())
                val listener = object : FbRewardedVideoAdListener {
                    override fun onAdLoaded(ad: FbAd) {
                        if (fbRewarded.isAdLoaded) {
                            fbRewarded.show()
                        } else {
                            onError("Facebook ad loaded but not ready")
                        }
                    }
                    override fun onError(ad: FbAd, error: FbAdError) {
                        onError(error.errorMessage)
                    }
                    override fun onAdClicked(ad: FbAd) {}
                    override fun onLoggingImpression(ad: FbAd) {}
                    override fun onRewardedVideoCompleted() {
                        onRewarded()
                    }
                    override fun onRewardedVideoClosed() {
                        // User dismissed
                    }
                }
                fbRewarded.loadAd(fbRewarded.buildLoadAdConfig().withAdListener(listener).build())
            }
            else -> onError("Unknown provider: $provider")
        }
    }

    fun showAppOpenAd(
        activity: Activity,
        appSettings: AppSettings,
        onDismiss: () -> Unit = {}
    ) {
        if (!appSettings.admobAppOpenEnabled || appSettings.admobAppOpenId.isBlank()) {
            onDismiss()
            return
        }

        initSdk(activity, appSettings)

        val adUnitId = appSettings.admobAppOpenId.trim()
        val request = AdRequest.Builder().build()

        com.google.android.gms.ads.appopen.AppOpenAd.load(
            activity,
            adUnitId,
            request,
            object : com.google.android.gms.ads.appopen.AppOpenAd.AppOpenAdLoadCallback() {
                override fun onAdLoaded(appOpenAd: com.google.android.gms.ads.appopen.AppOpenAd) {
                    appOpenAd.fullScreenContentCallback = object : FullScreenContentCallback() {
                        override fun onAdDismissedFullScreenContent() {
                            onDismiss()
                        }
                        override fun onAdFailedToShowFullScreenContent(error: com.google.android.gms.ads.AdError) {
                            onDismiss()
                        }
                    }
                    appOpenAd.show(activity)
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    onDismiss()
                }
            }
        )
    }
}
