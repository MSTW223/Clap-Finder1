package com.clapfinder.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = Emerald80,
    secondary = EmeraldGrey80,
    tertiary = Mint80,
    background = DarkBackground,
    surface = DarkSurface,
    onPrimary = Color(0xFF003828),
    onSecondary = Color(0xFF1E352B),
    onBackground = Color(0xFFE1E3DF),
    onSurface = Color(0xFFE1E3DF),
    error = AlarmRed
)

private val LightColorScheme = lightColorScheme(
    primary = Emerald40,
    secondary = EmeraldGrey40,
    tertiary = Mint40,
    background = Color(0xFFFBFDFA),
    surface = Color(0xFFFBFDFA),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = Color(0xFF191C1B),
    onSurface = Color(0xFF191C1B),
    error = AlarmRed
)

@Composable
fun ClapFinderTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
