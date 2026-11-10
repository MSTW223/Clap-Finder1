package com.clapfinder.app.data

import android.content.Context
import android.content.SharedPreferences
import com.clapfinder.app.model.AlarmSoundOption
import com.clapfinder.app.model.AppSettings
import com.clapfinder.app.model.FlashSpeed
import com.clapfinder.app.model.SensitivityLevel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class SettingsRepository(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val _settingsFlow = MutableStateFlow(loadSettings())
    val settingsFlow: StateFlow<AppSettings> = _settingsFlow.asStateFlow()

    fun loadSettings(): AppSettings {
        val sensName = prefs.getString(KEY_SENSITIVITY, SensitivityLevel.MEDIUM.name)
        val sensitivity = runCatching {
            SensitivityLevel.valueOf(sensName ?: SensitivityLevel.MEDIUM.name)
        }.getOrDefault(SensitivityLevel.MEDIUM)

        val flashSpeedName = prefs.getString(KEY_FLASH_SPEED, FlashSpeed.MEDIUM.name)
        val flashSpeed = runCatching {
            FlashSpeed.valueOf(flashSpeedName ?: FlashSpeed.MEDIUM.name)
        }.getOrDefault(FlashSpeed.MEDIUM)

        val soundName = prefs.getString(KEY_ALARM_SOUND, AlarmSoundOption.SIREN.name)
        val sound = runCatching {
            AlarmSoundOption.valueOf(soundName ?: AlarmSoundOption.SIREN.name)
        }.getOrDefault(AlarmSoundOption.SIREN)

        return AppSettings(
            sensitivity = sensitivity,
            flashEnabled = prefs.getBoolean(KEY_FLASH_ENABLED, true),
            flashSpeed = flashSpeed,
            vibrationEnabled = prefs.getBoolean(KEY_VIBRATION_ENABLED, true),
            alarmSound = sound,
            alarmDurationSeconds = prefs.getInt(KEY_ALARM_DURATION, 30),
            tripleClapStopEnabled = prefs.getBoolean(KEY_TRIPLE_CLAP_STOP, false)
        )
    }

    fun updateSettings(newSettings: AppSettings) {
        prefs.edit().apply {
            putString(KEY_SENSITIVITY, newSettings.sensitivity.name)
            putBoolean(KEY_FLASH_ENABLED, newSettings.flashEnabled)
            putString(KEY_FLASH_SPEED, newSettings.flashSpeed.name)
            putBoolean(KEY_VIBRATION_ENABLED, newSettings.vibrationEnabled)
            putString(KEY_ALARM_SOUND, newSettings.alarmSound.name)
            putInt(KEY_ALARM_DURATION, newSettings.alarmDurationSeconds)
            putBoolean(KEY_TRIPLE_CLAP_STOP, newSettings.tripleClapStopEnabled)
        }.apply()

        _settingsFlow.value = newSettings
    }

    companion object {
        private const val PREFS_NAME = "clap_finder_settings"
        private const val KEY_SENSITIVITY = "sensitivity"
        private const val KEY_FLASH_ENABLED = "flash_enabled"
        private const val KEY_FLASH_SPEED = "flash_speed"
        private const val KEY_VIBRATION_ENABLED = "vibration_enabled"
        private const val KEY_ALARM_SOUND = "alarm_sound"
        private const val KEY_ALARM_DURATION = "alarm_duration"
        private const val KEY_TRIPLE_CLAP_STOP = "triple_clap_stop"
    }
}
