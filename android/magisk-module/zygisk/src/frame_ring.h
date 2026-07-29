#pragma once

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
  uint32_t magic;
  uint32_t width;
  uint32_t height;
  uint32_t stride;
  uint32_t format;
  uint32_t seq;
  uint64_t timestamp_ns;
} KycVirtCamHeader;

enum { KYC_VIRTCAM_MAGIC = 0x4B594356u, KYC_VIRTCAM_FORMAT_NV21 = 0 };

/** True when armed file is "1" and frame header magic is KYCV. */
int kyc_virtcam_should_replace_front_camera(void);

/**
 * Copy latest NV21 payload into dst.
 * Returns 1 on success, 0 on miss/invalid. Writes out_w/out_h when non-null.
 */
int kyc_virtcam_copy_nv21(uint8_t *dst, uint32_t dst_capacity, uint32_t *out_w,
                          uint32_t *out_h);

/** Read optional profile key=value overlay (Plan B). Returns 1 if file exists. */
int kyc_virtcam_read_profile_value(const char *key, char *out, uint32_t out_len);

#ifdef __cplusplus
}
#endif
