# OEM lab matrix — Phase C fidelity notes
#
# Record findings from companion report buttons (pass/fail/review/detected).

| OEM family | Lab baseline | CameraCharacteristics | Magisk Camera2 hook | IMU spoof | Notes |
|------------|--------------|----------------------|---------------------|-----------|-------|
| Pixel (Google) | Primary | Match `CameraCharacteristicsProfile.pixelBaseline()` | Most reliable ImageReader path | Works with zygisk sensor hook | Start here |
| Samsung | Secondary | Wider sensor; may ignore HAL spoof | Needs Samsung-specific zygisk | Often uses fused sensors | Document detection as finding |
| Xiaomi / Redmi | Secondary | MIUI HAL quirks | Verify ImageReader vs CameraX vendor path | Variable | Prefer AOSP-based builds for labs |
| Generic AOSP | Dev | Use pixelBaseline | Placeholder `.so` sufficient for Open Camera tests | File-based IMU path | CI / emulator limited |

## Detection signals to log

- Wrong focal length / sensor size vs device model
- Perfect loop periodicity (mitigated by `LoopSeamHider`)
- Missing accelerometer motion during head-turn prompts
- MediaProjection / overlay artifacts (avoid — use virtcam)
- App-private camera APIs that bypass hooks
