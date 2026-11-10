package com.clapfinder.app.audio

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Manages the low-level Android AudioRecord lifecycle and streams raw 16-bit PCM samples
 * to the mathematical ClapDetector in a background coroutine.
 *
 * Audio is strictly processed in volatile memory and never persisted or transmitted.
 */
class AudioRecordManager(
    private val clapDetector: ClapDetector
) {

    private var audioRecord: AudioRecord? = null
    private var recordingJob: Job? = null
    private var isRunning = false

    companion object {
        private const val TAG = "AudioRecordManager"
        const val SAMPLE_RATE_HZ = 16000
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    @SuppressLint("MissingPermission")
    fun startListening(scope: CoroutineScope, onError: (String) -> Unit) {
        if (isRunning) return

        try {
            val minBufferSize = AudioRecord.getMinBufferSize(
                SAMPLE_RATE_HZ,
                CHANNEL_CONFIG,
                AUDIO_FORMAT
            )

            if (minBufferSize == AudioRecord.ERROR || minBufferSize == AudioRecord.ERROR_BAD_VALUE) {
                onError("Invalid AudioRecord buffer configuration")
                return
            }

            val bufferSize = (minBufferSize * 2).coerceAtLeast(1024)

            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE_HZ,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                audioRecord?.release()
                audioRecord = null
                onError("Failed to initialize AudioRecord hardware device")
                return
            }

            audioRecord?.startRecording()
            isRunning = true

            recordingJob = scope.launch(Dispatchers.IO) {
                val audioBuffer = ShortArray(bufferSize / 2)

                while (isActive && isRunning) {
                    val readCount = audioRecord?.read(audioBuffer, 0, audioBuffer.size) ?: 0
                    if (readCount > 0) {
                        clapDetector.processAudioFrame(audioBuffer, readCount)
                    } else if (readCount < 0) {
                        Log.w(TAG, "AudioRecord read error code: $readCount")
                    }
                }
            }

        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException: RECORD_AUDIO permission missing", e)
            onError("Microphone permission was revoked")
            stopListening()
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error in AudioRecordManager", e)
            onError("Audio hardware error: ${e.localizedMessage}")
            stopListening()
        }
    }

    fun stopListening() {
        isRunning = false
        recordingJob?.cancel()
        recordingJob = null

        try {
            if (audioRecord?.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                audioRecord?.stop()
            }
            audioRecord?.release()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping AudioRecord", e)
        } finally {
            audioRecord = null
            clapDetector.reset()
        }
    }
}
