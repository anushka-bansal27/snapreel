package com.example.ui.screens

import android.widget.Toast
import android.app.Activity
import com.android.billingclient.api.*
import android.content.Intent
import android.net.Uri
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.data.CoinPackModel
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.DarkerSlate
import com.example.ui.theme.MetallicGold
import com.example.viewmodel.SnapReelsViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale
import java.time.Instant
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.ui.res.stringResource
import androidx.compose.foundation.Image
import androidx.compose.ui.res.painterResource
import com.example.R
import androidx.compose.ui.layout.ContentScale
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.lazy.items
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.Dialog
import com.example.data.CoinTransaction

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TopUpScreen(navController: NavController, viewModel: SnapReelsViewModel) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    val appSettings by viewModel.appSettings.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()

    LaunchedEffect(isLoggedIn) {
        if (!isLoggedIn) {
            navController.navigate("login") {
                popUpTo("topup") { inclusive = true }
            }
        }
    }
    
    val initialTab = remember(navController) {
        navController.currentBackStackEntry?.arguments?.getString("tab") ?: "coins"
    }
    var activeTab by remember(initialTab) { mutableStateOf(initialTab) }
    
    val dbPacks = appSettings.coinPacks
    val coinPacks = remember(dbPacks) {
        val filtered = dbPacks.filter { it.type != "vip" && it.type != "membership" }
        if (filtered.isEmpty()) {
            listOf(
                CoinPackModel("1", "Basic Coin Pack", "Perfect starter pack", 100, 0.99, "coins"),
                CoinPackModel("2", "Popular Coin Pack", "Most popular choice", 250, 1.99, "coins"),
                CoinPackModel("3", "Premium Coin Pack", "Save 15% today", 600, 4.99, "coins"),
                CoinPackModel("4", "Deluxe Coin Pack", "Save 25% today", 1300, 9.99, "coins"),
                CoinPackModel("5", "Elite Coin Pack", "Ultimate savings deal", 3000, 19.99, "coins"),
                CoinPackModel("6", "Master Coin Pack", "Astronomical volume saver", 8000, 49.99, "coins")
            )
        } else {
            filtered
        }
    }

    val vipPacks = remember(dbPacks) {
        val filtered = dbPacks.filter { it.type == "vip" || it.type == "membership" }
        if (filtered.isEmpty()) {
            listOf(
                CoinPackModel("vip_weekly", "Weekly VIP Pass", "Unlock all episodes for 7 days", 7, 4.99, "vip"),
                CoinPackModel("vip_monthly", "Monthly VIP Pass", "Unlock all episodes for 30 days", 30, 14.99, "vip"),
                CoinPackModel("vip_yearly", "Yearly VIP Pass", "Ultimate value pass for 365 days", 365, 99.99, "vip")
            )
        } else {
            filtered
        }
    }

    var selectedPack by remember { mutableStateOf<CoinPackModel?>(null) }
    var showPaymentSheet by remember { mutableStateOf(false) }
    var paymentProcessingState by remember { mutableStateOf<PaymentState>(PaymentState.Idle) }
    
    var showAllTransactionsDialog by remember { mutableStateOf(false) }
    var transactionsLimit by remember { mutableIntStateOf(50) }

    LaunchedEffect(Unit) {
        viewModel.fetchTransactions(limit = 100)
    }

    LaunchedEffect(showAllTransactionsDialog, transactionsLimit) {
        if (showAllTransactionsDialog) {
            viewModel.fetchTransactions(limit = transactionsLimit)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = stringResource(R.string.topup_wallet),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.close),
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkerSlate)
            )
        },
        containerColor = DarkerSlate
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 1. Decorative Balance Card
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp),
                    shape = RoundedCornerShape(20.dp),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF141418))
                ) {
                    Box(modifier = Modifier.fillMaxWidth()) {
                        Box(
                            modifier = Modifier
                                .size(120.dp)
                                .align(Alignment.TopEnd)
                                .background(
                                    Brush.radialGradient(
                                        colors = listOf(MetallicGold.copy(alpha = 0.18f), Color.Transparent)
                                    )
                                )
                        )
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    text = stringResource(R.string.current_balance),
                                    fontSize = 13.sp,
                                    color = Color.White.copy(alpha = 0.6f),
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.MonetizationOn,
                                        contentDescription = "Coin",
                                        tint = MetallicGold,
                                        modifier = Modifier.size(32.dp)
                                    )
                                    Text(
                                        text = "${userProfile?.coinBalance ?: 0}",
                                        fontSize = 32.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White
                                    )
                                    Text(
                                        text = stringResource(R.string.coins),
                                        fontSize = 14.sp,
                                        color = MetallicGold,
                                        fontWeight = FontWeight.Black,
                                        modifier = Modifier.align(Alignment.Bottom).padding(bottom = 4.dp)
                                    )
                                }
                            }

                            Surface(
                                color = MetallicGold.copy(alpha = 0.15f),
                                border = BorderStroke(1.dp, MetallicGold.copy(alpha = 0.4f)),
                                shape = CircleShape,
                                modifier = Modifier.size(54.dp),
                                contentColor = MetallicGold
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.Star,
                                        contentDescription = null,
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                // 2. Segmented Tab Switcher
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color(0xFF141418))
                        .border(BorderStroke(0.8.dp, Color.White.copy(alpha = 0.08f)), RoundedCornerShape(16.dp))
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    listOf("coins" to stringResource(R.string.coins_pack), "vip" to stringResource(R.string.vip_membership)).forEach { (tabId, tabName) ->
                        val selected = activeTab == tabId
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (selected) CrimsonRed else Color.Transparent)
                                .clickable { activeTab = tabId }
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = tabName,
                                color = if (selected) Color.White else Color.White.copy(alpha = 0.6f),
                                fontWeight = if (selected) FontWeight.Black else FontWeight.SemiBold,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
 
                Text(
                    text = if (activeTab == "coins") stringResource(R.string.select_coin_pack) else stringResource(R.string.select_vip_pass),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )

                // 3. Grid of Packs (using nested Rows to allow scrolling parent column smoothly)
                val activePacks = if (activeTab == "coins") coinPacks else vipPacks
                activePacks.chunked(2).forEach { pair ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        pair.forEach { pack ->
                            Box(modifier = Modifier.weight(1f)) {
                                if (activeTab == "coins") {
                                    CoinPackCard(pack = pack, currencySymbol = appSettings.currencySymbol) {
                                        selectedPack = pack
                                        showPaymentSheet = true
                                    }
                                } else {
                                    VipPackCard(pack = pack, currencySymbol = appSettings.currencySymbol) {
                                        selectedPack = pack
                                        showPaymentSheet = true
                                    }
                                }
                            }
                        }
                        if (pair.size < 2) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }

                // 4. Transaction History Section
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = stringResource(R.string.transaction_history),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                    Text(
                        text = stringResource(R.string.view_all),
                        fontSize = 13.sp,
                        color = CrimsonRed,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable { showAllTransactionsDialog = true }
                    )
                }
 
                val transactionsList by viewModel.transactions.collectAsState()
                val recentTransactions = remember(transactionsList) { transactionsList.take(5) }
 
                if (recentTransactions.isEmpty()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.03f)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(stringResource(R.string.no_transactions_logged), color = Color.Gray, fontSize = 13.sp)
                        }
                    }
                } else {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.03f)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            recentTransactions.forEach { tx ->
                                TransactionRow(tx = tx)
                                Divider(color = Color.White.copy(alpha = 0.05f))
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }

            // 5. Payment Modal Dialog
            if (showPaymentSheet && selectedPack != null) {
                AlertDialog(
                    onDismissRequest = {
                        if (paymentProcessingState == PaymentState.Idle || paymentProcessingState is PaymentState.CheckoutRedirected) {
                            showPaymentSheet = false
                            selectedPack = null
                            paymentProcessingState = PaymentState.Idle
                        }
                    },
                    title = {
                        Text(
                            text = if (paymentProcessingState is PaymentState.Success) stringResource(R.string.purchase_confirmed) else stringResource(R.string.secure_checkout),
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                    },
                    text = {
                        Box(
                            modifier = Modifier.fillMaxWidth(),
                            contentAlignment = Alignment.Center
                        ) {
                            when (val state = paymentProcessingState) {
                                is PaymentState.Idle -> {
                                    Column(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalArrangement = Arrangement.spacedBy(14.dp)
                                    ) {
                                        Text(
                                            text = "You are purchasing ${selectedPack!!.name} (${selectedPack!!.amount} ${if (selectedPack!!.type == "vip" || selectedPack!!.type == "membership") stringResource(R.string.vip) else stringResource(R.string.coins)}) for ${appSettings.currencySymbol}${String.format("%.2f", selectedPack!!.price)}.",
                                            color = Color.LightGray,
                                            fontSize = 14.sp
                                        )
                                        
                                        Text(
                                            text = stringResource(R.string.choose_payment_method),
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                            fontSize = 13.sp
                                        )

                                        // Payment methods list
                                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            // Google Pay - only shown when enabled
                                            if (appSettings.phonepeEnabled) {
                                                PaymentMethodRow(
                                                    name = "PhonePe"
                                                ) {
                                                    coroutineScope.launch {
                                                        paymentProcessingState = PaymentState.Processing
                                                        val url = viewModel.createCheckoutSession(selectedPack!!.id, "phonepe")
                                                        if (url != null) {
                                                            paymentProcessingState = PaymentState.WebViewCheckout(url, selectedPack!!.id, "phonepe")
                                                        } else {
                                                            paymentProcessingState = PaymentState.Idle
                                                            Toast.makeText(context, "PhonePe checkout failed.", Toast.LENGTH_LONG).show()
                                                        }
                                                    }
                                                }
                                            }
                                            if (appSettings.cashfreeEnabled) {
                                                PaymentMethodRow(
                                                    name = "Cashfree"
                                                ) {
                                                    coroutineScope.launch {
                                                        paymentProcessingState = PaymentState.Processing
                                                        val url = viewModel.createCheckoutSession(selectedPack!!.id, "cashfree")
                                                        if (url != null) {
                                                            paymentProcessingState = PaymentState.WebViewCheckout(url, selectedPack!!.id, "cashfree")
                                                        } else {
                                                            paymentProcessingState = PaymentState.Idle
                                                            Toast.makeText(context, "Cashfree checkout failed.", Toast.LENGTH_LONG).show()
                                                        }
                                                    }
                                                }
                                            }
                                            if (appSettings.payuEnabled) {
                                                PaymentMethodRow(
                                                    name = "PayU"
                                                ) {
                                                    coroutineScope.launch {
                                                        paymentProcessingState = PaymentState.Processing
                                                        val url = viewModel.createCheckoutSession(selectedPack!!.id, "payu")
                                                        if (url != null) {
                                                            paymentProcessingState = PaymentState.WebViewCheckout(url, selectedPack!!.id, "payu")
                                                        } else {
                                                            paymentProcessingState = PaymentState.Idle
                                                            Toast.makeText(context, "PayU checkout failed.", Toast.LENGTH_LONG).show()
                                                        }
                                                    }
                                                }
                                            }
                                            if (appSettings.googlePayEnabled) {
                                                PaymentMethodRow(
                                                    name = "Google Pay",
                                                    logoResId = com.example.R.drawable.gpay_logo
                                                ) {
                                                    coroutineScope.launch {
                                                        val gProductId = selectedPack!!.googleProductId
                                                        if (gProductId.isBlank()) {
                                                            Toast.makeText(
                                                                context,
                                                                context.getString(R.string.gplay_id_not_set),
                                                                Toast.LENGTH_LONG
                                                            ).show()
                                                            return@launch
                                                        }
                                                        
                                                        paymentProcessingState = PaymentState.Processing
                                                        
                                                        val billingClient = BillingClient.newBuilder(context)
                                                            .setListener { billingResult, purchases ->
                                                                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null && purchases.isNotEmpty()) {
                                                                    val purchase = purchases[0]
                                                                    val orderId = purchase.orderId ?: purchase.purchaseToken
                                                                    viewModel.verifyGooglePlayPurchase(selectedPack!!.id, orderId) { success ->
                                                                        if (success) {
                                                                            paymentProcessingState = PaymentState.Success(selectedPack!!.amount)
                                                                        } else {
                                                                            paymentProcessingState = PaymentState.Idle
                                                                            Toast.makeText(context, "Purchase verification failed. Please contact support.", Toast.LENGTH_LONG).show()
                                                                        }
                                                                    }
                                                                } else {
                                                                    paymentProcessingState = PaymentState.Cancelled
                                                                    val msg = context.getString(R.string.gplay_purchase_failed, billingResult.debugMessage)
                                                                    Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                                                                }
                                                            }
                                                            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                                                            .build()

                                                        billingClient.startConnection(object : BillingClientStateListener {
                                                            override fun onBillingSetupFinished(billingResult: BillingResult) {
                                                                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                                                                    val productType = if (selectedPack!!.type == "vip" || selectedPack!!.type == "membership") {
                                                                        BillingClient.ProductType.SUBS
                                                                    } else {
                                                                        BillingClient.ProductType.INAPP
                                                                    }
                                                                    val productList = listOf(
                                                                        QueryProductDetailsParams.Product.newBuilder()
                                                                            .setProductId(gProductId)
                                                                            .setProductType(productType)
                                                                            .build()
                                                                    )
                                                                    val params = QueryProductDetailsParams.newBuilder()
                                                                        .setProductList(productList)
                                                                        .build()

                                                                    billingClient.queryProductDetailsAsync(params) { queryResult, queryProductDetailsResult ->
                                                                        val productDetailsList = queryProductDetailsResult.productDetailsList
                                                                        if (queryResult.responseCode == BillingClient.BillingResponseCode.OK && !productDetailsList.isNullOrEmpty()) {
                                                                            val activity = context as? Activity
                                                                            if (activity != null) {
                                                                                val productDetails = productDetailsList[0]
                                                                                val offerToken = if (productType == BillingClient.ProductType.SUBS) {
                                                                                    productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken
                                                                                } else null

                                                                                val productDetailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                                                                                    .setProductDetails(productDetails)

                                                                                if (offerToken != null) {
                                                                                    productDetailsParams.setOfferToken(offerToken)
                                                                                }

                                                                                val productDetailsParamsList = listOf(productDetailsParams.build())
                                                                                val flowParams = BillingFlowParams.newBuilder()
                                                                                    .setProductDetailsParamsList(productDetailsParamsList)
                                                                                    .build()
                                                                                val flowResult = billingClient.launchBillingFlow(activity, flowParams)
                                                                                if (flowResult.responseCode != BillingClient.BillingResponseCode.OK) {
                                                                                    paymentProcessingState = PaymentState.Idle
                                                                                    val msg = context.getString(R.string.gplay_purchase_failed, flowResult.debugMessage)
                                                                                    Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                                                                                }
                                                                            } else {
                                                                                paymentProcessingState = PaymentState.Idle
                                                                                Toast.makeText(context, context.getString(R.string.activity_context_error), Toast.LENGTH_LONG).show()
                                                                            }
                                                                        } else {
                                                                            paymentProcessingState = PaymentState.Idle
                                                                            val errorMsg = context.getString(R.string.gplay_product_id_mismatch, gProductId)
                                                                            Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
                                                                        }
                                                                    }
                                                                } else {
                                                                    paymentProcessingState = PaymentState.Idle
                                                                    Toast.makeText(context, context.getString(R.string.billing_conn_failed, billingResult.debugMessage), Toast.LENGTH_LONG).show()
                                                                }
                                                            }

                                                            override fun onBillingServiceDisconnected() {
                                                                paymentProcessingState = PaymentState.Idle
                                                            }
                                                        })
                                                    }
                                                }
                                            }

                                             if (appSettings.stripeEnabled) {
                                                PaymentMethodRow(
                                                    name = stringResource(R.string.stripe_card),
                                                    logoResId = com.example.R.drawable.stripe_logo
                                                ) {
                                                    coroutineScope.launch {
                                                        paymentProcessingState = PaymentState.Processing
                                                        val url = viewModel.createCheckoutSession(selectedPack!!.id, "stripe")
                                                        if (url != null) {
                                                            paymentProcessingState = PaymentState.WebViewCheckout(url, selectedPack!!.id, "stripe")
                                                        } else {
                                                            paymentProcessingState = PaymentState.Idle
                                                            Toast.makeText(context, "Stripe checkout failed. Please verify keys in admin.", Toast.LENGTH_LONG).show()
                                                        }
                                                    }
                                                }
                                            }

                                             if (appSettings.paypalEnabled) {
                                                PaymentMethodRow(
                                                    name = stringResource(R.string.paypal_checkout),
                                                    logoResId = com.example.R.drawable.paypal_logo
                                                ) {
                                                    coroutineScope.launch {
                                                        paymentProcessingState = PaymentState.Processing
                                                        val url = viewModel.createCheckoutSession(selectedPack!!.id, "paypal")
                                                        if (url != null) {
                                                            paymentProcessingState = PaymentState.WebViewCheckout(url, selectedPack!!.id, "paypal")
                                                        } else {
                                                            paymentProcessingState = PaymentState.Idle
                                                            Toast.makeText(context, "PayPal checkout failed. Please verify keys in admin.", Toast.LENGTH_LONG).show()
                                                        }
                                                    }
                                                }
                                            }

                                             if (appSettings.razorpayEnabled) {
                                                PaymentMethodRow(
                                                    name = stringResource(R.string.razorpay_checkout),
                                                    logoResId = com.example.R.drawable.razorpay_logo
                                                ) {
                                                    coroutineScope.launch {
                                                        paymentProcessingState = PaymentState.Processing
                                                        val url = viewModel.createCheckoutSession(selectedPack!!.id, "razorpay")
                                                        if (url != null) {
                                                            paymentProcessingState = PaymentState.WebViewCheckout(url, selectedPack!!.id, "razorpay")
                                                        } else {
                                                            paymentProcessingState = PaymentState.Idle
                                                            Toast.makeText(context, "Razorpay checkout failed. Please verify keys in admin.", Toast.LENGTH_LONG).show()
                                                        }
                                                    }
                                                }
                                            }

                                             if (appSettings.flutterwaveEnabled) {
                                                PaymentMethodRow(
                                                    name = stringResource(R.string.flutterwave_checkout),
                                                    logoResId = com.example.R.drawable.flutterwave_logo
                                                ) {
                                                    coroutineScope.launch {
                                                        paymentProcessingState = PaymentState.Processing
                                                        val url = viewModel.createCheckoutSession(selectedPack!!.id, "flutterwave")
                                                        if (url != null) {
                                                            paymentProcessingState = PaymentState.WebViewCheckout(url, selectedPack!!.id, "flutterwave")
                                                        } else {
                                                            paymentProcessingState = PaymentState.Idle
                                                            Toast.makeText(context, "Flutterwave checkout failed. Please verify keys in admin.", Toast.LENGTH_LONG).show()
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                is PaymentState.Processing -> {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(14.dp),
                                        modifier = Modifier.padding(vertical = 20.dp)
                                    ) {
                                        CircularProgressIndicator(color = CrimsonRed, modifier = Modifier.size(44.dp))
                                        Text(
                                            text = stringResource(R.string.connecting_payment_gateway),
                                            color = Color.LightGray,
                                            fontSize = 13.sp,
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }
                                is PaymentState.Success -> {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(16.dp),
                                        modifier = Modifier.padding(vertical = 10.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.CheckCircle,
                                            contentDescription = "Success",
                                            tint = Color.Green,
                                            modifier = Modifier.size(64.dp)
                                        )
                                        Text(
                                            text = stringResource(R.string.transaction_completed_success),
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                            fontSize = 16.sp,
                                            textAlign = TextAlign.Center
                                        )
                                        val isVipPack = selectedPack?.type == "vip" || selectedPack?.type == "membership"
                                        val awardLabel = if (isVipPack) stringResource(R.string.vip_membership) else stringResource(R.string.coins)
                                        Text(
                                            text = stringResource(R.string.awarded_balance_msg, state.awardedCoins, awardLabel),
                                            color = Color.LightGray,
                                            fontSize = 13.sp,
                                            textAlign = TextAlign.Center
                                        )
                                        Button(
                                            onClick = {
                                                showPaymentSheet = false
                                                paymentProcessingState = PaymentState.Idle
                                                selectedPack = null
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.fillMaxWidth().height(48.dp)
                                        ) {
                                            Text(stringResource(R.string.awesome), fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                                is PaymentState.CheckoutRedirected -> {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(16.dp),
                                        modifier = Modifier.padding(vertical = 10.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Payment,
                                            contentDescription = "Redirected",
                                            tint = MetallicGold,
                                            modifier = Modifier.size(64.dp)
                                        )
                                        Text(
                                            text = stringResource(R.string.payment_window_opened),
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                            fontSize = 16.sp,
                                            textAlign = TextAlign.Center
                                        )
                                        Text(
                                            text = stringResource(R.string.complete_payment_browser_msg),
                                            color = Color.LightGray,
                                            fontSize = 13.sp,
                                            textAlign = TextAlign.Center
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Button(
                                            onClick = {
                                                runCatching {
                                                     val intent = Intent(Intent.ACTION_VIEW, Uri.parse(state.url))
                                                     context.startActivity(intent)
                                                }
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray),
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.fillMaxWidth().height(48.dp)
                                        ) {
                                            Text(stringResource(R.string.reopen_payment_page), color = Color.White, fontWeight = FontWeight.Bold)
                                        }
                                        
                                        Button(
                                            onClick = {
                                                coroutineScope.launch {
                                                    viewModel.syncLibrary()
                                                    showPaymentSheet = false
                                                    paymentProcessingState = PaymentState.Idle
                                                    selectedPack = null
                                                }
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.fillMaxWidth().height(48.dp)
                                        ) {
                                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(stringResource(R.string.i_paid_refresh), fontWeight = FontWeight.Bold)
                                        }

                                        Button(
                                            onClick = {
                                                paymentProcessingState = PaymentState.Cancelled
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF101014)),
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.fillMaxWidth().height(48.dp)
                                        ) {
                                            Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(18.dp))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(stringResource(R.string.i_cancelled_go_back), fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                                is PaymentState.Cancelled -> {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(16.dp),
                                        modifier = Modifier.padding(vertical = 10.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(72.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFFEF4444).copy(alpha = 0.15f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Close,
                                                contentDescription = "Cancelled",
                                                tint = Color(0xFFEF4444),
                                                modifier = Modifier.size(40.dp)
                                            )
                                        }
                                        Text(
                                            text = stringResource(R.string.payment_cancelled_title),
                                            fontWeight = FontWeight.Black,
                                            color = Color(0xFFEF4444),
                                            fontSize = 17.sp,
                                            textAlign = TextAlign.Center
                                        )
                                        Text(
                                            text = stringResource(R.string.payment_cancelled_desc),
                                            color = Color.LightGray,
                                            fontSize = 13.sp,
                                            textAlign = TextAlign.Center
                                        )
                                        Button(
                                            onClick = {
                                                paymentProcessingState = PaymentState.Idle
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.fillMaxWidth().height(48.dp)
                                        ) {
                                            Text(stringResource(R.string.try_again), fontWeight = FontWeight.Bold)
                                        }
                                        TextButton(onClick = {
                                            showPaymentSheet = false
                                            paymentProcessingState = PaymentState.Idle
                                            selectedPack = null
                                        }) {
                                            Text(stringResource(R.string.close), color = Color.Gray)
                                        }
                                    }
                                }
                                is PaymentState.WebViewCheckout -> { /* handled as full-screen overlay */ }
                            }
                        }
                    },
                    confirmButton = {},
                    dismissButton = {
                        if (paymentProcessingState == PaymentState.Idle) {
                            TextButton(onClick = {
                                showPaymentSheet = false
                                selectedPack = null
                                paymentProcessingState = PaymentState.Idle
                            }) {
                                Text(stringResource(R.string.cancel), color = Color.White)
                            }
                        }
                    },
                    containerColor = DarkerSlate,
                    titleContentColor = Color.White,
                    textContentColor = Color.White
                )
            }

            // 6. View All Transactions Dialog Modal
            if (showAllTransactionsDialog) {
                val txs by viewModel.transactions.collectAsState()
                Dialog(
                    onDismissRequest = { showAllTransactionsDialog = false },
                    properties = DialogProperties(usePlatformDefaultWidth = false)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.75f))
                            .clickable { showAllTransactionsDialog = false },
                        contentAlignment = Alignment.BottomCenter
                    ) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF101014)),
                            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .fillMaxHeight(0.8f)
                                .clickable(enabled = false) {}
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(20.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "All Transactions",
                                        color = Color.White,
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                    IconButton(onClick = { showAllTransactionsDialog = false }) {
                                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                                    }
                                }

                                // Limit filter row: 10/20/50/100/500
                                Row(
                                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Show:", color = Color.Gray, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    listOf(10, 20, 50, 100, 500).forEach { limit ->
                                        val selected = transactionsLimit == limit
                                        Surface(
                                            onClick = { transactionsLimit = limit },
                                            color = if (selected) CrimsonRed else Color(0xFF24242A),
                                            shape = RoundedCornerShape(8.dp),
                                            border = if (selected) null else androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF3B3B42))
                                        ) {
                                            Text(
                                                text = limit.toString(),
                                                color = Color.White,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                            )
                                        }
                                    }
                                }

                                Divider(color = Color.DarkGray)

                                // Scrollable list
                                if (txs.isEmpty()) {
                                    Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                                        Text("No transactions logged yet.", color = Color.Gray, fontSize = 14.sp)
                                    }
                                } else {
                                    androidx.compose.foundation.lazy.LazyColumn(
                                        modifier = Modifier.weight(1f).fillMaxWidth(),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        items(txs) { tx ->
                                            TransactionRow(tx = tx)
                                            Divider(color = Color.White.copy(alpha = 0.05f))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            TopUpScreenWebViewOverlay(
                state = paymentProcessingState,
                onStateChange = { paymentProcessingState = it },
                viewModel = viewModel,
                selectedPack = selectedPack,
                coroutineScope = coroutineScope,
                onClose = {
                    showPaymentSheet = false
                    selectedPack = null
                }
            )
        }
    }
}

// ---- In-App WebView Checkout Overlay ----
@Composable
fun TopUpScreenWebViewOverlay(
    state: PaymentState,
    onStateChange: (PaymentState) -> Unit,
    viewModel: com.example.viewmodel.SnapReelsViewModel,
    selectedPack: com.example.data.CoinPackModel?,
    coroutineScope: kotlinx.coroutines.CoroutineScope,
    onClose: () -> Unit
) {
    if (state is PaymentState.WebViewCheckout) {
        CheckoutWebViewDialog(
            url = state.url,
            onSuccess = { packId, sessionId, gateway ->
                coroutineScope.launch {
                    val pid = packId ?: state.packId
                    val sid = sessionId ?: "WEB_DIRECT"
                    val gw = gateway ?: state.gateway
                    onStateChange(PaymentState.Processing)
                    viewModel.verifyAndAwardPurchase(pid, gw, sid)
                    onStateChange(PaymentState.Success(selectedPack?.amount ?: 0))
                }
            },
            onCancel = { onStateChange(PaymentState.Cancelled) },
            onDismiss = {
                if (state is PaymentState.WebViewCheckout) {
                    onStateChange(PaymentState.Idle)
                    onClose()
                }
            }
        )
    }
}

@Composable
fun CoinPackCard(pack: CoinPackModel, currencySymbol: String = "$", onClick: () -> Unit) {
    val isPopular = pack.amount in 250..600
    val isBestValue = pack.amount >= 3000

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(
            1.dp,
            if (isPopular || isBestValue) CrimsonRed.copy(alpha = 0.6f) else Color.White.copy(alpha = 0.10f)
        ),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF141418))
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            if (isPopular || isBestValue) {
                Surface(
                    color = if (isBestValue) MetallicGold else CrimsonRed,
                    shape = RoundedCornerShape(bottomStart = 8.dp, topEnd = 16.dp),
                    modifier = Modifier.align(Alignment.TopEnd)
                ) {
                    Text(
                        text = if (isBestValue) "BEST VALUE" else "POPULAR",
                        color = if (isBestValue) Color.Black else Color.White,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .clip(CircleShape)
                        .background(MetallicGold.copy(alpha = 0.12f))
                        .border(BorderStroke(1.dp, MetallicGold.copy(alpha = 0.25f)), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.MonetizationOn,
                        contentDescription = null,
                        tint = MetallicGold,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Text(
                    text = "${pack.amount}",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )

                Text(
                    text = pack.name,
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.8f),
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )

                Text(
                    text = pack.description,
                    fontSize = 10.sp,
                    color = Color.Gray,
                    maxLines = 1,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(4.dp))

                Surface(
                    color = CrimsonRed,
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "${currencySymbol}${String.format("%.2f", pack.price)}",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun VipPackCard(pack: CoinPackModel, currencySymbol: String = "$", onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.2.dp, Brush.linearGradient(listOf(MetallicGold, Color(0xFFFF8F00)))),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF15130C))
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Surface(
                color = MetallicGold,
                shape = RoundedCornerShape(bottomStart = 8.dp, topEnd = 16.dp),
                modifier = Modifier.align(Alignment.TopEnd)
            ) {
                Text(
                    text = "VIP PASS",
                    color = Color.Black,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .clip(CircleShape)
                        .background(MetallicGold.copy(alpha = 0.16f))
                        .border(BorderStroke(1.dp, MetallicGold.copy(alpha = 0.4f)), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.WorkspacePremium,
                        contentDescription = null,
                        tint = MetallicGold,
                        modifier = Modifier.size(30.dp)
                    )
                }

                Text(
                    text = pack.name,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )

                Text(
                    text = "✨ ${pack.amount} Days VIP",
                    fontSize = 12.sp,
                    color = MetallicGold,
                    fontWeight = FontWeight.ExtraBold,
                    textAlign = TextAlign.Center
                )

                Text(
                    text = pack.description,
                    fontSize = 10.sp,
                    color = Color.White.copy(alpha = 0.7f),
                    maxLines = 1,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(4.dp))

                Surface(
                    color = MetallicGold,
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "${currencySymbol}${String.format("%.2f", pack.price)}",
                        color = Color.Black,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun PaymentMethodRow(
    name: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    color: Color = Color.White,
    logoResId: Int? = null,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        color = Color.White.copy(alpha = 0.05f),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (logoResId != null) {
                Image(
                    painter = painterResource(id = logoResId),
                    contentDescription = name,
                    modifier = Modifier.size(36.dp),
                    contentScale = ContentScale.Fit
                )
            } else if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(modifier = Modifier.width(14.dp))
            Text(
                text = name,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.weight(1f)
            )
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = Color.Gray,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

@Composable
fun TransactionRow(tx: CoinTransaction) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = tx.description,
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = formatTransactionDate(tx.createdAt),
                color = Color.Gray,
                fontSize = 11.sp
            )
        }
        
        val isDeduction = tx.amount < 0
        val amountText = if (tx.amount > 0) "+${tx.amount}" else if (tx.amount == 0) "Active" else "${tx.amount}"
        val amountColor = if (isDeduction) CrimsonRed else if (tx.amount == 0) MetallicGold else Color.Green
        
        Text(
            text = amountText,
            color = amountColor,
            fontSize = 15.sp,
            fontWeight = FontWeight.Black
        )
    }
}

fun formatTransactionDate(isoString: String): String {
    return try {
        val date = if (isoString.contains("-")) {
            val cleanIso = isoString.replace("Z", "+00:00")
            Instant.parse(cleanIso).let { java.util.Date.from(it) }
        } else {
            java.util.Date(isoString.toLong())
        }
        SimpleDateFormat("MMM dd, yyyy h:mm a", Locale.US).format(date)
    } catch (e: Exception) {
        isoString
    }
}

sealed class PaymentState {
    object Idle : PaymentState()
    object Processing : PaymentState()
    object Cancelled : PaymentState()
    data class Success(val awardedCoins: Int) : PaymentState()
    data class CheckoutRedirected(val url: String) : PaymentState()
    data class WebViewCheckout(val url: String, val packId: String, val gateway: String) : PaymentState()
}
