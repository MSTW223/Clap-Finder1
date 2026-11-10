# Clap Finder (كاشف التصفيق) - Production Android Project & CI/CD Pipeline

A production-quality native Android application written in **Kotlin** and **Jetpack Compose** that helps users find their misplaced smartphone by detecting two consecutive hand claps via the microphone, even while the screen is off and locked.

---

## 🚀 CI/CD & Automated Signed Release Build (GitHub Actions)

The repository includes an automated GitHub Actions workflow (`.github/workflows/build-release.yml`) configured to generate a production-signed, optimized APK named **`app-release.apk`**.

### 1. Generating a Production Keystore Locally
Run the included helper script or execute `keytool`:

```bash
keytool -genkeypair -v -keystore clapfinder-release.jks \
  -alias clapfinder \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -deststoretype JKS
```

Encode the keystore file to Base64:
- **Linux**:
  ```bash
  base64 -w 0 clapfinder-release.jks > keystore_base64.txt
  ```
- **macOS**:
  ```bash
  base64 -i clapfinder-release.jks | tr -d '\n' > keystore_base64.txt
  ```
- **Windows (PowerShell)**:
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("clapfinder-release.jks")) | Out-File -Encoding ascii keystore_base64.txt
  ```

---

### 2. Configuring GitHub Actions Secrets
In your GitHub repository, navigate to **Settings > Secrets and variables > Actions > New repository secret** and add the following 4 secrets:

| Secret Name | Description | Example Value |
|---|---|---|
| `KEYSTORE_BASE64` | The entire contents of `keystore_base64.txt` | `MIIKOAIBAzCCC...` |
| `KEYSTORE_PASSWORD` | The password chosen when creating the keystore | `MySecurePass123` |
| `KEY_ALIAS` | The key alias provided during generation | `clapfinder` |
| `KEY_PASSWORD` | The private key password | `MySecurePass123` |

> 🔒 **Security Notice**: Passwords and private keys are never committed to git or exposed in build logs. The keystore is securely decoded into a temporary directory during CI execution and immediately purged.

---

### 3. Triggering the Workflow & Downloading `app-release.apk`

1. **Automatic**: Push any commit to `main`/`master` or push a release tag (e.g. `git tag v1.0.0 && git push origin v1.0.0`).
2. **Manual**: Go to your GitHub repository **Actions** tab > click **"Build Signed Production Release APK"** > click **Run workflow**.
3. **Download**: Once the workflow finishes (~2 minutes):
   - Click on the completed run.
   - Scroll to the **Artifacts** section at the bottom.
   - Click **`app-release-apk`** to download the signed production APK.

---

## 📱 Samsung Android Devices Compatibility & Knox / Play Protect

This application is built according to Android platform security standards:

1. **Signature Schemes**: Configured with **v1 (JAR)**, **v2 (APK Signature)**, **v3**, and **v4** signing enabled simultaneously in `app/build.gradle.kts`. This ensures clean validation by Google Play Protect and Samsung Knox without "Unrecognized Developer" or corrupt package errors.
2. **Lean Permissions**:
   - `android.permission.RECORD_AUDIO`: Only requested when the user taps "Start Protection".
   - `android.permission.FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MICROPHONE`: Meets modern Android 14+ (API 34/35) foreground service policy.
   - `android.permission.POST_NOTIFICATIONS`: Requested on Android 13+ to provide instant Stop control.
   - `android.permission.WAKE_LOCK`: Held only while protection is armed.
   - `android.permission.CAMERA`: Used exclusively for the LED torch flash strobe.
   - `android.permission.VIBRATE`: Waveform haptic pulses.
   - **Zero unnecessary permissions**: No internet, no location, no storage, no contacts.
3. **Samsung Battery Optimization**:
   On Samsung OneUI (Galaxy S, Z, A series):
   - Go to **Settings > Apps > Clap Finder > Battery**.
   - Select **Unrestricted (غير مقيد)** so Samsung's background app killer does not terminate the microphone foreground service during deep sleep.

---

## 🔨 Local Building with Gradle Wrapper

```bash
# Debug APK
./gradlew assembleDebug

# Signed Production Release APK (with environment variables)
KEYSTORE_FILE="/path/to/clapfinder-release.jks" \
KEYSTORE_PASSWORD="password" \
KEY_ALIAS="clapfinder" \
KEY_PASSWORD="password" \
./gradlew assembleRelease
```
