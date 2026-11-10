package com.clapfinder.app.alert

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.util.Log
import com.clapfinder.app.model.AlarmSoundOption

class AlarmController(private val context: Context) {

    private var mediaPlayer: MediaPlayer? = null
    private var isAlarmPlaying = false

    companion object {
        private const val TAG = "AlarmController"
    }

    fun startAlarm(soundOption: AlarmSoundOption) {
        if (isAlarmPlaying) return

        try {
            val alarmUri: Uri = getSoundUri(soundOption)

            mediaPlayer = MediaPlayer().apply {
                setDataSource(context, alarmUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
            isAlarmPlaying = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start primary alarm player, falling back to system ringtone", e)
            fallbackPlay()
        }
    }

    private fun fallbackPlay() {
        try {
            val fallbackUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

            mediaPlayer = MediaPlayer().apply {
                setDataSource(context, fallbackUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
            isAlarmPlaying = true
        } catch (e: Exception) {
            Log.e(TAG, "Fallback alarm failed", e)
        }
    }

    private fun getSoundUri(soundOption: AlarmSoundOption): Uri {
        return when (soundOption) {
            AlarmSoundOption.SIREN ->
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            AlarmSoundOption.RADAR ->
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            AlarmSoundOption.BELL ->
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        }
    }

    fun stopAlarm() {
        if (!isAlarmPlaying && mediaPlayer == null) return

        try {
            mediaPlayer?.let { player ->
                if (player.isPlaying) {
                    player.stop()
                }
                player.reset()
                player.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping MediaPlayer", e)
        } finally {
            mediaPlayer = null
            isAlarmPlaying = false
        }
    }

    fun isPlaying(): Boolean = isAlarmPlaying
}
