#include <jni.h>
#include <android/log.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
#include <cstring>

#define LOG_TAG "KycVirtCamShim"
#define ALOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define ALOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

/**
 * Shared-memory style frame ring used by Magisk Camera2 hooks.
 * Layout (little-endian):
 *   uint32 magic = 0x4B594356 ('KYCV')
 *   uint32 width
 *   uint32 height
 *   uint32 stride
 *   uint32 format  (0 = NV21)
 *   uint32 seq
 *   uint64 timestampNs
 *   uint8  pixels[width * height * 3 / 2]
 */
static constexpr uint32_t kMagic = 0x4B594356u;

extern "C"
JNIEXPORT jboolean JNICALL
Java_dev_khaos_kycverify_virtcam_FrameRingWriter_nativeWriteFrame(
        JNIEnv *env,
        jobject /* thiz */,
        jstring path,
        jint width,
        jint height,
        jint stride,
        jint format,
        jlong timestampNs,
        jbyteArray nv21) {
    const char *cpath = env->GetStringUTFChars(path, nullptr);
    if (!cpath) return JNI_FALSE;

    jsize len = env->GetArrayLength(nv21);
    jbyte *bytes = env->GetByteArrayElements(nv21, nullptr);
    if (!bytes) {
        env->ReleaseStringUTFChars(path, cpath);
        return JNI_FALSE;
    }

    const size_t header = 32;
    const size_t total = header + static_cast<size_t>(len);
    int fd = open(cpath, O_CREAT | O_WRONLY | O_TRUNC, 0666);
    if (fd < 0) {
        ALOGE("open failed %s", cpath);
        env->ReleaseByteArrayElements(nv21, bytes, JNI_ABORT);
        env->ReleaseStringUTFChars(path, cpath);
        return JNI_FALSE;
    }

    uint8_t hdr[32];
    memset(hdr, 0, sizeof(hdr));
    memcpy(hdr + 0, &kMagic, 4);
    uint32_t w = static_cast<uint32_t>(width);
    uint32_t h = static_cast<uint32_t>(height);
    uint32_t s = static_cast<uint32_t>(stride);
    uint32_t f = static_cast<uint32_t>(format);
    static uint32_t seq = 0;
    uint32_t sequence = ++seq;
    uint64_t ts = static_cast<uint64_t>(timestampNs);
    memcpy(hdr + 4, &w, 4);
    memcpy(hdr + 8, &h, 4);
    memcpy(hdr + 12, &s, 4);
    memcpy(hdr + 16, &f, 4);
    memcpy(hdr + 20, &sequence, 4);
    memcpy(hdr + 24, &ts, 8);

    bool ok = write(fd, hdr, sizeof(hdr)) == (ssize_t) sizeof(hdr)
              && write(fd, bytes, len) == len;
    close(fd);

    env->ReleaseByteArrayElements(nv21, bytes, JNI_ABORT);
    env->ReleaseStringUTFChars(path, cpath);
    (void) total;
    return ok ? JNI_TRUE : JNI_FALSE;
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_dev_khaos_kycverify_virtcam_FrameRingWriter_nativeWriteArmedFlag(
        JNIEnv *env,
        jobject /* thiz */,
        jstring path,
        jboolean armed) {
    const char *cpath = env->GetStringUTFChars(path, nullptr);
    if (!cpath) return JNI_FALSE;
    int fd = open(cpath, O_CREAT | O_WRONLY | O_TRUNC, 0666);
    if (fd < 0) {
        env->ReleaseStringUTFChars(path, cpath);
        return JNI_FALSE;
    }
    char flag = armed ? '1' : '0';
    bool ok = write(fd, &flag, 1) == 1;
    close(fd);
    env->ReleaseStringUTFChars(path, cpath);
    return ok ? JNI_TRUE : JNI_FALSE;
}
