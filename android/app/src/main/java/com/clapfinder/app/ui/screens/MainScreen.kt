package com.clapfinder.app.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.clapfinder.app.R
import com.clapfinder.app.model.AppSettings
import com.clapfinder.app.model.ProtectionState
import com.clapfinder.app.model.SensitivityLevel
import com.clapfinder.app.ui.navigation.Screen
import com.clapfinder.app.ui.theme.AlarmRed

@Composable
fun MainScreen(
    state: ProtectionState,
    settings: AppSettings,
    onStartProtection: () -> Unit,
    onStopProtection: () -> Unit,
    onStopAlarm: () -> Unit,
    onUpdateSensitivity: (SensitivityLevel) -> Unit,
    onNavigate: (Screen) -> Unit
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = stringResource(R.string.app_name),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = stringResource(R.string.app_tagline),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Row {
                IconButton(onClick = { onNavigate(Screen.CALIBRATION) }) {
                    Icon(
                        imageVector = Icons.Default.GraphicEq,
                        contentDescription = stringResource(R.string.nav_calibration)
                    )
                }
                IconButton(onClick = { onNavigate(Screen.SETTINGS) }) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = stringResource(R.string.nav_settings)
                    )
                }
                IconButton(onClick = { onNavigate(Screen.PRIVACY) }) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = stringResource(R.string.nav_privacy)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        HeroStatusCard(state = state)

        Spacer(modifier = Modifier.height(32.dp))

        when (state) {
            ProtectionState.ALARM_ACTIVE -> {
                Button(
                    onClick = onStopAlarm,
                    colors = ButtonDefaults.buttonColors(containerColor = AlarmRed),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(68.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.VolumeUp,
                        contentDescription = null,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = stringResource(R.string.action_stop_alarm),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            ProtectionState.ARMED_LISTENING -> {
                Button(
                    onClick = onStopProtection,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.secondary
                    ),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(64.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.PowerSettingsNew,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = stringResource(R.string.action_stop_protection),
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            ProtectionState.DISARMED -> {
                Button(
                    onClick = onStartProtection,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    ),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(68.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = null,
                        modifier = Modifier.size(26.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = stringResource(R.string.action_start_protection),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        SensitivityQuickSelector(
            current = settings.sensitivity,
            enabled = state != ProtectionState.ALARM_ACTIVE,
            onSelect = onUpdateSensitivity
        )

        Spacer(modifier = Modifier.height(20.dp))

        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.NotificationsActive,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "طريقة الاستخدام عند قفل الشاشة",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleSmall
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "1. اضغط 'تفعيل الحماية'\n2. اقفل الشاشة واترك الهاتف في أي مكان\n3. صفّق مرتين متتاليتين بصوت واضح وسيطلق الهاتف صفارة وفلاش ليد واهتزاز فوراً.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 20.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedButton(
            onClick = { onNavigate(Screen.CALIBRATION) },
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(imageVector = Icons.Default.GraphicEq, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text(text = stringResource(R.string.action_test_clap))
        }
    }
}

@Composable
private fun HeroStatusCard(state: ProtectionState) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (state == ProtectionState.ARMED_LISTENING) 1.08f else if (state == ProtectionState.ALARM_ACTIVE) 1.15f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(if (state == ProtectionState.ALARM_ACTIVE) 400 else 1200),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    val (badgeBg, badgeText, badgeDesc) = when (state) {
        ProtectionState.DISARMED -> Triple(
            MaterialTheme.colorScheme.surfaceVariant,
            stringResource(R.string.status_disarmed),
            stringResource(R.string.desc_disarmed)
        )
        ProtectionState.ARMED_LISTENING -> Triple(
            MaterialTheme.colorScheme.primaryContainer,
            stringResource(R.string.status_armed),
            stringResource(R.string.desc_armed)
        )
        ProtectionState.ALARM_ACTIVE -> Triple(
            AlarmRed.copy(alpha = 0.2f),
            stringResource(R.string.status_alarm),
            stringResource(R.string.desc_alarm)
        )
    }

    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = badgeBg),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(90.dp)
                    .scale(pulseScale)
                    .clip(CircleShape)
                    .background(
                        when (state) {
                            ProtectionState.DISARMED -> MaterialTheme.colorScheme.surface
                            ProtectionState.ARMED_LISTENING -> MaterialTheme.colorScheme.primary
                            ProtectionState.ALARM_ACTIVE -> AlarmRed
                        }
                    )
            ) {
                Icon(
                    imageVector = when (state) {
                        ProtectionState.DISARMED -> Icons.Default.Security
                        ProtectionState.ARMED_LISTENING -> Icons.Default.GraphicEq
                        ProtectionState.ALARM_ACTIVE -> Icons.Default.NotificationsActive
                    },
                    contentDescription = null,
                    tint = if (state == ProtectionState.DISARMED) MaterialTheme.colorScheme.onSurface else Color.White,
                    modifier = Modifier.size(46.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = badgeText,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = badgeDesc,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                lineHeight = 20.sp
            )
        }
    }
}

@Composable
private fun SensitivityQuickSelector(
    current: SensitivityLevel,
    enabled: Boolean,
    onSelect: (SensitivityLevel) -> Unit
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier
            .fillMaxWidth()
            .border(
                1.dp,
                MaterialTheme.colorScheme.outlineVariant,
                RoundedCornerShape(18.dp)
            )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(R.string.sensitivity_title),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                SensitivityLevel.values().forEach { level ->
                    val selected = level == current
                    val bg by animateColorAsState(
                        targetValue = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                        label = "btnBg"
                    )

                    Surface(
                        onClick = { if (enabled) onSelect(level) },
                        shape = RoundedCornerShape(12.dp),
                        color = bg,
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier.padding(vertical = 10.dp)
                        ) {
                            Text(
                                text = when (level) {
                                    SensitivityLevel.LOW -> "منخفضة"
                                    SensitivityLevel.MEDIUM -> "متوسطة"
                                    SensitivityLevel.HIGH -> "عالية"
                                },
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                color = if (selected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }
        }
    }
}
