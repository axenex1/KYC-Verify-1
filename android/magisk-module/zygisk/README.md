# KYC VirtCam Zygisk Camera2 interceptor (lab devices)

This folder is where the OEM-specific Zygisk `.so` that hooks Camera2
`ImageReader` / HAL buffer dequeue should live:

- `arm64-v8a.so`
- `armeabi-v7a.so` (optional)

## Frame contract

When `/data/local/tmp/kyc_virtcam.armed` contains `1`, replace front-camera
NV21 (or convert to the stream's requested format) using the ring file:

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

Also read:

- `/data/local/tmp/kyc_virtcam.profile` — key=value CameraCharacteristics spoof
- `/data/local/tmp/kyc_virtcam.imu` — `ax,ay,az,timestampNs` for sensor spoof
- `/data/local/tmp/kyc_virtcam.seam` — loop seam offset hint (ms)

## Lab install

1. Zip `android/magisk-module` (module.prop at zip root) and flash in Magisk.
2. Reboot, confirm `/data/local/tmp/kyc_virtcam.hook` exists.
3. Install companion APK, pair, Arm inject, open Open Camera — synthetic feed.

Without a real Zygisk interceptor binary, the companion still pairs and writes
frames; third-party apps will not see them until the hook `.so` is provided for
the lab OEM.
