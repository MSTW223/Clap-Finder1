package com.clapfinder.app.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.clapfinder.app.MainActivity
import com.clapfinder.app.R
import com.clapfinder.app.alert.AlarmController
import com.clapfinder.app.alert.FlashlightController
import com.clapfinder.app.alert.VibrationController
import com.clapfinder.app.audio.AudioRecordManager
import com.clapfinder.app.audio.ClapDetector
import com.clapfinder.app.data.SettingsRepository
import com.clapfinder.app.model.AppSettings
import com.clapfinder.app.model.ProtectionState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ClapDetectionService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())
    private var alarmTimeoutJob: Job? = null

    private lateinit var settingsRepository: SettingsRepository
    private lateinit var clapDetector: ClapDetector
    private lateinit var audioRecordManager: AudioRecordManager
    private lateinit var alarmController: AlarmController
    private lateinit var flashlightController: FlashlightController
    private lateinit var vibrationController: VibrationController

    private var wakeLock: PowerManager.WakeLock? = null
    private var currentSettings = AppSettings()

    companion object {
        private const val TAG = "ClapDetectionService"
        const val NOTIFICATION_CHANNEL_ID = "clap_finder_service_channel"
        const val NOTIFICATION_ID = 1001

        private val _serviceStateFlow = MutableStateFlow(ProtectionState.DISARMED)
        val serviceStateFlow: StateFlow<ProtectionState> = _serviceStateFlow.asStateFlow()

        var activeDetector: ClapDetector? = null
            private set
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service onCreate")

        settingsRepository = SettingsRepository(applicationContext)
        currentSettings = settingsRepository.loadSettings()

        clapDetector = ClapDetector(currentSettings.sensitivity)
        activeDetector = clapDetector
        audioRecordManager = AudioRecordManager(clapDetector)

        alarmController = AlarmController(applicationContext)
        flashlightController = FlashlightController(applicationContext)
        vibrationController = VibrationController(applicationContext)

        createNotificationChannel()

        serviceScope.launch {
            clapDetector.doubleClapDetected.collect {
                triggerAlarm()
            }
        }

        serviceScope.launch {
            clapDetector.singleImpulseDetected.collect { impulseCount ->
                if (_serviceStateFlow.value == ProtectionState.ALARM_ACTIVE &&
                    currentSettings.tripleClapStopEnabled &&
                    impulseCount >= 3
                ) {
                    stopAlarm()
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ServiceAction.ACTION_START_PROTECTION
        Log.d(TAG, "onStartCommand action: $action")

        when (action) {
            ServiceAction.ACTION_START_PROTECTION -> {
                startForegroundListening()
            }
            ServiceAction.ACTION_STOP_PROTECTION -> {
                stopProtectionAndShutdown()
            }
            ServiceAction.ACTION_STOP_ALARM -> {
                stopAlarm()
            }
        }

        return START_NOT_STICKY
    }

    private fun startForegroundListening() {
        currentSettings = settingsRepository.loadSettings()
        clapDetector.setSensitivity(currentSettings.sensitivity)

        val notification = buildPersistentNotification(ProtectionState.ARMED_LISTENING)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        acquireWakeLock()
        _serviceStateFlow.value = ProtectionState.ARMED_LISTENING

        audioRecordManager.startListening(serviceScope) { errorMessage ->
            Log.e(TAG, "Audio recording failed: $errorMessage")
            stopProtectionAndShutdown()
        }
    }

    private fun triggerAlarm() {
        if (_serviceStateFlow.value == ProtectionState.ALARM_ACTIVE) return

        Log.i(TAG, "Double clap confirmed! Triggering loud alarm, flash, and vibration.")
        _serviceStateFlow.value = ProtectionState.ALARM_ACTIVE

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, buildPersistentNotification(ProtectionState.ALARM_ACTIVE))

        alarmController.startAlarm(currentSettings.alarmSound)

        if (currentSettings.flashEnabled) {
            flashlightController.startStrobe(serviceScope, currentSettings.flashSpeed)
        }

        if (currentSettings.vibrationEnabled) {
            vibrationController.startVibration()
        }

        alarmTimeoutJob?.cancel()
        alarmTimeoutJob = serviceScope.launch {
            delay(currentSettings.alarmDurationSeconds * 1000L)
            Log.d(TAG, "Alarm auto-timeout reached (${currentSettings.alarmDurationSeconds}s)")
            stopAlarm()
        }
    }

    fun stopAlarm() {
        alarmTimeoutJob?.cancel()
        alarmTimeoutJob = null

        alarmController.stopAlarm()
        flashlightController.stopStrobe()
        vibrationController.stopVibration()

        _serviceStateFlow.value = ProtectionState.ARMED_LISTENING
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, buildPersistentNotification(ProtectionState.ARMED_LISTENING))
        clapDetector.reset()
    }

    private fun stopProtectionAndShutdown() {
        stopAlarm()
        audioRecordManager.stopListening()
        releaseWakeLock()

        _serviceStateFlow.value = ProtectionState.DISARMED
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "ClapFinder::ListeningWakeLock"
            ).apply {
                setReferenceCounted(false)
                acquire(6 * 60 * 60 * 1000L)
            }
        }
    }

    private fun releaseWakeLock() {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wake lock", e)
        } finally {
            wakeLock = null
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                getString(R.string.notif_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notif_channel_desc)
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun buildPersistentNotification(state: ProtectionState): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val openPendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val isAlarm = state == ProtectionState.ALARM_ACTIVE
        val title = if (isAlarm) getString(R.string.notif_title_alarm) else getString(R.string.notif_title_listening)
        val text = if (isAlarm) getString(R.string.notif_text_alarm) else getString(R.string.notif_text_listening)

        val builder = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_notification_clap)
            .setContentIntent(openPendingIntent)
            .setOngoing(true)
            .setPriority(if (isAlarm) NotificationCompat.PRIORITY_MAX else NotificationCompat.PRIORITY_LOW)

        if (isAlarm) {
            val stopAlarmIntent = Intent(this, ClapDetectionService::class.java).apply {
                action = ServiceAction.ACTION_STOP_ALARM
            }
            val stopAlarmPending = PendingIntent.getService(
                this,
                1,
                stopAlarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(0, getString(R.string.action_stop_alarm), stopAlarmPending)
        } else {
            val stopServiceIntent = Intent(this, ClapDetectionService::class.java).apply {
                action = ServiceAction.ACTION_STOP_PROTECTION
            }
            val stopServicePending = PendingIntent.getService(
                this,
                2,
                stopServiceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(0, getString(R.string.notif_action_stop), stopServicePending)
        }

        return builder.build()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service onDestroy")
        activeDetector = null
        stopProtectionAndShutdown()
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
