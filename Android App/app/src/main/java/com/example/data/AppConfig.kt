package com.example.data

import android.content.Context

object AppConfig {
    // -------------------------------------------------------------------------
    // CONFIGURATION FOR CODECANYON BUYERS:
    // 1. Log into your Admin Panel -> Settings -> Mobile App
    // 2. Copy your API Base URL and API Access Key (or click Generate)
    // 3. (Optional) For Push Notifications, copy your OneSignal App ID from:
    //    Admin Panel -> Settings -> Plugins -> OneSignal App ID
    // -------------------------------------------------------------------------
    const val API_URL = "https://YOUR_DOMAIN_HERE.com/api/mobile/v1"
    const val API_KEY = "YOUR_API_KEY_HERE"
    const val ONESIGNAL_APP_ID = "YOUR_ONESIGNAL_APP_ID_HERE"
    // -------------------------------------------------------------------------

    fun init(context: Context) {
        // No-op compatibility wrapper
    }
}
