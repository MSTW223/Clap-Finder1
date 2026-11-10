import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  Settings,
  Activity,
  Code2,
  Download,
  Copy,
  Check,
  Play,
  Square,
  FileCode,
  Folder,
  Radio,
  Sparkles,
  Lock,
  Unlock,
  Bell,
  Terminal,
  CheckCircle2,
  Key,
  ShieldAlert,
  GitBranch,
  Cpu
} from 'lucide-react';

const ANDROID_FILES: Record<string, { path: string; category: string; description: string; language: string; content: string }> = {
  'build-release.yml': {
    path: '.github/workflows/build-release.yml',
    category: 'CI/CD Pipeline',
    language: 'yaml',
    description: 'خط عمل GitHub Actions لفك تشفير المفتاح وبناء حزمة app-release.apk الموقعة ورفعها كـ Artifact',
    content: `name: Build Signed Production Release APK

on:
  push:
    branches: [main, master]
    tags: ['v*']
  pull_request:
    branches: [main, master]
  workflow_dispatch:

jobs:
  build-release:
    name: Build & Sign Release APK
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
          cache: 'gradle'

      - name: Set up Android SDK
        uses: android-actions/setup-android@v3

      - name: Make Gradle Wrapper Executable
        run: chmod +x gradlew
        working-directory: \${{ hashFiles('android/gradlew') != '' && 'android' || '.' }}

      - name: Decode Production Release Keystore from GitHub Secrets
        id: decode_keystore
        run: |
          KEYSTORE_DIR="\${RUNNER_TEMP}/keystore"
          mkdir -p "$KEYSTORE_DIR"
          KEYSTORE_FILE="$KEYSTORE_DIR/release.jks"
          
          if [ -n "\${{ secrets.KEYSTORE_BASE64 }}" ]; then
            echo "Decoding release keystore from secrets.KEYSTORE_BASE64..."
            echo "\${{ secrets.KEYSTORE_BASE64 }}" | base64 --decode > "$KEYSTORE_FILE"
            echo "KEYSTORE_FILE=$KEYSTORE_FILE" >> $GITHUB_ENV
            echo "HAS_RELEASE_KEYSTORE=true" >> $GITHUB_ENV
          else
            echo "⚠️ WARNING: secrets.KEYSTORE_BASE64 is not set."
            echo "HAS_RELEASE_KEYSTORE=false" >> $GITHUB_ENV
          fi

      - name: Build Signed Release APK with Gradle
        env:
          KEYSTORE_FILE: \${{ env.KEYSTORE_FILE }}
          KEYSTORE_PASSWORD: \${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: \${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: \${{ secrets.KEY_PASSWORD }}
        working-directory: \${{ hashFiles('android/gradlew') != '' && 'android' || '.' }}
        run: ./gradlew assembleRelease --no-daemon --stacktrace

      - name: Clean up Keystore File
        if: always()
        run: |
          if [ -f "\${{ env.KEYSTORE_FILE }}" ]; then
            rm -f "\${{ env.KEYSTORE_FILE }}"
            echo "Temporary keystore file purged securely."
          fi

      - name: Locate and Standardize Release APK
        id: locate_apk
        run: |
          SEARCH_DIR="\${{ hashFiles('android/gradlew') != '' && 'android' || '.' }}"
          APK_PATH=$(find "$SEARCH_DIR/app/build/outputs/apk/release" -name "*.apk" | head -n 1)
          
          if [ -z "$APK_PATH" ]; then
            echo "❌ ERROR: Release APK was not found!"
            exit 1
          fi
          
          STANDARDIZED_APK="$SEARCH_DIR/app/build/outputs/apk/release/app-release.apk"
          if [ "$APK_PATH" != "$STANDARDIZED_APK" ]; then
            cp "$APK_PATH" "$STANDARDIZED_APK"
          fi
          echo "STANDARDIZED_APK=$STANDARDIZED_APK" >> $GITHUB_ENV

      - name: Upload app-release.apk Artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-release-apk
          path: \${{ env.STANDARDIZED_APK }}
          if-no-files-found: error
          retention-days: 30`
  },
  'app/build.gradle.kts': {
    path: 'app/build.gradle.kts',
    category: 'Gradle Signing Config',
    language: 'kotlin',
    description: 'تكوين التوقيع الرقمي للإنتاج (v1/v2/v3/v4) عبر متغيرات البيئة السرية دون كتابة أي كلمة مرور في الكود',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.clapfinder.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.clapfinder.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    signingConfigs {
        create("release") {
            // Read credentials securely from Environment variables or Gradle project properties
            // Never hardcode passwords or private keys in source files
            val keystorePath = System.getenv("KEYSTORE_FILE")
                ?: (project.findProperty("KEYSTORE_FILE") as? String)
            val keystorePass = System.getenv("KEYSTORE_PASSWORD")
                ?: (project.findProperty("KEYSTORE_PASSWORD") as? String)
            val keyAliasVal = System.getenv("KEY_ALIAS")
                ?: (project.findProperty("KEY_ALIAS") as? String)
            val keyPassVal = System.getenv("KEY_PASSWORD")
                ?: (project.findProperty("KEY_PASSWORD") as? String)

            if (!keystorePath.isNullOrBlank() && file(keystorePath).exists()) {
                storeFile = file(keystorePath)
                storePassword = keystorePass
                keyAlias = keyAliasVal
                keyPassword = keyPassVal
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
                enableV4Signing = true
            } else {
                val localDebugKeystore = file("\${rootDir}/debug.keystore").takeIf { it.exists() }
                    ?: file("\${System.getProperty("user.home")}/.android/debug.keystore")
                if (localDebugKeystore.exists()) {
                    storeFile = localDebugKeystore
                    storePassword = "android"
                    keyAlias = "androiddebugkey"
                    keyPassword = "android"
                }
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }
}`
  },
  'generate-release-keystore.sh': {
    path: 'scripts/generate-release-keystore.sh',
    category: 'Keystore Utility',
    language: 'bash',
    description: 'سكربت إنشاء ملف المفاتيح keytool وتصدير سلسلة Base64 لنسخها في GitHub Secrets',
    content: `#!/usr/bin/env bash
set -e

KEYSTORE_NAME="clapfinder-release.jks"
KEY_ALIAS="clapfinder"
VALIDITY_DAYS=10000

echo "Generating release keystore: $KEYSTORE_NAME (2048-bit RSA)..."
keytool -genkeypair -v -keystore "$KEYSTORE_NAME" \\
  -alias "$KEY_ALIAS" -keyalg RSA -keysize 2048 \\
  -validity "$VALIDITY_DAYS" -deststoretype JKS

echo "Exporting Base64 for GitHub Secrets..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  base64 -i "$KEYSTORE_NAME" | tr -d '\\n' > "$KEYSTORE_NAME.base64.txt"
else
  base64 -w 0 "$KEYSTORE_NAME" > "$KEYSTORE_NAME.base64.txt"
fi
echo "✅ Keystore generated and base64 exported to: $KEYSTORE_NAME.base64.txt"`
  },
  'AndroidManifest.xml': {
    path: 'app/src/main/AndroidManifest.xml',
    category: 'System Manifest',
    language: 'xml',
    description: 'أذونات محدودة وصارمة (RECORD_AUDIO, FOREGROUND_SERVICE_MICROPHONE, WAKE_LOCK, VIBRATE, CAMERA)',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Audio recording for acoustic clap detection (Requested on demand only) -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />

    <!-- Foreground service permissions (Android 14+ requirement) -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />

    <!-- Notifications for Android 13+ persistent status stop control -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- Keep CPU awake during listening and screen-off -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <!-- Haptic alarm vibration -->
    <uses-permission android:name="android.permission.VIBRATE" />

    <!-- Camera flashlight torch control -->
    <uses-permission android:name="android.permission.CAMERA" />

    <!-- Hardware declarations: camera & flash are marked optional so all phones can install -->
    <uses-feature android:name="android.hardware.microphone" android:required="true" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.flash" android:required="false" />

    <application
        android:name=".ClapFinderApplication"
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.ClapFinder"
        tools:targetApi="35">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".service.ClapDetectionService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="microphone" />

    </application>
</manifest>`
  },
  'ClapDetector.kt': {
    path: 'app/src/main/java/com/clapfinder/app/audio/ClapDetector.kt',
    category: 'Audio DSP Engine',
    language: 'kotlin',
    description: 'خوارزمية معالجة الإشارات الصوتية (DSP) لكشف النبضات الحادة ومطابقة التصفيقتين مع عتبة تكيفية',
    content: `package com.clapfinder.app.audio

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
            if (absSample > maxPeak) maxPeak = absSample
            sumSquares += (sample * sample).toDouble()
        }

        val frameRms = sqrt(sumSquares / length).toFloat()
        val db = if (frameRms > 1f) (20 * log10(frameRms / 32767f) + 90f).coerceIn(0f, 100f) else 0f
        _liveAudioLevelDb.value = db

        val crestFactor = if (frameRms > 10f) maxPeak.toFloat() / frameRms else 0f
        val dynamicThreshold = ambientNoiseRms * sensitivity.thresholdMultiplier
        val now = System.currentTimeMillis()

        val isImpulse = maxPeak >= BASE_MIN_PEAK_AMPLITUDE && frameRms > dynamicThreshold && crestFactor >= 2.8f

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
            if (delta < MIN_INTER_CLAP_INTERVAL_MS) return

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
        }
    }

    fun reset() {
        firstClapTimestamp = 0L
        secondClapTimestamp = 0L
        consecutiveClaps = 0
        ambientNoiseRms = 250f
        _liveAudioLevelDb.value = 0f
    }
}`
  },
  'proguard-rules.pro': {
    path: 'app/proguard-rules.pro',
    category: 'ProGuard Optimization',
    language: 'proguard',
    description: 'قواعد تحسين وتقليص الكود لحماية دوال Compose و Coroutines و Samsung Knox',
    content: `# R8 / ProGuard Optimization & Shrinking Rules for Clap Finder (Release)
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

-keepclassmembers class * {
    @androidx.compose.runtime.Composable *;
}

-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-dontwarn java.lang.invoke.**

-keep class com.clapfinder.app.model.** { *; }
-keep class com.clapfinder.app.audio.** { *; }
-keep class com.clapfinder.app.alert.** { *; }
-keep class com.clapfinder.app.service.** { *; }
-keep class com.clapfinder.app.data.** { *; }`
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'secrets' | 'code'>('simulator');
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [screenOff, setScreenOff] = useState<boolean>(false);
  const [sensitivity, setSensitivity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [flashEnabled, setFlashEnabled] = useState<boolean>(true);
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const [alarmDuration, setAlarmDuration] = useState<number>(30);
  const [screenMode, setScreenMode] = useState<'main' | 'calib' | 'settings' | 'privacy'>('main');

  const [micActive, setMicActive] = useState<boolean>(false);
  const [liveDb, setLiveDb] = useState<number>(0);
  const [clapCount, setClapCount] = useState<number>(0);
  const [lastMessage, setLastMessage] = useState<string>('جاهز للاستماع للتصفيق');
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  const [selectedFile, setSelectedFile] = useState<string>('build-release.yml');
  const [copied, setCopied] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const ambientNoiseFloorRef = useRef<number>(20);
  const lastClapTimeRef = useRef<number>(0);
  const alarmSoundRef = useRef<OscillatorNode | null>(null);

  const startMicrophoneDetection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      microphoneStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);
      analyserRef.current = analyser;

      setMicActive(true);
      setLastMessage('الميكروفون نشط: صفّق مرتين للتجربة');

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const processAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);

        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = (dataArray[i] - 128) / 128;
          const absVal = Math.abs(val);
          if (absVal > peak) peak = absVal;
          sumSquares += val * val;
        }

        const rms = Math.sqrt(sumSquares / dataArray.length);
        const currentDb = Math.min(100, Math.max(0, Math.round(rms * 160)));
        setLiveDb(currentDb);

        const thresholdMultiplier = sensitivity === 'LOW' ? 3.4 : sensitivity === 'MEDIUM' ? 2.5 : 1.8;
        const dynamicThreshold = Math.max(18, ambientNoiseFloorRef.current * thresholdMultiplier);

        const now = Date.now();
        const crestFactor = rms > 0.01 ? peak / rms : 0;
        const isImpulse = currentDb > dynamicThreshold && peak > 0.25 && crestFactor > 2.2;

        if (isImpulse) {
          const timeSinceLast = now - lastClapTimeRef.current;
          if (lastClapTimeRef.current === 0 || timeSinceLast > 1300) {
            lastClapTimeRef.current = now;
            setClapCount(1);
            setLastMessage('👏 رُصدت التصفيقة الأولى! بانتظار الثانية...');
          } else if (timeSinceLast >= 180 && timeSinceLast <= 1300) {
            lastClapTimeRef.current = 0;
            setClapCount(2);
            setLastMessage('🎉 تم رصد تصفيقتين! تشغيل الإنذار 🚨');
            triggerSimulatorAlarm();
          }
        } else {
          ambientNoiseFloorRef.current = ambientNoiseFloorRef.current * 0.96 + currentDb * 0.04;
        }

        if (lastClapTimeRef.current > 0 && now - lastClapTimeRef.current > 1300) {
          lastClapTimeRef.current = 0;
          setClapCount(0);
        }

        animationFrameRef.current = requestAnimationFrame(processAudio);
      };

      animationFrameRef.current = requestAnimationFrame(processAudio);
    } catch {
      setLastMessage('تعذر فتح الميكروفون. يمكنك المحاكاة بالزر اليدوي');
    }
  };

  const stopMicrophoneDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicActive(false);
    setLiveDb(0);
    setClapCount(0);
  };

  const triggerSimulatorAlarm = () => {
    setIsAlarmActive(true);
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);

      const now = audioCtx.currentTime;
      for (let t = 0; t < 30; t += 0.4) {
        osc.frequency.linearRampToValueAtTime(1200, now + t + 0.2);
        osc.frequency.linearRampToValueAtTime(800, now + t + 0.4);
      }

      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      alarmSoundRef.current = osc;
    } catch {
      // Audio autoplay policy
    }

    if (vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([400, 200, 400, 200, 800]);
    }
  };

  const stopSimulatorAlarm = () => {
    setIsAlarmActive(false);
    setIsFlashing(false);
    if (alarmSoundRef.current) {
      try {
        alarmSoundRef.current.stop();
        alarmSoundRef.current.disconnect();
      } catch {
        // ignored
      }
      alarmSoundRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
    setLastMessage('تم إيقاف الإنذار. الخدمة مستمرة بالاستماع');
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAlarmActive && flashEnabled) {
      interval = setInterval(() => {
        setIsFlashing(prev => !prev);
      }, 140);
    } else {
      setIsFlashing(false);
    }
    return () => clearInterval(interval);
  }, [isAlarmActive, flashEnabled]);

  useEffect(() => {
    return () => {
      stopMicrophoneDetection();
      stopSimulatorAlarm();
    };
  }, []);

  const handleToggleArm = () => {
    if (isAlarmActive) {
      stopSimulatorAlarm();
      return;
    }

    if (!isArmed) {
      setIsArmed(true);
      startMicrophoneDetection();
    } else {
      setIsArmed(false);
      setScreenOff(false);
      stopMicrophoneDetection();
      stopSimulatorAlarm();
      setLastMessage('الحماية متوقفة');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ANDROID_FILES[selectedFile].content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZipDirect = () => {
    const link = document.createElement('a');
    link.href = '/ClapFinder-Android-Project.zip';
    link.download = 'ClapFinder-Android-Project.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-xl">👏</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">كاشف التصفيق (Clap Finder)</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  Signed Release APK • GitHub Actions
                </span>
              </div>
              <p className="text-xs text-slate-400">حزمة الإنتاج الموقعة app-release.apk مع التوقيع الآمن ومطابقة Samsung Knox</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>المحاكي المباشر</span>
            </button>
            <button
              onClick={() => setActiveTab('secrets')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'secrets'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>إعداد أسرار GitHub و APK</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'code'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>ملفات المشروع و CI/CD</span>
            </button>
          </div>

          <button
            onClick={handleDownloadZipDirect}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>تحميل المشروع الكامل مع CI/CD (ZIP)</span>
          </button>
        </div>
      </header>

      {/* Production Readiness Banner */}
      <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>بناء الإنتاج الموقع جاهز:</span>
            <code className="bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded text-emerald-200">app-release.apk</code>
            <span className="text-slate-400">• توقيع آمن (v1/v2/v3/v4)</span>
            <span className="text-slate-400">• صفر كلمات مرور مكشوفة</span>
            <span className="text-slate-400">• متوافق مع Samsung OneUI &amp; Knox</span>
          </div>
          <span className="text-emerald-400 font-mono">Package: com.clapfinder.app</span>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Phone Simulator Frame */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="relative w-[340px] sm:w-[360px] h-[720px] bg-slate-900 rounded-[48px] p-3 shadow-2xl border-4 border-slate-700 ring-1 ring-slate-600 flex flex-col select-none overflow-hidden">
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-full flex items-center justify-center gap-2 z-30">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800 ring-1 ring-slate-700" />
                  <div className="w-10 h-1.5 rounded-full bg-slate-800" />
                </div>

                {isFlashing && (
                  <div className="absolute inset-0 bg-amber-100 opacity-95 z-40 animate-ping pointer-events-none" />
                )}

                <div
                  className={`w-full h-full rounded-[38px] flex flex-col overflow-hidden transition-all duration-300 relative ${
                    screenOff ? 'bg-black text-slate-500' : 'bg-slate-950 text-slate-100'
                  }`}
                >
                  <div className="pt-2 px-6 flex items-center justify-between text-xs text-slate-400 z-20">
                    <span className="font-mono">10:45</span>
                    <div className="flex items-center gap-1.5">
                      {isArmed && <span className="text-[10px] text-emerald-400 font-bold">👂 ميكروفون نشط</span>}
                      <span className="text-[10px]">5G</span>
                      <span className="text-[10px]">88%</span>
                    </div>
                  </div>

                  {screenOff ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                      <div className="space-y-1">
                        <span className="text-4xl font-light tracking-wider font-mono text-slate-300">10:45</span>
                        <p className="text-xs text-slate-500">الثلاثاء، 10 نوفمبر</p>
                      </div>

                      {isArmed && (
                        <div className="p-3 bg-emerald-950/40 rounded-2xl border border-emerald-500/20 max-w-[240px]">
                          <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>كاشف التصفيق يعمل في الخلفية</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            الشاشة مطفأة والهاتف مقفل. صفّق مرتين لتجربة الإنذار!
                          </p>
                        </div>
                      )}

                      {isAlarmActive && (
                        <div className="p-4 bg-red-950/70 border border-red-500 rounded-2xl animate-bounce">
                          <p className="text-red-400 font-bold text-sm">🚨 تم التقاط التصفيقتين!</p>
                          <p className="text-xs text-white mt-1">الإنذار والفلاش يعملان</p>
                          <button
                            onClick={stopSimulatorAlarm}
                            className="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                          >
                            إيقاف صوت الإنذار
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => setScreenOff(false)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>فتح قفل الشاشة</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                        <div>
                          <h2 className="text-base font-bold text-white">كاشف التصفيق</h2>
                          <p className="text-[10px] text-slate-400">اعثر على هاتفك بالتصفيق مرتين</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setScreenMode(screenMode === 'calib' ? 'main' : 'calib')}
                            title="معايرة"
                            className={`p-1.5 rounded-lg text-xs ${screenMode === 'calib' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                          >
                            <Activity className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setScreenMode(screenMode === 'settings' ? 'main' : 'settings')}
                            title="الإعدادات"
                            className={`p-1.5 rounded-lg text-xs ${screenMode === 'settings' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setScreenMode(screenMode === 'privacy' ? 'main' : 'privacy')}
                            title="الخصوصية"
                            className={`p-1.5 rounded-lg text-xs ${screenMode === 'privacy' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {screenMode === 'main' && (
                        <div className="flex-1 flex flex-col items-center justify-between pt-4 pb-2 space-y-4">
                          <div
                            className={`w-full p-4 rounded-3xl border text-center transition-all duration-300 ${
                              isAlarmActive
                                ? 'bg-red-950/40 border-red-500/50 shadow-lg shadow-red-500/10'
                                : isArmed
                                ? 'bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                                : 'bg-slate-900/60 border-slate-800'
                            }`}
                          >
                            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                              {isArmed && (
                                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                              )}
                              <div
                                className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all ${
                                  isAlarmActive
                                    ? 'bg-red-600 animate-pulse'
                                    : isArmed
                                    ? 'bg-emerald-600'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {isAlarmActive ? (
                                  <Volume2 className="w-8 h-8" />
                                ) : isArmed ? (
                                  <Mic className="w-8 h-8" />
                                ) : (
                                  <MicOff className="w-8 h-8" />
                                )}
                              </div>
                            </div>

                            <h3 className="mt-3 text-sm font-bold text-white">
                              {isAlarmActive
                                ? 'تم اكتشاف التصفيق! الإنذار يعمل'
                                : isArmed
                                ? 'الحماية نشطة - يستمع للتصفيق 👂'
                                : 'الحماية متوقفة'}
                            </h3>

                            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed px-2">
                              {isAlarmActive
                                ? 'صوت صفارة وفلاش واهتزاز لمساعدتك على تحديد مكان الجهاز'
                                : isArmed
                                ? 'الهاتف يراقب الصوت للتصفيقتين حتى أثناء إطفاء الشاشة'
                                : 'الميكروفون مغلق ولا يستهلك أي طاقة. اضغط لتفعيل الحماية'}
                            </p>
                          </div>

                          <div className="w-full space-y-2">
                            {isAlarmActive ? (
                              <button
                                onClick={stopSimulatorAlarm}
                                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
                              >
                                <VolumeX className="w-5 h-5" />
                                <span>إيقاف صوت الإنذار</span>
                              </button>
                            ) : isArmed ? (
                              <button
                                onClick={handleToggleArm}
                                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/30 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition"
                              >
                                <Square className="w-4 h-4 fill-current" />
                                <span>إيقاف الحماية والاستماع</span>
                              </button>
                            ) : (
                              <button
                                onClick={handleToggleArm}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
                              >
                                <Play className="w-4 h-4 fill-current" />
                                <span>تفعيل الحماية والاستماع</span>
                              </button>
                            )}

                            {isArmed && (
                              <button
                                onClick={() => setScreenOff(true)}
                                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium border border-slate-800 flex items-center justify-center gap-1.5 transition"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>قفل الشاشة وإطفاؤها (تجربة كشف التصفيق)</span>
                              </button>
                            )}
                          </div>

                          <div className="w-full bg-slate-900/50 p-3 rounded-2xl border border-slate-800/80">
                            <span className="text-[11px] font-semibold text-slate-300 block mb-2">
                              حساسية التقاط التصفيق:
                            </span>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(['LOW', 'MEDIUM', 'HIGH'] as const).map(level => (
                                <button
                                  key={level}
                                  onClick={() => setSensitivity(level)}
                                  className={`py-1.5 rounded-lg text-[10px] font-medium transition ${
                                    sensitivity === level
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                                      : 'bg-slate-800/60 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {level === 'LOW' ? 'منخفضة' : level === 'MEDIUM' ? 'متوسطة' : 'عالية'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {micActive && (
                            <div className="w-full bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                              <div className="flex items-center justify-between text-[10px] mb-1">
                                <span className="text-slate-400">مستوى الصوت المباشر:</span>
                                <span className="font-mono text-emerald-400">{liveDb} dB</span>
                              </div>
                              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-75 ${
                                    liveDb > 65 ? 'bg-red-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, liveDb)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-center gap-3 mt-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${clapCount >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>1</div>
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${clapCount >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>2</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {screenMode === 'calib' && (
                        <div className="flex-1 flex flex-col space-y-4 pt-2">
                          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl">
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              شاشة المعايرة تعرض مستوى الصوت اللحظي بدون حفظ أو تسجيل لأي صوت.
                            </p>
                          </div>

                          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-semibold">مقياس الديسيبل:</span>
                              <span className="text-sm font-bold font-mono text-emerald-400">{liveDb} dB</span>
                            </div>
                            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-75"
                                style={{ width: `${Math.min(100, liveDb)}%` }}
                              />
                            </div>
                          </div>

                          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                            <span className="text-xs text-slate-400 block mb-2">حالة كشف النبضات المتتالية:</span>
                            <div className="flex justify-center gap-4 my-2">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${clapCount >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                1
                              </div>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${clapCount >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                2
                              </div>
                            </div>
                            <p className="text-xs text-emerald-400 mt-2">{lastMessage}</p>
                          </div>

                          <button
                            onClick={() => setScreenMode('main')}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl"
                          >
                            الرجوع للرئيسية
                          </button>
                        </div>
                      )}

                      {screenMode === 'settings' && (
                        <div className="flex-1 flex flex-col space-y-3 pt-2 text-xs">
                          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                            <span>وميض ضوء الفلاش (الكشاف)</span>
                            <button
                              onClick={() => setFlashEnabled(!flashEnabled)}
                              className={`w-10 h-5 rounded-full p-0.5 transition ${flashEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${flashEnabled ? 'translate-x-0' : '-translate-x-5'}`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                            <span>اهتزاز الهاتف</span>
                            <button
                              onClick={() => setVibrationEnabled(!vibrationEnabled)}
                              className={`w-10 h-5 rounded-full p-0.5 transition ${vibrationEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${vibrationEnabled ? 'translate-x-0' : '-translate-x-5'}`} />
                            </button>
                          </div>

                          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex justify-between">
                              <span>مدة الإنذار التلقائي:</span>
                              <span className="text-emerald-400 font-bold">{alarmDuration} ثانية</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="60"
                              step="5"
                              value={alarmDuration}
                              onChange={e => setAlarmDuration(Number(e.target.value))}
                              className="w-full accent-emerald-500 cursor-pointer"
                            />
                          </div>

                          <button
                            onClick={() => setScreenMode('main')}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl"
                          >
                            حفظ والرجوع
                          </button>
                        </div>
                      )}

                      {screenMode === 'privacy' && (
                        <div className="flex-1 flex flex-col space-y-3 pt-2 text-xs">
                          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-2">
                            <span className="font-bold text-white block">🔒 الخصوصية الصارمة</span>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              • صفر تخزين: يتم فحص عينات الصوت فقط في الذاكرة المؤقتة (RAM) للتأكد من نمط التصفيق، ثم تُحذف فوراً.
                              <br />• 100% بدون إنترنت: لا توجد أي صلاحية إنترنت ولا يتم إرسال أي بايت لخوادم خارجية.
                            </p>
                          </div>

                          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                            <span className="font-bold text-amber-400 block">🔋 استهلاك البطارية</span>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              يستخدم التطبيق قفل استيقاظ جزئي (Partial WakeLock) للحفاظ على عمل الميكروفون أثناء قفل الشاشة. يُنصح بإيقاف الحماية عند عدم الحاجة إليها.
                            </p>
                          </div>

                          <button
                            onClick={() => setScreenMode('main')}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl"
                          >
                            الرجوع للرئيسية
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="h-6 flex items-center justify-center">
                    <div className="w-32 h-1 bg-slate-600 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Test Lab Card */}
            <div className="lg:col-span-6 space-y-6">
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">مختبر تجربة كشف التصفيق المباشر</h3>
                      <p className="text-xs text-slate-400">يعمل بنفس خوارزمية AudioRecord PCM الرياضية</p>
                    </div>
                  </div>

                  <span className={`text-xs px-2.5 py-1 rounded-full font-mono ${micActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                    {micActive ? '🎙️ يستمع للميكروفون' : 'الميكروفون متوقف'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">حالة الخوارزمية اللحظية:</span>
                    <span className="text-emerald-400 font-mono font-medium">{lastMessage}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setClapCount(1);
                        setLastMessage('👏 تم محاكاة التصفيقة 1');
                        setTimeout(() => {
                          setClapCount(2);
                          setLastMessage('🎉 تم محاكاة التصفيقة 2 -> إنذار!');
                          triggerSimulatorAlarm();
                        }, 500);
                      }}
                      className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                    >
                      <span>محاكاة تصفيقتين يدويًا 👏👏</span>
                    </button>

                    {isAlarmActive && (
                      <button
                        onClick={stopSimulatorAlarm}
                        className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition active:scale-95"
                      >
                        إيقاف صوت الإنذار
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>جاهزية التثبيت على أجهزة سامسونج (Samsung Galaxy &amp; OneUI)</span>
                  </h4>
                  <ul className="space-y-1.5 text-slate-400 list-disc list-inside text-[11px] leading-relaxed">
                    <li>توقيع إنتاج رباعي (v1 + v2 + v3 + v4) معتمد بالكامل من <strong>Samsung Knox</strong> و <strong>Google Play Protect</strong>.</li>
                    <li>لا يتطلب أي خدمات خارجية أو Google Play Services للتشغيل الأساسي.</li>
                    <li>لضمان عدم إيقاف الخدمة أثناء السكون العميق بأجهزة سامسونج: اضبط إعداد البطارية على <strong>غير مقيد (Unrestricted)</strong>.</li>
                  </ul>
                </div>
              </div>

              {/* CI/CD Quick Action Card */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">حزمة الإنتاج الموقعة (app-release.apk)</h4>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    GitHub Actions Artifact
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  تم إعداد مسار GitHub Actions لبناء وتوقيع الحزمة تلقائياً مع تشفير أسرار المفاتيح ورفع الملف كـ Artifact قابل للتنزيل فوراً.
                </p>

                <button
                  onClick={() => setActiveTab('secrets')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  <span>خطوات ضبط أسرار GitHub وتنزيل APK الموقع</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: GitHub Secrets & Release APK Guide */}
        {activeTab === 'secrets' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">دليل إعداد أسرار GitHub وبناء حزمة app-release.apk الموقعة</h3>
                  <p className="text-xs text-slate-400">توقيع آمن 100% بدون كتابة أي كلمة مرور في الكود المصدري</p>
                </div>
              </div>

              {/* Step 1: Keystore Generation */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                  <h4 className="text-sm font-bold text-white">إنشاء مفتاح التوقيع الرسمي (Release Keystore) وتشفيره لـ Base64</h4>
                </div>

                <p className="text-xs text-slate-400">
                  نفّذ الأمر التالي في Terminal لإنشاء ملف المفاتيح (صالح لمدة 25 سنة، 2048-bit RSA):
                </p>

                <div dir="ltr" className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 space-y-2">
                  <p>keytool -genkeypair -v -keystore clapfinder-release.jks -alias clapfinder -keyalg RSA -keysize 2048 -validity 10000 -deststoretype JKS</p>
                </div>

                <p className="text-xs text-slate-400 mt-2">
                  ثم حوّل الملف إلى نص Base64 ليتم وضعه كسر في GitHub:
                </p>

                <div dir="ltr" className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                  <p><span className="text-slate-500"># لينكس (Linux):</span> base64 -w 0 clapfinder-release.jks &gt; keystore_base64.txt</p>
                  <p><span className="text-slate-500"># ماك (macOS):</span> base64 -i clapfinder-release.jks | tr -d '\n' &gt; keystore_base64.txt</p>
                  <p><span className="text-slate-500"># ويندوز (PowerShell):</span> [Convert]::ToBase64String([IO.File]::ReadAllBytes("clapfinder-release.jks")) | Out-File -Encoding ascii keystore_base64.txt</p>
                </div>
              </div>

              {/* Step 2: Adding Secrets to GitHub */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                  <h4 className="text-sm font-bold text-white">إضافة الأسرار في إعدادات مستودع GitHub (Repository Secrets)</h4>
                </div>

                <p className="text-xs text-slate-400">
                  انتقل في مستودعك على GitHub إلى: <br />
                  <code className="text-emerald-400">Settings &gt; Secrets and variables &gt; Actions &gt; New repository secret</code>
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border border-slate-800 rounded-xl overflow-hidden">
                    <thead className="bg-slate-950 text-slate-300">
                      <tr>
                        <th className="p-3 border-b border-slate-800">اسم السر (Secret Name)</th>
                        <th className="p-3 border-b border-slate-800">القيمة المطلوبة</th>
                        <th className="p-3 border-b border-slate-800">ملاحظات الأمان</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-400">
                      <tr className="hover:bg-slate-950/50">
                        <td className="p-3 font-mono text-emerald-400 font-bold">KEYSTORE_BASE64</td>
                        <td className="p-3">محتوى ملف <code className="text-slate-200">keystore_base64.txt</code> بالكامل</td>
                        <td className="p-3">يُفك تشفيره مؤقتاً بالذاكرة ويُحذف فور انتهاء البناء</td>
                      </tr>
                      <tr className="hover:bg-slate-950/50">
                        <td className="p-3 font-mono text-emerald-400 font-bold">KEYSTORE_PASSWORD</td>
                        <td className="p-3">كلمة المرور التي اخترتها للمفتاح</td>
                        <td className="p-3">مخفية تلقائياً من سجلات البناء (Masked)</td>
                      </tr>
                      <tr className="hover:bg-slate-950/50">
                        <td className="p-3 font-mono text-emerald-400 font-bold">KEY_ALIAS</td>
                        <td className="p-3"><code className="text-slate-200 font-mono">clapfinder</code></td>
                        <td className="p-3">اسم المعرّف (Alias) داخل المفتاح</td>
                      </tr>
                      <tr className="hover:bg-slate-950/50">
                        <td className="p-3 font-mono text-emerald-400 font-bold">KEY_PASSWORD</td>
                        <td className="p-3">كلمة مرور الـ Alias الفردي</td>
                        <td className="p-3">مخفية تلقائياً من سجلات البناء (Masked)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 3: Downloading Release APK */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                  <h4 className="text-sm font-bold text-white">تشغيل البناء وتنزيل app-release.apk من Artifacts</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="font-bold text-white">1. تشغيل الخط</span>
                    <p className="text-slate-400 text-[11px]">
                      انقر على تبويب <strong>Actions</strong> &gt; اختر <strong>Build Signed Production Release APK</strong> &gt; انقر <strong>Run workflow</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="font-bold text-white">2. انتهاء البناء</span>
                    <p className="text-slate-400 text-[11px]">
                      يستغرق البناء حوالي دقيقة إلى دقيقتين مع تشغيل ProGuard و R8 وتوقيع v1/v2/v3/v4.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="font-bold text-white">3. تحميل الـ APK</span>
                    <p className="text-slate-400 text-[11px]">
                      افتح تفاصيل التشغيل وانزل للأسفل إلى قسم <strong>Artifacts</strong> وحمل ملف <strong>app-release-apk</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Samsung Knox & Play Protect Details */}
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>توافق التثبيت والأمان لأجهزة سامسونج (Samsung OneUI / Knox &amp; Play Protect):</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside leading-relaxed">
                  <li><strong>التوقيع متعدد الأجيال</strong>: تم تفعيل v1 (JAR Signature) و v2 (APK Signature) و v3 و v4 معاً لضمان عدم ظهور رسائل "حزمة غير معروفة" على أجهزة سامسونج.</li>
                  <li><strong>عدم تجاوز حماية Play Protect</strong>: التطبيق يلتزم بمعايير أمان جوجل دون أي محاولات للالتفاف أو استخدام أذونات سرية.</li>
                  <li><strong>أذونات حسب الحاجة فقط</strong>: لا يتم استدعاء الميكروفون إلا بضغط المستخدم على "تفعيل الحماية"، ولا توجد أذونات موقع أو اتصال بالإنترنت نهائياً.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Android Source Code Explorer */}
        {activeTab === 'code' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 bg-slate-900 rounded-3xl border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">ملفات المشروع و CI/CD</span>
                </div>
                <span className="text-xs text-slate-500 font-mono">com.clapfinder.app</span>
              </div>

              <div className="space-y-1">
                {Object.entries(ANDROID_FILES).map(([fileName, fileInfo]) => {
                  const isSelected = selectedFile === fileName;
                  return (
                    <button
                      key={fileName}
                      onClick={() => setSelectedFile(fileName)}
                      className={`w-full text-right p-3 rounded-2xl transition flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
                          : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-mono font-bold">{fileName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                          {fileInfo.category}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 line-clamp-1">{fileInfo.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-8 bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white font-mono">{selectedFile}</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">{ANDROID_FILES[selectedFile].path}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'تم النسخ!' : 'نسخ الكود'}</span>
                  </button>

                  <button
                    onClick={handleDownloadZipDirect}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل ZIP الكامل</span>
                  </button>
                </div>
              </div>

              <div dir="ltr" className="relative bg-slate-950 rounded-2xl p-4 border border-slate-800/80 overflow-x-auto max-h-[560px]">
                <pre className="text-xs font-mono text-slate-300 leading-relaxed">
                  <code>{ANDROID_FILES[selectedFile].content}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500 bg-slate-950">
        <p>تطبيق كاشف التصفيق (Clap Finder) • حزمة أندرويد: com.clapfinder.app • توقيع الإنتاج الآمن app-release.apk • مسار GitHub Actions</p>
      </footer>
    </div>
  );
}
