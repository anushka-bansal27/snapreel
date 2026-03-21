
export type CastMember = {
  name: string;
  role: string;
  avatarUrl: string;
};

export type Episode = {
  id: string;
  seriesId: string;
  episodeInSeason: number;
  videoSources?: { quality: string; url: string; }[];
  subtitles?: { language: string; languageCode: string; url: string; }[];
};

export type Series = {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  featuredCoverUrl?: string;
  genres: string[];
  tags?: string[];
  cast: CastMember[];
  keywords?: string;
  plotSummary?: string;
  slug?: string;
  seoTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  freeEpisodesCount?: number;
  isFeatured?: boolean;
  isPremium?: boolean;
  views?: number;
  likes?: number;
  language?: string; // Original language
  targetLanguages?: string[]; // Languages where the movie should be visible
  tmdbId?: number;
  createdAt?: string | Date;
};

export type UserProfile = {
  uid: string;
  publicId?: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  coins: number;
  isVip: boolean;
  vipExpiry?: string | Date;
  disabled?: boolean;
  createdAt: string | Date;
  unlockedEpisodeIds?: string[];
  todayAdCount?: number;
  lastCheckInDate?: string; // YYYY-MM-DD
  consecutiveCheckInDays?: number; // 1-7
  resetToken?: string;
  resetTokenExpiry?: Date;
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  referralEarnings?: number;
};

export type AdminProfile = {
  id?: string;
  username: string;
  email: string;
  passwordHash?: string;
  passwordSalt?: string;
  passwordAlgorithm?: string;
  displayName: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  showOnHomepage?: boolean;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  target: 'all' | 'specific';
  targetUserId?: string;
  sentAt: string | Date;
  status: 'sent' | 'failed';
};

export type Report = {
  id: string;
  reporterUid: string;
  reporterEmail?: string;
  reportedContentRef: string; // e.g. /series/series-id or /episodes/episode-id
  reportedContentTitle?: string;
  seriesId?: string; // Denormalized for easier lookup
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string | Date;
};

export type CoinPack = {
  id: string;
  name: string;
  description: string;
  amount: number; // coin amount or 0 for membership
  price: number; // in USD
  type: 'coins' | 'membership';
  durationDays?: number;
  appleProductId?: string;
  googleProductId?: string;
};

export type Ad = {
  id: string;
  title: string;
  type: 'video' | 'banner' | 'script';
  provider: string;
  adUrl?: string;
  targetUrl?: string;
  scriptContent?: string;
  isActive: boolean;
  skipTimerSeconds?: number;
  dailyWatchLimit?: number;
};

export type MonetizationSettings = {
    episodeCost: number;
    isCoinsActive?: boolean;
    currency?: string;
    currencySymbol?: string;
};

export type RewardsSettings = {
    isEnabled: boolean;
    dailyRewards?: number[]; // Array of 7 numbers for Day 1-7
};

export type RewardTask = {
    id: string;
    title: string;
    description?: string;
    type: 'link' | 'ad';
    platform?: 'website' | 'android' | 'ios';
    coins: number;
    url?: string; // For link clicks
    adScript?: string; // For ad watching
    timerSeconds: number; // Timer for links, Skip timer for ads
    frequency: 'daily' | 'once';
    isActive: boolean;
};

export type MobileSettings = {
    apiKey: string;
    privacyPolicyUrl?: string;
    termsOfServiceUrl?: string;
    rateUsUrl?: string;
    updateUrl?: string;
    versionCode?: number;
    forceUpdateEnabled?: boolean;
    forceLoginEnabled?: boolean;
    adsProvider?: 'admob' | 'applovin' | 'facebook' | 'multi';
    admobBannerId?: string;
    admobBannerEnabled?: boolean;
    admobInterstitialId?: string;
    admobInterstitialEnabled?: boolean;
    admobRewardedId?: string;
    admobRewardedEnabled?: boolean;
    admobRewardedLimit?: number;
    admobAppOpenId?: string;
    admobAppOpenEnabled?: boolean;
    applovinSdkKey?: string;
    applovinBannerId?: string;
    applovinBannerEnabled?: boolean;
    applovinInterstitialId?: string;
    applovinInterstitialEnabled?: boolean;
    applovinRewardedId?: string;
    applovinRewardedEnabled?: boolean;
    facebookBannerId?: string;
    facebookBannerEnabled?: boolean;
    facebookInterstitialId?: string;
    facebookInterstitialEnabled?: boolean;
    facebookRewardedId?: string;
    facebookRewardedEnabled?: boolean;
    // Share Landing Page & Deep Links
    shareLandingTitle?: string;
    shareLandingDescription?: string;
    androidPackageName?: string;
    androidPlayStoreUrl?: string;
    iosAppStoreUrl?: string;
    iosAppScheme?: string;
    enableWebPlayer?: boolean;
    enableAndroidApp?: boolean;
    enableIosApp?: boolean;
    autoOpenApp?: boolean;
};

export type UserRewardClaim = {
    id: string;
    userId: string;
    taskId: string;
    claimedAt: string | Date;
};

export type PluginsSettings = {
    gaId?: string;
    captchaProvider: 'google' | 'cloudflare' | 'hcaptcha' | 'none';
    recaptchaVersion?: 'v2' | 'v3';
    recaptchaSiteKey?: string;
    cloudflareSiteKey?: string;
    hcaptchaSiteKey?: string;
    videoProtectionEnabled?: boolean;
    videoRotationPeriod: '1h' | '12h' | '24h' | '1w' | '1mo';
    aiProvider: 'groq' | 'openai' | 'gemini';
    oneSignalAppId?: string;
    oneSignalPromptDelay?: number;
    indexNowEnabled?: boolean;
    indexNowKey?: string;
};

export type UnlockedEpisode = {
  id: string; // This will be the episodeId
  seriesId: string;
  unlockedAt: string | Date;
};

export type UserAdWatch = {
    id: string; // YYYY-MM-DD
    count: number;
};

export type PaymentGatewaySettings = {
  id?: string;
  stripeEnabled?: boolean;
  stripePublishableKey?: string;
  stripeLogoUrl?: string;
  paypalEnabled?: boolean;
  paypalClientId?: string;
  paypalLogoUrl?: string;
  razorpayEnabled?: boolean;
  razorpayKeyId?: string;
  razorpayLogoUrl?: string;
  flutterwaveEnabled?: boolean;
  flutterwavePublicKey?: string;
  flutterwaveSecretKey?: string;
  flutterwaveLogoUrl?: string;
  googlePayEnabled?: boolean;
  googlePlayPackageName?: string;
  phonepeEnabled?: boolean;
  phonepeMerchantId?: string;
  phonepeAppId?: string;
  phonepeLogoUrl?: string;
  cashfreeEnabled?: boolean;
  cashfreeAppId?: string;
  cashfreeLogoUrl?: string;
  payuEnabled?: boolean;
  payuMerchantKey?: string;
  payuLogoUrl?: string;
};

export type GeneralSettings = {
  id?: string;
  siteName?: string;
  siteUrl?: string;
  logoUrl?: string;
  faviconUrl?: string;
  copyrightText?: string;
  appVersion?: string;
  seriesUrlFormat?: 'hash' | 'slug';
  defaultLanguageCode?: string;
  showSocialsInFooter?: boolean;
  showSiteNameNextToLogo?: boolean;
  showCopyright?: boolean;
  showVersion?: boolean;
  episodesPerPage?: number;
  socials?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
  };
  licenseKey?: string;
  codecanyonUsername?: string;
  isLicenseActive?: boolean;
  appStoreUrl?: string;
  playStoreUrl?: string;
  apiKey?: string;
  // Auth settings
  emailLoginEnabled?: boolean;
  googleLoginEnabled?: boolean;
  facebookLoginEnabled?: boolean;
  appleLoginEnabled?: boolean;
  phoneLoginEnabled?: boolean;
  signupBonus?: number;
  // Referral System
  referralEnabled?: boolean;
  referralRewardCoins?: number;
  referredBonusCoins?: number;

  // Video Player Watermark
  watermarkEnabled?: boolean;
  watermarkUrl?: string;
  watermarkPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  watermarkOpacity?: number;
  
  // Security & Mail
  mailType?: 'smtp' | 'sendmail';
  maxFailedLoginsPerIp?: number;
  maxPasswordResetsPerDay?: number;
  supportEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpEncryption?: 'none' | 'ssl' | 'tls';
  // Firebase Config
  firebaseConfigRaw?: string;
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
  firebaseMeasurementId?: string;
  firebaseServiceAccount?: string;
  // SEO Settings
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  robotsTxt?: string;
  // Performance & PWA
  gzipEnabled?: boolean;
  pwaEnabled?: boolean;
  pwaInstallDelay?: number;
  webpConversionEnabled?: boolean;
};

export type CustomPage = {
  id: string;
  title: string;
  slug: string;
  content: string;
  showInFooter: boolean;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  isRead: boolean;
  createdAt: string | Date;
};

export type SEOSettings = {
  id?: string;
  title?: string;
  description?: string;
  keywords?: string[];
  sitemapGeneration?: 'auto' | 'manual';
};

export type Favorite = {
    id: string; // This is the seriesId
    seriesId: string;
    favoritedAt: string | Date;
};

export type WatchHistory = {
    id: string; // MongoDB history document ID
    seriesId: string;
    episodeId: string;
    episodeInSeason: number;
    watchedAt: string | Date;
    progress: number;
};

export type CoinTransaction = {
    id: string;
    type: 'purchase' | 'spend';
    amount: number;
    description: string;
    createdAt: string | Date;
};

export type Purchase = {
  id: string;
  userId: string;
  userEmail: string | null;
  userName?: string;
  packId: string;
  packName: string;
  amount: number; // coin amount
  price: number; // in USD
  createdAt: string | Date;
};

export type Language = {
  id: string;
  name: string;
  languageCode: string;
  countryCode: string;
  isActive?: boolean;
};

export type UITranslations = {
  id: string; // language code e.g., 'en'
  [key: string]: string; // translation keys
};

export type StorageProvider = 'local' | 'digitalocean' | 's3' | 'gcs' | 'backblaze' | 'bunny';

export type StorageSettings = {
    id?: string;
    activeProvider: StorageProvider;
    videoUploadMaxSizeMb?: number;
    digitalocean?: {
        accessKeyId: string;
        secretAccessKey: string;
        endpoint: string;
        bucket: string;
        region: string;
    };
    s3?: {
        accessKeyId: string;
        secretAccessKey: string;
        bucket: string;
        region: string;
    };
    gcs?: {
        accessKeyId: string;
        secretAccessKey: string;
        bucket: string;
    };
    backblaze?: {
        applicationKeyId: string;
        applicationKey: string;
        bucket: string;
        endpoint: string;
    };
    bunny?: {
        storageZoneName: string;
        apiKey: string;
        region?: string;
        pullZoneUrl: string;
    };
};

export type AnalyticsData = {
    id: string;
    ip: string;
    country?: string;
    countryCode?: string;
    city?: string;
    browserName?: string;
    osName?: string;
    timestamp: string | Date;
};

export type DailyStat = {
  date: string;
  registrations: number;
  revenue: number;
};

export type TopSeriesData = {
    id: string;
    title: string;
    views: number;
    revenue: number;
};

export type AdminDashboardData = {
  totalRevenue: number;
  newUsersCount: number;
  totalUsersCount: number;
  totalSeriesCount: number;
  totalEpisodesCount: number;
  engagementRate: number;
  avgRevenuePerEpisode: number;
  topPerformingSeries: TopSeriesData[];
  dailyStats: DailyStat[];
};
