#include "frame_ring.h"

#include <fcntl.h>
#include <unistd.h>

#include <cstdio>
#include <cstring>

namespace {

constexpr const char *kFramePath = "/data/local/tmp/kyc_virtcam.frame";
constexpr const char *kArmedPath = "/data/local/tmp/kyc_virtcam.armed";
constexpr const char *kProfilePath = "/data/local/tmp/kyc_virtcam.profile";
constexpr size_t kHeaderSize = 32;

bool read_file(const char *path, void *buf, size_t len) {
  int fd = open(path, O_RDONLY | O_CLOEXEC);
  if (fd < 0) return false;
  ssize_t n = read(fd, buf, len);
  close(fd);
  return n == static_cast<ssize_t>(len);
}

bool read_armed() {
  char c = '0';
  int fd = open(kArmedPath, O_RDONLY | O_CLOEXEC);
  if (fd < 0) return false;
  (void)read(fd, &c, 1);
  close(fd);
  return c == '1';
}

bool read_header(KycVirtCamHeader *hdr) {
  uint8_t raw[kHeaderSize];
  if (!read_file(kFramePath, raw, kHeaderSize)) return false;
  memcpy(&hdr->magic, raw + 0, 4);
  memcpy(&hdr->width, raw + 4, 4);
  memcpy(&hdr->height, raw + 8, 4);
  memcpy(&hdr->stride, raw + 12, 4);
  memcpy(&hdr->format, raw + 16, 4);
  memcpy(&hdr->seq, raw + 20, 4);
  memcpy(&hdr->timestamp_ns, raw + 24, 8);
  return hdr->magic == KYC_VIRTCAM_MAGIC && hdr->format == KYC_VIRTCAM_FORMAT_NV21 &&
         hdr->width > 0 && hdr->height > 0 && hdr->width <= 4096 &&
         hdr->height <= 4096;
}

}  // namespace

extern "C" int kyc_virtcam_should_replace_front_camera(void) {
  if (!read_armed()) return 0;
  KycVirtCamHeader hdr{};
  return read_header(&hdr) ? 1 : 0;
}

extern "C" int kyc_virtcam_copy_nv21(uint8_t *dst, uint32_t dst_capacity,
                                     uint32_t *out_w, uint32_t *out_h) {
  if (!dst || dst_capacity == 0) return 0;
  if (!read_armed()) return 0;

  KycVirtCamHeader hdr{};
  if (!read_header(&hdr)) return 0;

  const uint32_t need = hdr.width * hdr.height * 3 / 2;
  if (need == 0 || need > dst_capacity) return 0;

  int fd = open(kFramePath, O_RDONLY | O_CLOEXEC);
  if (fd < 0) return 0;
  if (lseek(fd, static_cast<off_t>(kHeaderSize), SEEK_SET) < 0) {
    close(fd);
    return 0;
  }
  ssize_t n = read(fd, dst, need);
  close(fd);
  if (n != static_cast<ssize_t>(need)) return 0;

  if (out_w) *out_w = hdr.width;
  if (out_h) *out_h = hdr.height;
  return 1;
}

extern "C" int kyc_virtcam_read_profile_value(const char *key, char *out,
                                              uint32_t out_len) {
  if (!key || !out || out_len == 0) return 0;
  out[0] = '\0';
  FILE *f = fopen(kProfilePath, "r");
  if (!f) return 0;
  char line[256];
  int found = 0;
  while (fgets(line, sizeof(line), f)) {
    char *eq = strchr(line, '=');
    if (!eq) continue;
    *eq = '\0';
    if (strcmp(line, key) != 0) continue;
    char *val = eq + 1;
    size_t len = strcspn(val, "\r\n");
    if (len >= out_len) len = out_len - 1;
    memcpy(out, val, len);
    out[len] = '\0';
    found = 1;
    break;
  }
  fclose(f);
  return found;
}
