package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.colorResource
import com.example.R

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = true, // Force Dark theme globally for a Netflix-like streaming experience
    content: @Composable () -> Unit
) {
    // Dynamically update the mutable theme colors from XML resource files
    CrimsonRed = colorResource(id = R.color.primary_color)
    DarkGreyBg = colorResource(id = R.color.card_color)
    CardGrey = colorResource(id = R.color.card_color)
    MetallicGold = colorResource(id = R.color.gold_color)
    DarkerSlate = colorResource(id = R.color.background_color)

    val colorScheme = darkColorScheme(
        primary = CrimsonRed,
        onPrimary = PureWhite,
        secondary = CardGrey,
        onSecondary = PureWhite,
        tertiary = MetallicGold,
        background = DarkerSlate,
        onBackground = PureWhite,
        surface = DarkGreyBg,
        onSurface = PureWhite
    )

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
