package dev.khaos.kycverify.virtcam

import android.util.Log
import java.io.File

/**
 * Bridge to Magisk Camera2 / sensor hooks.
 * Writes control files under /data/local/tmp that zygisk modules poll.
 */
object MagiskHookBridge {
    private const val TAG = "MagiskHookBridge"

    const val FRAME_PATH = FrameRingWriter.DEFAULT_FRAME_PATH
    const val ARMED_PATH = FrameRingWriter.DEFAULT_ARMED_PATH
    const val PROFILE_PATH = "/data/local/tmp/kyc_virtcam.profile"
    const val IMU_PATH = "/data/local/tmp/kyc_virtcam.imu"
    const val SEAM_PATH = "/data/local/tmp/kyc_virtcam.seam"

    fun writeProfile(profile: CameraCharacteristicsProfile) {
        runCatching {
            File(PROFILE_PATH).writeText(
                profile.toSignalMap().entries.joinToString("\n") { "${it.key}=${it.value}" }
            )
        }.onFailure { Log.w(TAG, "writeProfile failed", it) }
    }

    fun writeImuSample(ax: Float, ay: Float, az: Float) {
        runCatching {
            File(IMU_PATH).writeText("$ax,$ay,$az,${System.nanoTime()}")
        }
    }

    fun writeSeamOffsetMs(offsetMs: Long) {
        runCatching {
            File(SEAM_PATH).writeText(offsetMs.toString())
        }
    }

    fun isHookPresent(): Boolean {
        // Magisk module drops a marker after install.
        return File("/data/adb/modules/kyc_virtcam/module.prop").exists() ||
            File("/data/local/tmp/kyc_virtcam.hook").exists()
    }
}
