/**
 * KYC VirtCam Zygisk module — lab MediaNDK Image plane replace.
 * Authorized lab use on owned devices / sandboxes only.
 */

#include "frame_ring.h"
#include "zygisk.hpp"

#include <android/log.h>
#include <dlfcn.h>
#include <media/NdkImage.h>

#include <cstring>

#define LOG_TAG "KycVirtCamZygisk"
#define ALOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define ALOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)

namespace {

using AImage_getPlaneData_t = media_status_t (*)(const AImage *, int,
                                                 uint8_t **, int *);
using AImage_getWidth_t = media_status_t (*)(const AImage *, int32_t *);
using AImage_getHeight_t = media_status_t (*)(const AImage *, int32_t *);
using AImage_getNumberOfPlanes_t = media_status_t (*)(const AImage *,
                                                      int32_t *);

AImage_getPlaneData_t orig_getPlaneData = nullptr;
AImage_getWidth_t fn_getWidth = nullptr;
AImage_getHeight_t fn_getHeight = nullptr;
AImage_getNumberOfPlanes_t fn_getPlanes = nullptr;

zygisk::internal::api_table *g_table = nullptr;
thread_local bool g_in_hook = false;

void resolve_helpers() {
  void *h = dlopen("libmediandk.so", RTLD_NOW);
  if (!h) return;
  fn_getWidth =
      reinterpret_cast<AImage_getWidth_t>(dlsym(h, "AImage_getWidth"));
  fn_getHeight =
      reinterpret_cast<AImage_getHeight_t>(dlsym(h, "AImage_getHeight"));
  fn_getPlanes = reinterpret_cast<AImage_getNumberOfPlanes_t>(
      dlsym(h, "AImage_getNumberOfPlanes"));
}

void fill_nv21_into_planes(const AImage *image, const uint8_t *nv21,
                           uint32_t src_w, uint32_t src_h) {
  if (!fn_getWidth || !fn_getHeight || !fn_getPlanes || !orig_getPlaneData)
    return;

  int32_t w = 0, h = 0, planes = 0;
  if (fn_getWidth(image, &w) != AMEDIA_OK) return;
  if (fn_getHeight(image, &h) != AMEDIA_OK) return;
  if (fn_getPlanes(image, &planes) != AMEDIA_OK) return;
  if (w <= 0 || h <= 0) return;
  if (static_cast<uint32_t>(w) != src_w || static_cast<uint32_t>(h) != src_h)
    return;

  const size_t y_size = static_cast<size_t>(w) * static_cast<size_t>(h);
  const size_t uv_size = y_size / 2;

  uint8_t *p0 = nullptr;
  int l0 = 0;
  if (orig_getPlaneData(image, 0, &p0, &l0) != AMEDIA_OK || !p0 || l0 <= 0)
    return;
  memcpy(p0, nv21,
         y_size < static_cast<size_t>(l0) ? y_size : static_cast<size_t>(l0));

  if (planes >= 2) {
    uint8_t *p1 = nullptr;
    int l1 = 0;
    if (orig_getPlaneData(image, 1, &p1, &l1) == AMEDIA_OK && p1 && l1 > 0) {
      memcpy(p1, nv21 + y_size,
             uv_size < static_cast<size_t>(l1) ? uv_size
                                               : static_cast<size_t>(l1));
    }
  }
}

media_status_t hooked_getPlaneData(const AImage *image, int planeIdx,
                                   uint8_t **data, int *dataLength) {
  media_status_t st =
      orig_getPlaneData ? orig_getPlaneData(image, planeIdx, data, dataLength)
                        : AMEDIA_ERROR_UNKNOWN;
  if (g_in_hook || st != AMEDIA_OK || planeIdx != 0) return st;
  if (!kyc_virtcam_should_replace_front_camera()) return st;

  g_in_hook = true;
  static thread_local uint8_t buf[1920 * 1080 * 3 / 2];
  uint32_t sw = 0, sh = 0;
  if (kyc_virtcam_copy_nv21(buf, sizeof(buf), &sw, &sh)) {
    fill_nv21_into_planes(image, buf, sw, sh);
  }
  g_in_hook = false;
  return st;
}

}  // namespace

class KycVirtCamModule : public zygisk::ModuleBase {
 public:
  void onLoad(void *api, JNIEnv *) override {
    g_table = reinterpret_cast<zygisk::internal::api_table *>(api);
    ALOGI("KycVirtCam Zygisk module onLoad");
  }

  void preAppSpecialize(zygisk::AppSpecializeArgs *) override {
    if (!g_table || !g_table->pltHookRegister || !g_table->pltHookCommit) {
      ALOGW("Zygisk PLT hooks unavailable");
      return;
    }
    g_table->pltHookRegister(".*libmediandk\\.so$", "AImage_getPlaneData",
                             reinterpret_cast<void *>(hooked_getPlaneData),
                             reinterpret_cast<void **>(&orig_getPlaneData));
    if (!g_table->pltHookCommit()) {
      ALOGW("pltHookCommit failed");
    }
  }

  void postAppSpecialize(const zygisk::AppSpecializeArgs *) override {
    resolve_helpers();
    if (orig_getPlaneData) {
      ALOGI("AImage_getPlaneData hooked — KYCV replace active when armed");
    } else {
      ALOGW("Hook inactive — ensure Magisk Zygisk is enabled");
    }
  }
};

REGISTER_ZYGISK_MODULE(KycVirtCamModule)
