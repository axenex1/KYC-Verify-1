# KYC VirtCam Zygisk Camera2 interceptor (lab)

Lab-only Magisk Zygisk module that replaces **MediaNDK `AImage` plane data** with NV21 frames from the Companion frame ring when inject is armed.

## Build (requires Android NDK)

```powershell
cd android/magisk-module
.\build-zygisk.ps1    # writes zygisk/arm64-v8a.so
.\package-magisk.ps1  # writes kyc_virtcam-magisk.zip
```

Set `ANDROID_NDK_HOME` if the NDK is not under `%LOCALAPPDATA%\Android\Sdk\ndk`.

## Frame contract

When `/data/local/tmp/kyc_virtcam.armed` contains `1`, replace ImageReader planes using:

```
offset  size  field
0       4     magic 0x4B594356 ('KYCV')
4       4     width
8       4     height
12      4     stride
16      4     format (0 = NV21)
20      4     seq
24      8     timestampNs
32      N     payload (width*height*3/2 for NV21)
```

Also readable (Plan B):

- `/data/local/tmp/kyc_virtcam.profile` — key=value CameraCharacteristics spoof
- `/data/local/tmp/kyc_virtcam.imu` — `ax,ay,az,timestampNs`
- `/data/local/tmp/kyc_virtcam.seam` — loop seam offset hint (ms)

**Dimension rule:** replacement only applies when the camera session size matches the ring width/height (avoids crashes). Companion `ClipLoopPlayer` must output the same size Open Camera requests (see Pixel baseline profile).

## Lab install (Pixel)

1. Enable **Zygisk** in Magisk settings.
2. Flash `kyc_virtcam-magisk.zip` → reboot.
3. Confirm:
   - `/data/local/tmp/kyc_virtcam.hook` exists
   - `/data/local/tmp/kyc_virtcam.log` contains `zygisk lib present`
4. Desktop: Document Gen → Generate camera feed → Arm → `npm run adb:reverse` → Pair.
5. Companion: **Arm inject**.
6. Open **Open Camera**, front lens — preview should show the looping synthetic face.
7. Disarm inject — physical camera should return (reopen camera if session cached).

## Hook point

- PLT hook: `libmediandk.so` → `AImage_getPlaneData`
- On plane 0 fetch, if armed + valid KYCV header, overwrite Y (+ UV plane 1) from the ring

Apps that never use MediaNDK `AImage` (pure Java `Image` / proprietary HAL) may not be affected — Plan B/C document OEM gaps.

## Source

| Path | Role |
|------|------|
| `src/frame_ring.cpp` | KYCV read + armed gate |
| `src/module.cpp` | Zygisk entry + PLT hook |
| `include/zygisk.hpp` | Magisk Zygisk register ABI |
| `virtcam_hook_contract.h` | Shared C contract header |
