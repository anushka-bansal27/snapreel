package com.example.util

import com.example.data.Drama

object CategoryTranslator {
    // English -> Arabic mapping
    private val enToAr = mapOf(
        "Drama" to "دراما",
        "Romance" to "رومانسية",
        "Action" to "أكشن",
        "CEO" to "المدير التنفيذي",
        "Revenge" to "انتقام",
        "Billionaire" to "ملياردار",
        "Werewolf" to "مستذئب",
        "Urban" to "حضري",
        "Fantasy" to "خيالي",
        "Suspense" to "تشويق",
        "Comedy" to "كوميديا",
        "Youth" to "شباب",
        "Historical" to "تاريخي",
        "Family" to "عائلي",
        "Costume" to "أزياء تقليدية",
        "Modern" to "عصري",
        "Love" to "حب",
        "Thriller" to "إثارة",
        "Mystery" to "غموض",
        "Sci-Fi" to "خيال علمي",
        "Horror" to "رعب",
        "Adventure" to "مغامرة"
    )

    // Arabic -> English mapping
    private val arToEn = mapOf(
        "دراما" to "Drama",
        "رومانسية" to "Romance",
        "أكشن" to "Action",
        "اكشن" to "Action",
        "المدير التنفيذي" to "CEO",
        "رؤساء" to "CEO",
        "انتقام" to "Revenge",
        "ملياردار" to "Billionaire",
        "مستذئب" to "Werewolf",
        "حضري" to "Urban",
        "خيالي" to "Fantasy",
        "تشويق" to "Suspense",
        "كوميديا" to "Comedy",
        "شباب" to "Youth",
        "تاريخي" to "Historical",
        "عائلي" to "Family",
        "أزياء تقليدية" to "Costume",
        "ازياء تقليدية" to "Costume",
        "عصري" to "Modern",
        "حب" to "Love",
        "إثارة" to "Thriller",
        "اثارة" to "Thriller",
        "غموض" to "Mystery",
        "خيال علمي" to "Sci-Fi",
        "رعب" to "Horror",
        "مغامرة" to "Adventure"
    )

    // Chinese mapping (English -> Simplified Chinese)
    private val enToZh = mapOf(
        "Drama" to "剧情",
        "Romance" to "爱情",
        "Action" to "动作",
        "CEO" to "霸总",
        "Revenge" to "复仇",
        "Billionaire" to "豪门",
        "Werewolf" to "狼人",
        "Urban" to "都市",
        "Fantasy" to "奇幻",
        "Suspense" to "悬疑",
        "Comedy" to "喜剧",
        "Youth" to "青春",
        "Historical" to "古装",
        "Family" to "家庭",
        "Costume" to "古装",
        "Modern" to "现代",
        "Love" to "甜宠",
        "Thriller" to "惊悚",
        "Mystery" to "悬疑",
        "Sci-Fi" to "科幻",
        "Horror" to "恐怖",
        "Adventure" to "冒险"
    )

    // Hindi mapping (English -> Hindi)
    private val enToHi = mapOf(
        "Drama" to "ड्रामा",
        "Romance" to "रोमांस",
        "Action" to "एक्शन",
        "CEO" to "सीईओ",
        "Revenge" to "बदला",
        "Billionaire" to "अरबपति",
        "Werewolf" to "वेयरवोल्फ",
        "Urban" to "शहरी",
        "Fantasy" to "काल्पनिक",
        "Suspense" to "सस्पेंस",
        "Comedy" to "कॉमेडी",
        "Youth" to "युवा",
        "Historical" to "ऐतिहासिक",
        "Family" to "पारिवारिक",
        "Costume" to "पारंपरिक",
        "Modern" to "आधुनिक",
        "Love" to "प्रेम",
        "Thriller" to "थ्रिलर",
        "Mystery" to "रहस्य",
        "Sci-Fi" to "साइंस-फिक्शन",
        "Horror" to "हॉरर",
        "Adventure" to "साहसिक"
    )

    /**
     * Translates category to target language (Arabic if isArabic is true, otherwise English).
     */
    fun localize(category: String, isArabic: Boolean): String {
        return localizeForLang(category, if (isArabic) "ar" else "en")
    }

    /**
     * Translates category to any target language code (e.g., 'ar', 'zh', 'hi', 'en').
     */
    fun localizeForLang(category: String, langCode: String): String {
        val trimmed = category.trim()
        if (trimmed.isBlank()) return trimmed

        // First normalize to English
        val englishKey = if (enToAr.containsKey(trimmed)) trimmed
        else arToEn[trimmed]
            ?: enToZh.entries.firstOrNull { it.value == trimmed }?.key
            ?: enToHi.entries.firstOrNull { it.value == trimmed }?.key
            ?: enToAr.keys.firstOrNull { it.equals(trimmed, ignoreCase = true) }
            ?: trimmed

        return when {
            langCode.startsWith("ar", ignoreCase = true) -> {
                enToAr.entries.firstOrNull { it.key.equals(englishKey, ignoreCase = true) }?.value ?: trimmed
            }
            langCode.startsWith("zh", ignoreCase = true) -> {
                enToZh.entries.firstOrNull { it.key.equals(englishKey, ignoreCase = true) }?.value ?: englishKey
            }
            langCode.startsWith("hi", ignoreCase = true) -> {
                enToHi.entries.firstOrNull { it.key.equals(englishKey, ignoreCase = true) }?.value ?: englishKey
            }
            else -> englishKey
        }
    }

    /**
     * Checks if a drama matches a selected filter category, taking cross-language equivalents into account.
     */
    fun isMatch(dramaCategory: String, dramaGenres: List<String>, filterCategory: String): Boolean {
        if (filterCategory.equals("All", ignoreCase = true) || filterCategory.isBlank()) return true
        
        val targets = mutableSetOf<String>()
        val cleanFilter = filterCategory.trim().lowercase()
        targets.add(cleanFilter)
        
        arToEn[filterCategory.trim()]?.let { targets.add(it.lowercase().trim()) }
        enToAr.entries.firstOrNull { it.key.equals(filterCategory.trim(), ignoreCase = true) }?.let {
            targets.add(it.value.lowercase().trim())
        }
        enToZh.entries.firstOrNull { it.key.equals(filterCategory.trim(), ignoreCase = true) }?.let {
            targets.add(it.value.lowercase().trim())
        }
        enToHi.entries.firstOrNull { it.key.equals(filterCategory.trim(), ignoreCase = true) }?.let {
            targets.add(it.value.lowercase().trim())
        }

        val dramaCandidates = (listOf(dramaCategory) + dramaGenres).map { it.trim().lowercase() }
        for (candidate in dramaCandidates) {
            if (candidate in targets) return true
            arToEn[candidate]?.let { if (it.lowercase() in targets) return true }
            enToAr.entries.firstOrNull { it.key.equals(candidate, ignoreCase = true) }?.let {
                if (it.value.lowercase() in targets) return true
            }
            enToZh.entries.firstOrNull { it.key.equals(candidate, ignoreCase = true) }?.let {
                if (it.value.lowercase() in targets) return true
            }
            enToHi.entries.firstOrNull { it.key.equals(candidate, ignoreCase = true) }?.let {
                if (it.value.lowercase() in targets) return true
            }
        }
        return false
    }

    /**
     * Convenience method to check if a drama matches a category
     */
    fun isDramaInCategory(drama: Drama, filterCategory: String): Boolean {
        return isMatch(drama.category, drama.genres, filterCategory)
    }

    /**
     * Checks if the app is currently in Arabic mode.
     */
    fun isAppArabic(context: android.content.Context): Boolean {
        return getAppLanguage(context).startsWith("ar", ignoreCase = true)
    }

    /**
     * Returns the current app language code ('en', 'ar', 'zh', 'hi', etc.).
     */
    fun getAppLanguage(context: android.content.Context): String {
        return try {
            val prefs = context.getSharedPreferences("snapreels_settings", android.content.Context.MODE_PRIVATE)
            prefs.getString("language_code", java.util.Locale.getDefault().language) ?: "en"
        } catch (e: Exception) {
            java.util.Locale.getDefault().language ?: "en"
        }
    }
}
