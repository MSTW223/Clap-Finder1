package com.clapfinder.app.alert

import android.content.Context
import android.content.pm.PackageManager
import android.hardware.camera2.CameraAccessException
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.util.Log
import com.clapfinder.app.model.FlashSpeed
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class FlashlightController(private val context: Context) {

    private val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
    private var flashCameraId: String? = null
    private var hasFlashSupport: Boolean = false
    private var strobeJob: Job? = null

    companion object {
        private const val TAG = "FlashlightController"
    }

    init {
        detectFlashlight()
    }

    private fun detectFlashlight() {
        val hasFeature = context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH)
        if (!hasFeature || cameraManager == null) {
            hasFlashSupport = false
            return
        }

        try {
            for (id in cameraManager.cameraIdList) {
                val chars = cameraManager.getCameraCharacteristics(id)
                val flashAvailable = chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
                val facing = chars.get(CameraCharacteristics.LENS_FACING)

                if (flashAvailable && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    flashCameraId = id
                    hasFlashSupport = true
                    return
                } else if (flashAvailable && flashCameraId == null) {
                    flashCameraId = id
                    hasFlashSupport = true
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error discovering flash camera", e)
            hasFlashSupport = false
        }
    }

    fun isFlashAvailable(): Boolean = hasFlashSupport && flashCameraId != null

    fun startStrobe(scope: CoroutineScope, flashSpeed: FlashSpeed) {
        if (!hasFlashSupport || flashCameraId == null) {
            Log.w(TAG, "Flashlight not supported or no flash camera found")
            return
        }

        stopStrobe()

        strobeJob = scope.launch(Dispatchers.Default) {
            val interval = flashSpeed.intervalMs
            val camId = flashCameraId ?: return@launch

            while (isActive) {
                try {
                    setTorch(camId, true)
                    delay(interval)
                    setTorch(camId, false)
                    delay(interval)
                } catch (e: Exception) {
                    Log.e(TAG, "Strobe blinking error", e)
                    break
                }
            }
            setTorch(camId, false)
        }
    }

    fun stopStrobe() {
        strobeJob?.cancel()
        strobeJob = null

        flashCameraId?.let { id ->
            try {
                setTorch(id, false)
            } catch (e: Exception) {
                Log.e(TAG, "Error ensuring torch is off", e)
            }
        }
    }

    private fun setTorch(cameraId: String, enabled: Boolean) {
        try {
            cameraManager?.setTorchMode(cameraId, enabled)
        } catch (e: CameraAccessException) {
            Log.w(TAG, "CameraAccessException toggling torch mode to $enabled", e)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to toggle torch mode", e)
        }
    }
}
