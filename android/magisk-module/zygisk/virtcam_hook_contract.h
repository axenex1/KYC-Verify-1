/**
 * Reference Camera2 ImageReader interceptor contract for lab Zygisk builds.
 *
 * This is documentation + a non-linked stub. Drop a real .so into
 * android/magisk-module/zygisk/arm64-v8a.so for production lab devices.
 *
 * Hook points (conceptual):
 * 1. CameraDevice.createCaptureSession — detect FRONT lens
 * 2. ImageReader.acquireLatestImage — replace YUV/NV21 planes from
 *    /data/local/tmp/kyc_virtcam.frame when armed file is "1"
 * 3. CameraCharacteristics getters — overlay values from
 *    /data/local/tmp/kyc_virtcam.profile
 * 4. SensorEventQueue — optional IMU from /data/local/tmp/kyc_virtcam.imu
 */

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
  uint32_t magic;      /* 0x4B594356 */
  uint32_t width;
  uint32_t height;
  uint32_t stride;
  uint32_t format;     /* 0 = NV21 */
  uint32_t seq;
  uint64_t timestamp_ns;
} KycVirtCamHeader;

/* Implemented by OEM-specific zygisk binary (not shipped as source here). */
int kyc_virtcam_should_replace_front_camera(void);
int kyc_virtcam_copy_nv21(uint8_t *dst, uint32_t dst_capacity,
                          uint32_t *out_w, uint32_t *out_h);

#ifdef __cplusplus
}
#endif
