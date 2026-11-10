package com.clapfinder.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.core.content.ContextCompat
import com.clapfinder.app.data.SettingsRepository
import com.clapfinder.app.model.ProtectionState
import com.clapfinder.app.service.ClapDetectionService
import com.clapfinder.app.service.ServiceAction
import com.clapfinder.app.ui.navigation.Screen
import com.clapfinder.app.ui.screens.CalibrationScreen
import com.clapfinder.app.ui.screens.MainScreen
import com.clapfinder.app.ui.screens.PermissionsScreen
import com.clapfinder.app.ui.screens.SettingsScreen
import com.clapfinder.app.ui.theme.ClapFinderTheme

class MainActivity : ComponentActivity() {

    private lateinit var settingsRepository: SettingsRepository

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val recordAudioGranted = permissions[Manifest.permission.RECORD_AUDIO] == true
        if (recordAudioGranted) {
            startProtectionService()
        } else {
            Toast.makeText(
                this,
                "إذن الميكروفون ضروري لاكتشاف صوت التصفيق",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        settingsRepository = SettingsRepository(applicationContext)

        setContent {
            ClapFinderTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        val serviceState by ClapDetectionService.serviceStateFlow.collectAsState()
                        val currentSettings by settingsRepository.settingsFlow.collectAsState()
                        var currentScreen by remember { mutableStateOf(Screen.MAIN) }

                        when (currentScreen) {
                            Screen.MAIN -> {
                                MainScreen(
                                    state = serviceState,
                                    settings = currentSettings,
                                    onStartProtection = { checkPermissionsAndStart() },
                                    onStopProtection = { stopProtectionService() },
                                    onStopAlarm = { stopAlarm() },
                                    onUpdateSensitivity = { newLevel ->
                                        settingsRepository.updateSettings(
                                            currentSettings.copy(sensitivity = newLevel)
                                        )
                                    },
                                    onNavigate = { screen -> currentScreen = screen }
                                )
                            }
                            Screen.CALIBRATION -> {
                                CalibrationScreen(
                                    detector = ClapDetectionService.activeDetector,
                                    settings = currentSettings,
                                    onUpdateSensitivity = { newLevel ->
                                        settingsRepository.updateSettings(
                                            currentSettings.copy(sensitivity = newLevel)
                                        )
                                    },
                                    onBack = { currentScreen = Screen.MAIN }
                                )
                            }
                            Screen.SETTINGS -> {
                                SettingsScreen(
                                    settings = currentSettings,
                                    onSaveSettings = { updated ->
                                        settingsRepository.updateSettings(updated)
                                    },
                                    onBack = { currentScreen = Screen.MAIN }
                                )
                            }
                            Screen.PRIVACY -> {
                                PermissionsScreen(
                                    hasMicPermission = hasPermission(Manifest.permission.RECORD_AUDIO),
                                    hasNotifPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                        hasPermission(Manifest.permission.POST_NOTIFICATIONS)
                                    } else true,
                                    onRequestPermissions = { requestAppPermissions() },
                                    onBack = { currentScreen = Screen.MAIN }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    private fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
    }

    private fun checkPermissionsAndStart() {
        val permissionsToRequest = mutableListOf<String>()

        if (!hasPermission(Manifest.permission.RECORD_AUDIO)) {
            permissionsToRequest.add(Manifest.permission.RECORD_AUDIO)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!hasPermission(Manifest.permission.POST_NOTIFICATIONS)) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        if (permissionsToRequest.isEmpty()) {
            startProtectionService()
        } else {
            permissionLauncher.launch(permissionsToRequest.toTypedArray())
        }
    }

    private fun requestAppPermissions() {
        val permissions = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionLauncher.launch(permissions.toTypedArray())
    }

    private fun startProtectionService() {
        val intent = Intent(this, ClapDetectionService::class.java).apply {
            action = ServiceAction.ACTION_START_PROTECTION
        }
        ContextCompat.startForegroundService(this, intent)
    }

    private fun stopProtectionService() {
        val intent = Intent(this, ClapDetectionService::class.java).apply {
            action = ServiceAction.ACTION_STOP_PROTECTION
        }
        startService(intent)
    }

    private fun stopAlarm() {
        val intent = Intent(this, ClapDetectionService::class.java).apply {
            action = ServiceAction.ACTION_STOP_ALARM
        }
        startService(intent)
    }
}
