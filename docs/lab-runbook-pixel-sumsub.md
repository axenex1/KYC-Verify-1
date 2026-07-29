# Lab runbook — Pixel + Open Camera + Sumsub sandbox

Authorized red-team QA for **owned** KYC sandboxes only.

## Prerequisites

- Rooted **Pixel** with Magisk + **Zygisk enabled**
- Desktop stack: `pr/6-harness-inject-companion` (or merged) + `RUNWAYML_API_SECRET`
- Android: `pr/7-android-companion` + built Magisk module (`android/magisk-module/build-zygisk.ps1`)
- Sumsub sandbox credentials in Console Settings vault

## One-time device setup

```powershell
cd android/magisk-module
.\build-zygisk.ps1
.\package-magisk.ps1
# Flash kyc_virtcam-magisk.zip in Magisk → Reboot
adb shell cat /data/local/tmp/kyc_virtcam.log
# expect: zygisk lib present
```

```powershell
cd android
.\gradlew.bat :app:assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

## Operator flow

1. Desktop: `npm run dev:all`
2. Create engagement → Probe / Document Gen tab
3. Upload license → wait for face crop → **Generate camera feed** (persistent L/R/U/D + subtle end)
4. Confirm clip auto-arms (neon “Armed …” line)
5. USB: `npm run adb:reverse`
6. Open engagement **Pair** → scan QR in Companion
7. Companion: **Arm inject** (and desktop Push clip if needed)
8. Prove: **Open Camera** front lens shows synthetic looping face
9. Sumsub sandbox: start KYC in sandbox app; companion inject remains armed
10. Tap companion finding buttons (pass / fail / review / detected) → confirm desktop Signal / Findings

## Ports

| Port | Role |
|------|------|
| 3000 | Next console |
| 3001 | Sync WS + `/companion/clip` |

See [companion-protocol.md](./companion-protocol.md).

## Acceptance for this runbook

- [ ] Open Camera green with inject armed
- [ ] Disarm restores physical camera
- [ ] At least one Sumsub sandbox attempt with finding logged
- [ ] Audit JSON / findings visible in console

## Residual risks

- Apps not using MediaNDK `AImage` may ignore the Zygisk hook
- Session size must match ring (1280×720 Pixel baseline)
- Samsung/Xiaomi not in scope until Pixel row stays green
