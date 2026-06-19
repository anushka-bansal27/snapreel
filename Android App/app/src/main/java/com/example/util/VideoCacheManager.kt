package com.example.util

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.CacheWriter
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

@OptIn(UnstableApi::class)
object VideoCacheManager {
    private var simpleCache: SimpleCache? = null
    private const val MAX_CACHE_SIZE = 500L * 1024L * 1024L // 500 MB capacity

    @Synchronized
    fun getCache(context: Context): SimpleCache {
        if (simpleCache == null) {
            val cacheDir = File(context.cacheDir, "snapreels_media_cache")
            val evictor = LeastRecentlyUsedCacheEvictor(MAX_CACHE_SIZE)
            val databaseProvider = StandaloneDatabaseProvider(context.applicationContext)
            simpleCache = SimpleCache(cacheDir, evictor, databaseProvider)
        }
        return simpleCache!!
    }

    fun getHttpDataSourceFactory(): DefaultHttpDataSource.Factory {
        return DefaultHttpDataSource.Factory()
            .setUserAgent("Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 SnapReels/1.1.9")
            .setConnectTimeoutMs(20_000)
            .setReadTimeoutMs(20_000)
            .setAllowCrossProtocolRedirects(true)
            .setDefaultRequestProperties(mapOf(
                "Accept" to "*/*"
            ))
    }

    fun getCacheDataSourceFactory(context: Context): CacheDataSource.Factory {
        return CacheDataSource.Factory()
            .setCache(getCache(context))
            .setUpstreamDataSourceFactory(getHttpDataSourceFactory())
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
    }

    /**
     * Pre-cache an upcoming video URL in the background to ensure instant startup (N+1 episode pre-buffering).
     */
    suspend fun preCacheVideo(context: Context, url: String) {
        withContext(Dispatchers.IO) {
            try {
                if (url.isEmpty() || url.contains("<iframe", ignoreCase = true) || 
                    url.contains("dailymotion", ignoreCase = true) ||
                    url.contains(".m3u8", ignoreCase = true) ||
                    url.contains(".mpd", ignoreCase = true)) {
                    return@withContext
                }
                val dataSource = getCacheDataSourceFactory(context).createDataSource()
                val dataSpec = DataSpec.Builder().setUri(url).build()
                val cacheWriter = CacheWriter(dataSource, dataSpec, ByteArray(128 * 1024), null)
                cacheWriter.cache()
            } catch (_: Exception) {
                // Ignore background pre-caching exceptions (e.g. network interruption or early cancellation)
            }
        }
    }
}
