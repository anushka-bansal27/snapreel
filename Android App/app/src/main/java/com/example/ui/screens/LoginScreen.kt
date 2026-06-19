package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.example.R
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.DarkerSlate
import com.example.ui.theme.MetallicGold
import com.example.viewmodel.SnapReelsViewModel
import androidx.compose.ui.res.stringResource
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import androidx.activity.compose.BackHandler
import android.app.Activity
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.FirebaseException
import com.google.firebase.auth.PhoneAuthCredential
import java.util.concurrent.TimeUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(navController: NavController, viewModel: SnapReelsViewModel) {
    val context = LocalContext.current
    val authError by viewModel.authError.collectAsState()
    val appSettings by viewModel.appSettings.collectAsState()
    var isLoading by remember { mutableStateOf(false) }

    var lastBackPressTime by remember { mutableLongStateOf(0L) }

    BackHandler {
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastBackPressTime < 2000) {
            val activity = context as? Activity
            activity?.finish()
        } else {
            lastBackPressTime = currentTime
            Toast.makeText(context, "Press back again to exit", Toast.LENGTH_SHORT).show()
        }
    }

    val gso = remember {
        GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(context.getString(R.string.default_web_client_id))
            .requestEmail()
            .build()
    }
    val googleSignInClient = remember { GoogleSignIn.getClient(context, gso) }

    val googleSignInLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)!!
            val idToken = account.idToken
            if (idToken != null) {
                isLoading = true
                viewModel.signInWithGoogle(idToken, account.email ?: "") { success ->
                    isLoading = false
                    if (success) {
                        navController.navigate("home") {
                            popUpTo("login") { inclusive = true }
                        }
                    }
                }
            } else {
                Toast.makeText(context, "Google Sign-In failed: Token is null", Toast.LENGTH_SHORT).show()
            }
        } catch (e: ApiException) {
            Toast.makeText(context, "Google Sign-In failed: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
        }
    }

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var showEmailForm by remember { mutableStateOf(false) }
    var isSignUpMode by remember { mutableStateOf(false) }
    var viewMode by remember { mutableStateOf("options") } // options, email, phone, otp, forgot
    var phoneNumber by remember { mutableStateOf("") }
    var otpCode by remember { mutableStateOf("") }
    var verificationId by remember { mutableStateOf("") }
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { visible = true }

    LaunchedEffect(authError) {
        authError?.let { Toast.makeText(context, it, Toast.LENGTH_LONG).show() }
    }

    fun openLegalLink(url: String) {
        if (url.isBlank()) {
            Toast.makeText(context, "Link is not configured yet.", Toast.LENGTH_SHORT).show()
            return
        }
        runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }.onFailure {
            Toast.makeText(context, "Could not open link.", Toast.LENGTH_SHORT).show()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Cinematic backdrop (local bundled asset for zero-latency load)
        Image(
            painter = painterResource(id = R.drawable.bg_login),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        // Multi-layer gradient overlay
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.4f),
                            Color.Black.copy(alpha = 0.65f),
                            DarkerSlate.copy(alpha = 0.98f)
                        )
                    )
                )
        )

        // Content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(60.dp))

            // Logo + Brand
            AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically { -60 }) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Image(
                        painter = painterResource(id = R.drawable.app_logo),
                        contentDescription = "Logo",
                        modifier = Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(20.dp))
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = "SnapReels",
                        fontSize = 34.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = stringResource(R.string.short_dramas_streaming),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MetallicGold,
                        letterSpacing = 4.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(40.dp))

            AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically { 80 }) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {

                    // ── Social Login Buttons (dynamic from admin) ──────────
                    if (appSettings.googleLoginEnabled) {
                        SocialLoginButton(
                            text = stringResource(R.string.google_sign_in),
                            iconRes = R.drawable.ic_google,
                            backgroundColor = Color.White,
                            textColor = Color(0xFF1A1A1A),
                            onClick = {
                                val signInIntent = googleSignInClient.signInIntent
                                googleSignInLauncher.launch(signInIntent)
                            }
                        )
                    }
 
                    if (appSettings.facebookLoginEnabled) {
                        SocialLoginButton(
                            text = stringResource(R.string.facebook_sign_in),
                            iconRes = R.drawable.ic_facebook,
                            backgroundColor = Color(0xFF1877F2),
                            textColor = Color.White,
                            onClick = {
                                Toast.makeText(context, "Facebook Login — Firebase integration required", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
 
                    if (appSettings.appleLoginEnabled) {
                        SocialLoginButton(
                            text = stringResource(R.string.apple_sign_in),
                            iconRes = R.drawable.ic_apple,
                            backgroundColor = Color(0xFF1A1A1A),
                            textColor = Color.White,
                            onClick = {
                                Toast.makeText(context, "Apple Login — Firebase integration required", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }

                    if (appSettings.phoneLoginEnabled) {
                        SocialLoginButton(
                            text = stringResource(R.string.continue_phone),
                            iconRes = null,
                            iconColor = Color.White,
                            iconVector = Icons.Default.Phone,
                            backgroundColor = Color.White.copy(alpha = 0.1f),
                            textColor = Color.White,
                            onClick = { viewMode = "phone" }
                        )
                    }
 
                    // ── Divider ──────────────────────────────────────────
                    val hasSocial = appSettings.googleLoginEnabled ||
                            appSettings.facebookLoginEnabled ||
                            appSettings.appleLoginEnabled
                    if (hasSocial && appSettings.emailLoginEnabled) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            HorizontalDivider(modifier = Modifier.weight(1f), color = Color.White.copy(alpha = 0.15f))
                            Text(stringResource(R.string.or), fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                            HorizontalDivider(modifier = Modifier.weight(1f), color = Color.White.copy(alpha = 0.15f))
                        }
                    }

                    // ── Email/Password Login ──────────────────────────────
                    if (appSettings.emailLoginEnabled) {
                        if (viewMode == "options") {
                            SocialLoginButton(
                                text = stringResource(R.string.continue_email),
                                iconRes = null,
                                iconColor = Color.White,
                                iconVector = Icons.Default.Email,
                                backgroundColor = Color.White.copy(alpha = 0.1f),
                                textColor = Color.White,
                                onClick = { viewMode = "email" }
                            )
                        } else if (viewMode == "email") {
                            // Email + Password fields
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                if (isSignUpMode) {
                                    OutlinedTextField(
                                        value = username,
                                        onValueChange = { username = it },
                                        placeholder = { Text(stringResource(R.string.name_placeholder), color = Color.Gray) },
                                        leadingIcon = {
                                            Icon(Icons.Default.Person, null, tint = CrimsonRed, modifier = Modifier.size(18.dp))
                                        },
                                        singleLine = true,
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = CrimsonRed,
                                            unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                                            focusedTextColor = Color.White,
                                            unfocusedTextColor = Color.White,
                                            cursorColor = CrimsonRed
                                        ),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier.fillMaxWidth().testTag("name_input")
                                    )
                                }
 
                                OutlinedTextField(
                                    value = email,
                                    onValueChange = { email = it },
                                    placeholder = { Text(stringResource(R.string.email_placeholder), color = Color.Gray) },
                                    leadingIcon = {
                                        Icon(Icons.Default.Email, null, tint = CrimsonRed, modifier = Modifier.size(18.dp))
                                    },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = CrimsonRed,
                                        unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        cursorColor = CrimsonRed
                                    ),
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier.fillMaxWidth().testTag("username_input")
                                )
 
                                OutlinedTextField(
                                    value = password,
                                    onValueChange = { password = it },
                                    placeholder = { Text(stringResource(R.string.password_placeholder), color = Color.Gray) },
                                    leadingIcon = {
                                        Icon(Icons.Default.Lock, null, tint = CrimsonRed, modifier = Modifier.size(18.dp))
                                    },
                                    trailingIcon = {
                                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                            Icon(
                                                imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                                contentDescription = null,
                                                tint = Color.Gray,
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                    },
                                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = CrimsonRed,
                                        unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        cursorColor = CrimsonRed
                                    ),
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier.fillMaxWidth().testTag("password_input")
                                )

                                Spacer(modifier = Modifier.height(4.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    // Sign In Button
                                    Button(
                                        onClick = {
                                            if (!isSignUpMode) {
                                                if (email.isBlank() || password.isBlank()) {
                                                    Toast.makeText(context, context.getString(R.string.err_email_password_required), Toast.LENGTH_SHORT).show()
                                                } else {
                                                    isLoading = true
                                                    viewModel.loginWithEmail(email, password) { success ->
                                                        isLoading = false
                                                        if (success) {
                                                            navController.navigate("home") {
                                                                popUpTo("login") { inclusive = true }
                                                            }
                                                        }
                                                    }
                                                }
                                            } else {
                                                isSignUpMode = false
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (!isSignUpMode) CrimsonRed else Color.White.copy(alpha = 0.1f)
                                        ),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(52.dp)
                                            .testTag("login_button")
                                    ) {
                                        Text(stringResource(R.string.login), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                    }
 
                                    // Sign Up Button
                                    Button(
                                        onClick = {
                                            if (isSignUpMode) {
                                                if (username.isBlank() || email.isBlank() || password.isBlank()) {
                                                    Toast.makeText(context, context.getString(R.string.err_all_fields_required), Toast.LENGTH_SHORT).show()
                                                } else if (password.length < 6) {
                                                    Toast.makeText(context, context.getString(R.string.err_password_length), Toast.LENGTH_SHORT).show()
                                                } else {
                                                    isLoading = true
                                                    viewModel.registerWithEmail(email, password, username) { success ->
                                                        isLoading = false
                                                        if (success) {
                                                            navController.navigate("home") {
                                                                popUpTo("login") { inclusive = true }
                                                            }
                                                        }
                                                    }
                                                }
                                            } else {
                                                isSignUpMode = true
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (isSignUpMode) CrimsonRed else Color.White.copy(alpha = 0.1f)
                                        ),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(52.dp)
                                            .testTag("signup_button")
                                    ) {
                                        Text(stringResource(R.string.signup), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                    }
                                }
 
                                TextButton(
                                    onClick = { viewMode = "forgot" },
                                    modifier = Modifier.align(Alignment.CenterHorizontally)
                                ) {
                                    Text(stringResource(R.string.forgot_password), color = CrimsonRed, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                }
                                TextButton(
                                    onClick = {
                                        viewMode = "options"
                                        isSignUpMode = false
                                    },
                                    modifier = Modifier.align(Alignment.CenterHorizontally)
                                ) {
                                    Text(stringResource(R.string.back_to_options), color = Color.Gray, fontSize = 12.sp)
                                }
                            }
                        } else if (viewMode == "phone") {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                OutlinedTextField(
                                    value = phoneNumber,
                                    onValueChange = { phoneNumber = it },
                                    placeholder = { Text(stringResource(R.string.phone_placeholder), color = Color.Gray) },
                                    leadingIcon = {
                                        Icon(Icons.Default.Phone, null, tint = CrimsonRed, modifier = Modifier.size(18.dp))
                                    },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = CrimsonRed,
                                        unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        cursorColor = CrimsonRed
                                    ),
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Button(
                                    onClick = {
                                        if (phoneNumber.isBlank()) return@Button
                                        isLoading = true
                                        val options = PhoneAuthOptions.newBuilder(FirebaseAuth.getInstance())
                                            .setPhoneNumber(phoneNumber)
                                            .setTimeout(60L, TimeUnit.SECONDS)
                                            .setActivity(context as Activity)
                                            .setCallbacks(object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                                                override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                                                    viewModel.signInWithPhoneCredential(credential, phoneNumber) { success ->
                                                        isLoading = false
                                                        if (success) {
                                                            navController.navigate("home") { popUpTo("login") { inclusive = true } }
                                                        }
                                                    }
                                                }
                                                override fun onVerificationFailed(e: FirebaseException) {
                                                    isLoading = false
                                                    Toast.makeText(context, e.localizedMessage, Toast.LENGTH_SHORT).show()
                                                }
                                                override fun onCodeSent(verId: String, token: PhoneAuthProvider.ForceResendingToken) {
                                                    isLoading = false
                                                    verificationId = verId
                                                    viewMode = "otp"
                                                }
                                            })
                                            .build()
                                        PhoneAuthProvider.verifyPhoneNumber(options)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier.fillMaxWidth().height(52.dp)
                                ) {
                                    Text(stringResource(R.string.send_otp), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                                TextButton(
                                    onClick = { viewMode = "options" },
                                    modifier = Modifier.align(Alignment.CenterHorizontally)
                                ) {
                                    Text(stringResource(R.string.back_to_options), color = Color.Gray, fontSize = 12.sp)
                                }
                            }
                        } else if (viewMode == "otp") {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                OutlinedTextField(
                                    value = otpCode,
                                    onValueChange = { otpCode = it },
                                    placeholder = { Text(stringResource(R.string.otp_placeholder), color = Color.Gray) },
                                    leadingIcon = {
                                        Icon(Icons.Default.Lock, null, tint = CrimsonRed, modifier = Modifier.size(18.dp))
                                    },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = CrimsonRed,
                                        unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        cursorColor = CrimsonRed
                                    ),
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Button(
                                    onClick = {
                                        if (otpCode.isBlank()) return@Button
                                        isLoading = true
                                        val credential = PhoneAuthProvider.getCredential(verificationId, otpCode)
                                        viewModel.signInWithPhoneCredential(credential, phoneNumber) { success ->
                                            isLoading = false
                                            if (success) {
                                                navController.navigate("home") { popUpTo("login") { inclusive = true } }
                                            }
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier.fillMaxWidth().height(52.dp)
                                ) {
                                    Text(stringResource(R.string.verify_otp), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                                TextButton(
                                    onClick = { viewMode = "phone" },
                                    modifier = Modifier.align(Alignment.CenterHorizontally)
                                ) {
                                    Text(stringResource(R.string.back_to_options), color = Color.Gray, fontSize = 12.sp)
                                }
                            }
                        } else if (viewMode == "forgot") {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                OutlinedTextField(
                                    value = email,
                                    onValueChange = { email = it },
                                    placeholder = { Text(stringResource(R.string.email_placeholder), color = Color.Gray) },
                                    leadingIcon = {
                                        Icon(Icons.Default.Email, null, tint = CrimsonRed, modifier = Modifier.size(18.dp))
                                    },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = CrimsonRed,
                                        unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        cursorColor = CrimsonRed
                                    ),
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Button(
                                    onClick = {
                                        if (email.isBlank()) return@Button
                                        isLoading = true
                                        viewModel.forgotPassword(email) { success, msg ->
                                            isLoading = false
                                            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                                            if (success) {
                                                viewMode = "email"
                                            }
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier.fillMaxWidth().height(52.dp)
                                ) {
                                    Text(stringResource(R.string.reset_password), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                                TextButton(
                                    onClick = { viewMode = "email" },
                                    modifier = Modifier.align(Alignment.CenterHorizontally)
                                ) {
                                    Text(stringResource(R.string.back_to_options), color = Color.Gray, fontSize = 12.sp)
                                }
                            }
                        }
                    }


                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Column(
                modifier = Modifier.padding(horizontal = 32.dp, vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = stringResource(R.string.by_continuing_agree),
                    fontSize = 10.sp,
                    color = Color.Gray,
                    textAlign = TextAlign.Center,
                    lineHeight = 15.sp
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = stringResource(R.string.terms_of_service),
                        fontSize = 10.sp,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier.clickable { openLegalLink(appSettings.termsOfServiceUrl) }
                    )
                    Text(
                        text = stringResource(R.string.and_conjunction),
                        fontSize = 10.sp,
                        color = Color.Gray
                    )
                    Text(
                        text = stringResource(R.string.privacy_policy),
                        fontSize = 10.sp,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier.clickable { openLegalLink(appSettings.privacyPolicyUrl) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.75f))
                    .clickable(enabled = false) {}, // Block clicks to underlying elements
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    CircularProgressIndicator(
                        color = CrimsonRed,
                        modifier = Modifier.size(54.dp),
                        strokeWidth = 4.dp
                    )
                    Text(
                        text = stringResource(R.string.securing_session),
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = stringResource(R.string.take_moment),
                        color = Color.Gray,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL LOGIN BUTTON
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun SocialLoginButton(
    text: String,
    iconRes: Int? = null,
    iconColor: Color = Color.Unspecified,
    iconVector: ImageVector? = null,
    backgroundColor: Color,
    textColor: Color,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        color = backgroundColor,
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (iconRes != null) {
                Image(
                    painter = painterResource(id = iconRes),
                    contentDescription = null,
                    modifier = Modifier.size(22.dp)
                )
            } else if (iconVector != null) {
                Icon(
                    imageVector = iconVector,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = text,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = textColor
            )
        }
    }
}


