# Android KYC Companion

Lab-only native companion for [KYC_BREACH//CONSOLE](../README.md).

## Modules

| Module | Purpose |
|--------|---------|
| `app` | Compose UI — QR pair, inject arm/disarm, findings |
| `protocol` | Sync message codecs + constants |
| `sync` | OkHttp WebSocket + companion HTTP |
| `webrtc` | Dual PeerConnection manager |
| `virtcam` | VirtualCamService, clip loop, IMU spoof, frame ring |
| `magisk-module` | Magisk Camera2 hook package (lab root) |

## Build

```bash
cd android
./gradlew :app:assembleDebug
# Windows: gradlew.bat :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Requires Android SDK 34 + JDK 17.

```powershell
# Once: fetch Gradle wrapper jar
powershell -File ../scripts/fetch-gradle-wrapper.ps1
```

### Magisk Zygisk virtcam (Plan A)

```powershell
cd android/magisk-module
.\build-zygisk.ps1      # needs ANDROID_NDK_HOME
.\package-magisk.ps1    # → kyc_virtcam-magisk.zip
```

Flash zip in Magisk (Zygisk on) → reboot → see `android/magisk-module/zygisk/README.md`.

## Operator flow

1. Desktop: `npm run dev:all` then open Companion Pair for an engagement.
2. USB: `npm run adb:reverse`
3. Phone: open KYC Companion → scan QR (or paste session/token/`ws://127.0.0.1:3001/sync`).
4. Confirm desktop receives phone camera; phone receives synthetic stream.
5. Arm avatar clip on desktop Document Gen → **Arm inject** on companion.
6. Rooted lab: Magisk module installed → open vendor KYC / Open Camera.

## OEM matrix (Phase C)

| OEM | Notes |
|-----|-------|
| Pixel | Baseline lab device; Camera2 hooks most reliable |
| Samsung | May use proprietary camera pipeline; hook may need OEM-specific zygisk |
| Xiaomi | MIUI camera HAL quirks; verify ImageReader path |

Record pass/fail/review/detected from the companion finding buttons into the console.
