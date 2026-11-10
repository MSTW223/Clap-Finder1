package com.clapfinder.app.audio

import com.clapfinder.app.model.SensitivityLevel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.sqrt

/**
 * High-performance, lightweight digital signal processor for detecting hand-clap transients.
 *
 * Characteristics of a physical hand clap:
 * 1. Rapid transient onset (< 10 ms rise time)
 * 2. High crest factor (Peak amplitude / RMS ratio > 2.8)
 * 3. Short impulse decay (< 80 ms), differing from sustained speech formants
 * 4. Distinct gap between two claps (180 ms - 1200 ms)
 */
class ClapDetector(
    private var sensitivity: SensitivityLevel = SensitivityLevel.MEDIUM
) {

    private val _doubleClapDetected = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val doubleClapDetected: SharedFlow<Unit> = _doubleClapDetected.asSharedFlow()

    private val _singleImpulseDetected = MutableSharedFlow<Int>(extraBufferCapacity = 1)
    val singleImpulseDetected: SharedFlow<Int> = _singleImpulseDetected.asSharedFlow()

    private val _liveAudioLevelDb = MutableStateFlow(0f)
    val liveAudioLevelDb: StateFlow<Float> = _liveAudioLevelDb.asStateFlow()

    private var ambientNoiseRms = 250f
    private var firstClapTimestamp = 0L
    private var secondClapTimestamp = 0L
    private var consecutiveClaps = 0

    companion object {
        private const val MIN_INTER_CLAP_INTERVAL_MS = 180L
        private const val MAX_INTER_CLAP_INTERVAL_MS = 1200L
        private const val TRIPLE_CLAP_WINDOW_MS = 1400L
        private const val BASE_MIN_PEAK_AMPLITUDE = 3000
    }

    fun setSensitivity(newSensitivity: SensitivityLevel) {
        this.sensitivity = newSensitivity
    }

    fun processAudioFrame(buffer: ShortArray, length: Int) {
        if (length <= 0) return

        var sumSquares = 0.0
        var maxPeak = 0

        for (i in 0 until length) {
            val sample = buffer[i].toInt()
            val absSample = abs(sample)
            if (absSample > maxPeak) {
                maxPeak = absSample
            }
            sumSquares += (sample * sample).toDouble()
        }

        val frameRms = sqrt(sumSquares / length).toFloat()

        val db = if (frameRms > 1f) {
            (20 * log10(frameRms / 32767f) + 90f).coerceIn(0f, 100f)
        } else {
            0f
        }
        _liveAudioLevelDb.value = db

        val crestFactor = if (frameRms > 10f) maxPeak.toFloat() / frameRms else 0f
        val dynamicThreshold = ambientNoiseRms * sensitivity.thresholdMultiplier

        val now = System.currentTimeMillis()

        val isImpulse = maxPeak >= BASE_MIN_PEAK_AMPLITUDE &&
                frameRms > dynamicThreshold &&
                crestFactor >= 2.8f

        if (isImpulse) {
            handleDetectedImpulse(now)
        } else {
            ambientNoiseRms = (ambientNoiseRms * 0.94f) + (frameRms * 0.06f)
            ambientNoiseRms = ambientNoiseRms.coerceIn(100f, 12000f)
        }

        if (consecutiveClaps > 0 && (now - firstClapTimestamp) > MAX_INTER_CLAP_INTERVAL_MS) {
            if (consecutiveClaps < 2) {
                consecutiveClaps = 0
                firstClapTimestamp = 0L
            }
        }
    }

    private fun handleDetectedImpulse(now: Long) {
        if (consecutiveClaps == 0) {
            firstClapTimestamp = now
            consecutiveClaps = 1
            _singleImpulseDetected.tryEmit(1)
        } else if (consecutiveClaps == 1) {
            val delta = now - firstClapTimestamp

            if (delta < MIN_INTER_CLAP_INTERVAL_MS) {
                return
            }

            if (delta <= MAX_INTER_CLAP_INTERVAL_MS) {
                secondClapTimestamp = now
                consecutiveClaps = 2
                _singleImpulseDetected.tryEmit(2)
                _doubleClapDetected.tryEmit(Unit)
            } else {
                firstClapTimestamp = now
                consecutiveClaps = 1
                _singleImpulseDetected.tryEmit(1)
            }
        } else if (consecutiveClaps == 2) {
            val delta = now - secondClapTimestamp
            if (delta in MIN_INTER_CLAP_INTERVAL_MS..TRIPLE_CLAP_WINDOW_MS) {
                consecutiveClaps = 3
                _singleImpulseDetected.tryEmit(3)
            } else if (delta > TRIPLE_CLAP_WINDOW_MS) {
                consecutiveClaps = 1
                firstClapTimestamp = now
                _singleImpulseDetected.tryEmit(1)
            }
        }
    }

    fun reset() {
        firstClapTimestamp = 0L
        secondClapTimestamp = 0L
        consecutiveClaps = 0
        ambientNoiseRms = 250f
        _liveAudioLevelDb.value = 0f
    }
}
