package com.example.ui.screens

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.DarkerSlate
import com.example.ui.theme.MetallicGold
import com.example.R
import androidx.compose.ui.res.stringResource

enum class CheckoutResult { NONE, SUCCESS, CANCELLED }

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun CheckoutWebViewDialog(
    url: String,
    onSuccess: (packId: String?, sessionId: String?, gateway: String?) -> Unit,
    onCancel: () -> Unit,
    onDismiss: () -> Unit
) {
    val secureCheckoutStr = stringResource(R.string.secure_checkout)
    var isLoading by remember { mutableStateOf(true) }
    var pageTitle by remember(secureCheckoutStr) { mutableStateOf(secureCheckoutStr) }
    var result by remember { mutableStateOf(CheckoutResult.NONE) }
    var progressPct by remember { mutableIntStateOf(0) }

    Dialog(
        onDismissRequest = {
            if (result == CheckoutResult.NONE) onCancel()
            onDismiss()
        },
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.6f)),
            contentAlignment = Alignment.Center
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth(0.92f)
                    .fillMaxHeight(0.85f)
                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = DarkerSlate)
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
                    when (result) {
                        CheckoutResult.SUCCESS -> {
                            // Success screen
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(20.dp),
                                    modifier = Modifier.padding(32.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(96.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFF22C55E).copy(alpha = 0.15f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.CheckCircle,
                                            contentDescription = null,
                                            tint = Color(0xFF22C55E),
                                            modifier = Modifier.size(56.dp)
                                        )
                                    }
                                    Text(
                                        text = stringResource(R.string.payment_successful_emoji),
                                        fontWeight = FontWeight.Black,
                                        color = Color.White,
                                        fontSize = 22.sp,
                                        textAlign = TextAlign.Center
                                    )
                                    Text(
                                        text = stringResource(R.string.purchase_confirmed_desc),
                                        color = Color.LightGray,
                                        fontSize = 14.sp,
                                        textAlign = TextAlign.Center
                                    )
                                    CircularProgressIndicator(
                                        color = CrimsonRed,
                                        modifier = Modifier.size(28.dp),
                                        strokeWidth = 3.dp
                                    )
                                }
                            }
                        }

                        CheckoutResult.CANCELLED -> {
                            // Cancelled screen
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(20.dp),
                                    modifier = Modifier.padding(32.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(96.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFEF4444).copy(alpha = 0.15f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Cancel,
                                            contentDescription = null,
                                            tint = Color(0xFFEF4444),
                                            modifier = Modifier.size(56.dp)
                                        )
                                    }
                                    Text(
                                        text = stringResource(R.string.payment_cancelled_title),
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFFEF4444),
                                        fontSize = 22.sp,
                                        textAlign = TextAlign.Center
                                    )
                                    Text(
                                        text = stringResource(R.string.payment_not_completed_desc),
                                        color = Color.LightGray,
                                        fontSize = 14.sp,
                                        textAlign = TextAlign.Center
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Button(
                                        onClick = onDismiss,
                                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.fillMaxWidth().height(52.dp)
                                    ) {
                                        Text(stringResource(R.string.try_again), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    }
                                }
                            }
                        }

                        CheckoutResult.NONE -> {
                            Column(modifier = Modifier.fillMaxSize()) {
                                // Top bar
                                Surface(
                                    color = Color(0xFF0D0D12),
                                    shadowElevation = 4.dp
                                ) {
                                    Column {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(horizontal = 8.dp, vertical = 8.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            IconButton(onClick = {
                                                result = CheckoutResult.CANCELLED
                                                onCancel()
                                            }) {
                                                Icon(
                                                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                                    contentDescription = stringResource(R.string.close),
                                                    tint = Color.White
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = pageTitle,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.White,
                                                    fontSize = 15.sp,
                                                    maxLines = 1
                                                )
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.Lock,
                                                        contentDescription = null,
                                                        tint = Color(0xFF22C55E),
                                                        modifier = Modifier.size(11.dp)
                                                    )
                                                    Text(
                                                        text = stringResource(R.string.secure_payment),
                                                        color = Color(0xFF22C55E),
                                                        fontSize = 11.sp,
                                                        fontWeight = FontWeight.SemiBold
                                                    )
                                                }
                                            }
                                            // Secure badge
                                            Surface(
                                                color = Color(0xFF22C55E).copy(alpha = 0.15f),
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.Security,
                                                        contentDescription = null,
                                                        tint = Color(0xFF22C55E),
                                                        modifier = Modifier.size(14.dp)
                                                    )
                                                    Text(
                                                        text = "SSL",
                                                        color = Color(0xFF22C55E),
                                                        fontSize = 11.sp,
                                                        fontWeight = FontWeight.Black
                                                    )
                                                }
                                            }
                                        }
                                        // Progress bar
                                        AnimatedVisibility(visible = isLoading, enter = fadeIn(), exit = fadeOut()) {
                                            LinearProgressIndicator(
                                                modifier = Modifier.fillMaxWidth().height(2.dp),
                                                color = CrimsonRed,
                                                trackColor = Color.Transparent
                                            )
                                        }
                                    }
                                }

                                // WebView
                                AndroidView(
                                    factory = { context ->
                                        WebView(context).apply {
                                            settings.javaScriptEnabled = true
                                            settings.domStorageEnabled = true
                                            settings.loadWithOverviewMode = true
                                            settings.useWideViewPort = true
                                            settings.builtInZoomControls = false
                                            settings.displayZoomControls = false
                                            settings.setSupportMultipleWindows(false)

                                            webViewClient = object : WebViewClient() {
                                                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                                                    super.onPageStarted(view, url, favicon)
                                                    isLoading = true
                                                }

                                                override fun onPageFinished(view: WebView?, url: String?) {
                                                    super.onPageFinished(view, url)
                                                    isLoading = false
                                                    pageTitle = view?.title?.takeIf { it.isNotBlank() } ?: secureCheckoutStr
                                                }

                                                override fun shouldOverrideUrlLoading(
                                                    view: WebView?,
                                                    request: WebResourceRequest?
                                                ): Boolean {
                                                    val loadUrl = request?.url?.toString() ?: return false

                                                    // Detect success: Stripe/PayPal redirect to /wallet?status=success
                                                    if (loadUrl.contains("status=success")) {
                                                        val uri = android.net.Uri.parse(loadUrl)
                                                        val packId = uri.getQueryParameter("pack_id")
                                                        val sessionId = uri.getQueryParameter("session_id")
                                                        val gateway = uri.getQueryParameter("gateway") ?: "stripe"
                                                        result = CheckoutResult.SUCCESS
                                                        onSuccess(packId, sessionId, gateway)
                                                        return true
                                                    }

                                                    // Detect cancel: redirect to /wallet?status=cancel
                                                    if (loadUrl.contains("status=cancel")) {
                                                        result = CheckoutResult.CANCELLED
                                                        onCancel()
                                                        return true
                                                    }

                                                    // Allow all other URLs to load inside WebView
                                                    return false
                                                }
                                            }
                                            loadUrl(url)
                                        }
                                    },
                                    modifier = Modifier
                                        .fillMaxSize()
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
