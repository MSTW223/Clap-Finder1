package com.clapfinder.app.alert

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

class VibrationController(context: Context) {

    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        vibratorManager?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    companion object {
        private const val TAG = "VibrationController"
        private val ALARM_VIBRATION_TIMINGS = longArrayOf(0, 400, 200, 400, 200, 800)
        private val ALARM_AMPLITUDES = intArrayOf(0, 255, 0, 255, 0, 0)
    }

    fun startVibration() {
        vibrator?.let { vib ->
            if (!vib.hasVibrator()) return

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val effect = VibrationEffect.createWaveform(
                        ALARM_VIBRATION_TIMINGS,
                        ALARM_AMPLITUDES,
                        0
                    )
                    vib.vibrate(effect)
                } else {
                    @Suppress("DEPRECATION")
                    vib.vibrate(ALARM_VIBRATION_TIMINGS, 0)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error starting vibration", e)
            }
        }
    }

    fun stopVibration() {
        try {
            vibrator?.cancel()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping vibration", e)
        }
    }
}
