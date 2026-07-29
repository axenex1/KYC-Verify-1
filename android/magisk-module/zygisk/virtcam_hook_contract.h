/**
 * Shared Camera2 / MediaNDK interceptor contract for lab Zygisk builds.
 *
 * Implemented in src/frame_ring.cpp; loaded via zygisk/arm64-v8a.so.
 *
 * Hook points:
 * 1. AImage_getPlaneData (MediaNDK) — replace Y/UV when armed
 * 2. (Plan B) CameraCharacteristics overlays from kyc_virtcam.profile
 * 3. (Plan B) SensorEventQueue — optional IMU from kyc_virtcam.imu
 */

#pragma once

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

int kyc_virtcam_should_replace_front_camera(void);
int kyc_virtcam_copy_nv21(uint8_t *dst, uint32_t dst_capacity,
                          uint32_t *out_w, uint32_t *out_h);
int kyc_virtcam_read_profile_value(const char *key, char *out, uint32_t out_len);

#ifdef __cplusplus
}
#endif
