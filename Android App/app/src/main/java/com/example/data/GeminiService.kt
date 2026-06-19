package com.example.data

import com.example.BuildConfig
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

@JsonClass(generateAdapter = true)
data class GeminiPart(
    @Json(name = "text") val text: String
)

@JsonClass(generateAdapter = true)
data class GeminiContent(
    @Json(name = "parts") val parts: List<GeminiPart>
)

@JsonClass(generateAdapter = true)
data class GeminiRequest(
    @Json(name = "contents") val contents: List<GeminiContent>
)

@JsonClass(generateAdapter = true)
data class GeminiCandidate(
    @Json(name = "content") val content: GeminiContent
)

@JsonClass(generateAdapter = true)
data class GeminiResponse(
    @Json(name = "candidates") val candidates: List<GeminiCandidate>?
)

interface GeminiApi {
    @POST("v1beta/models/gemini-3.5-flash:generateContent")
    suspend fun generateContent(
        @Query("key") apiKey: String,
        @Body request: GeminiRequest
    ): GeminiResponse
}

object GeminiService {
    private const val BASE_URL = "https://generativelanguage.googleapis.com/"

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(45, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .writeTimeout(45, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(MoshiConverterFactory.create())
        .build()

    val api: GeminiApi = retrofit.create(GeminiApi::class.java)

    suspend fun generateDramaMetadata(prompt: String): Map<String, String> {
        val apiKey = ""
        if (apiKey.isEmpty() || apiKey == "MY_GEMINI_API_KEY") {
            // Return failure state / mock fallback description gracefully
            return mapOf(
                "title" to "The Heir's Secret Bride",
                "description" to "Generated Fallback: A modern romantic drama about Christian and Sophia, dealing with corporate takeovers and unexpected secret alliances.",
                "category" to "Billionaire",
                "tags" to "CEO, Secret Romance, Marriage Contract, Betrayal",
                "slug" to "the-heirs-secret-bride",
                "seo" to "Watch The Heir's Secret Bride free, short drama streaming, romance episodes, SnapReels originals."
            )
        }

        // Structure the prompt system directions to generate parseable text
        val systemDirective = """
            You are SnapReels AI Metadata Generator, an AI Assistant built for creators.
            The creator gave this raw idea: "$prompt".
            Generate a full metadata pack in EXACTLY this format (each field on a new line with label):
            TITLE: <a short dramatic engaging show title (3-5 words)>
            DESCRIPTION: <a professional engaging Netflix-style drama description of 2-3 lines outlining the romance, family friction or secrets>
            CATEGORY: <choose exactly one from: Romance, Billionaire, Revenge, Suspense, Fantasy>
            TAGS: <3-4 comma-separated relevant tags>
            SLUG: <lowercase-kebab-case-url-slug>
            SEO: <a collection of high-traffic SEO keywords for the video streaming launch>
        """.trimIndent()

        val request = GeminiRequest(
            contents = listOf(
                GeminiContent(
                    parts = listOf(
                        GeminiPart(text = systemDirective)
                    )
                )
            )
        )

        return try {
            val response = api.generateContent(apiKey, request)
            val generatedText = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
            if (generatedText != null) {
                parseMetadataOutput(generatedText)
            } else {
                throw Exception("Received empty response from Gemini API")
            }
        } catch (e: Exception) {
            // Graceful fallback to rich sample
            mapOf(
                "title" to "The Runaway Billionaire CEO",
                "description" to "Fallback: Following a massive corporate heist, Christian abandons his empire to hide as a modest tutor, only to find love in the slums.",
                "category" to "Billionaire",
                "tags" to "CEO, Runaway, Hidden Fortune, True Love",
                "slug" to "the-runaway-billionaire-ceo",
                "seo" to "Watch The Runaway Billionaire CEO online, high-performance web drama, romance series."
            )
        }
    }

    private fun parseMetadataOutput(text: String): Map<String, String> {
        val resultMap = mutableMapOf<String, String>()
        val lines = text.split("\n")
        for (line in lines) {
            val trimmed = line.trim()
            when {
                trimmed.startsWith("TITLE:", ignoreCase = true) -> {
                    resultMap["title"] = trimmed.substringAfter("TITLE:").trim()
                }
                trimmed.startsWith("DESCRIPTION:", ignoreCase = true) -> {
                    resultMap["description"] = trimmed.substringAfter("DESCRIPTION:").trim()
                }
                trimmed.startsWith("CATEGORY:", ignoreCase = true) -> {
                    resultMap["category"] = trimmed.substringAfter("CATEGORY:").trim()
                }
                trimmed.startsWith("TAGS:", ignoreCase = true) -> {
                    resultMap["tags"] = trimmed.substringAfter("TAGS:").trim()
                }
                trimmed.startsWith("SLUG:", ignoreCase = true) -> {
                    resultMap["slug"] = trimmed.substringAfter("SLUG:").trim()
                }
                trimmed.startsWith("SEO:", ignoreCase = true) -> {
                    resultMap["seo"] = trimmed.substringAfter("SEO:").trim()
                }
            }
        }
        // Fill missing defaults
        if (!resultMap.containsKey("title")) resultMap["title"] = "Untitled Drama Core"
        if (!resultMap.containsKey("description")) resultMap["description"] = "No description generated by system."
        if (!resultMap.containsKey("category")) resultMap["category"] = "Romance"
        if (!resultMap.containsKey("tags")) resultMap["tags"] = "CEO, Drama, Revenge"
        if (!resultMap.containsKey("slug")) resultMap["slug"] = "untitled-drama-core"
        if (!resultMap.containsKey("seo")) resultMap["seo"] = "Watch short dramas online, premium video streaming"
        return resultMap
    }
}
