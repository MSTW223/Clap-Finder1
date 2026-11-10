package com.clapfinder.app.model

enum class ProtectionState {
    DISARMED,
    ARMED_LISTENING,
    ALARM_ACTIVE
}

enum class SensitivityLevel(val displayNameAr: String, val thresholdMultiplier: Float) {
    LOW("منخفضة (للغرف الصاخبة)", 3.2f),
    MEDIUM("متوسطة (موصى بها)", 2.4f),
    HIGH("عالية (للأماكن الهادئة)", 1.7f)
}

enum class FlashSpeed(val displayNameAr: String, val intervalMs: Long) {
    SLOW("هادئ", 300L),
    MEDIUM("سريع", 150L),
    STROBE("ستروب مكثف", 80L)
}

enum class AlarmSoundOption(val displayNameAr: String) {
    SIREN("صفارة إنذار طوارئ"),
    RADAR("نبضات رادار متسارعة"),
    BELL("جرس عالي النبرة")
}

data class AppSettings(
    val sensitivity: SensitivityLevel = SensitivityLevel.MEDIUM,
    val flashEnabled: Boolean = true,
    val flashSpeed: FlashSpeed = FlashSpeed.MEDIUM,
    val vibrationEnabled: Boolean = true,
    val alarmSound: AlarmSoundOption = AlarmSoundOption.SIREN,
    val alarmDurationSeconds: Int = 30,
    val tripleClapStopEnabled: Boolean = false
)
