# R8 / ProGuard Optimization & Shrinking Rules for Clap Finder (Release)
# Package: com.clapfinder.app

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Keep Jetpack Compose composable functions and runtime classes
-keepclassmembers class * {
    @androidx.compose.runtime.Composable *;
}

# Keep Kotlin Coroutines internals
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-dontwarn java.lang.invoke.**

# Keep data models
-keep class com.clapfinder.app.model.** { *; }

# Keep Audio DSP and Hardware alert controllers
-keep class com.clapfinder.app.audio.** { *; }
-keep class com.clapfinder.app.alert.** { *; }
-keep class com.clapfinder.app.service.** { *; }
-keep class com.clapfinder.app.data.** { *; }
