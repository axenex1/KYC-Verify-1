# OEM lab matrix — fidelity notes (Plan B)

Record findings from companion report buttons (pass/fail/review/detected).

| OEM family | Lab baseline | CameraCharacteristics | Magisk MediaNDK hook | IMU spoof | Status |
|------------|--------------|----------------------|----------------------|-----------|--------|
| Pixel (Google) | Primary | `pixelBaseline()` 1280x720 NV21 | `AImage_getPlaneData` PLT hook | Auto on Arm inject via `ImuBehavioralSync` | Build with `build-zygisk.ps1`; prove Open Camera |
| Samsung | Secondary | Wider sensor profile in `fromDeviceHints` | May bypass MediaNDK — proprietary path | Fused sensors | Spike only after Pixel green |
| Xiaomi / Redmi | Secondary | MIUI HAL quirks | Verify CameraX / ImageReader path | Variable | Spike only after Pixel green |
| Generic AOSP | Dev | Use pixelBaseline | Same `.so` | File-based IMU path | Emulator limited |

## Pixel prove checklist

1. Flash Magisk module (`kyc_virtcam-magisk.zip`), Zygisk on, reboot.
2. `adb shell cat /data/local/tmp/kyc_virtcam.log` → `zygisk lib present`.
3. Arm inject from Companion with 1280x720 clip (profile default).
4. Open Camera front preview = synthetic face; disarm restores physical.
5. While armed: `kyc_virtcam.imu` and `kyc_virtcam.seam` update.

## Detection signals to log

- Wrong focal length / sensor size vs device model
- Perfect loop periodicity (mitigated by `LoopSeamHider` + seam file)
- Missing accelerometer motion during head-turn prompts
- MediaProjection / overlay artifacts (avoid — use virtcam)
- App-private camera APIs that bypass MediaNDK hooks
