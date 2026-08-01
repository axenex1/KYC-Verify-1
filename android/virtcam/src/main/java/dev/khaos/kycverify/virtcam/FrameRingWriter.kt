package dev.khaos.kycverify.virtcam

import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Writes NV21 frames to a path consumed by the Magisk Camera2 hook.
 * Header layout matches android/magisk-module and the former JNI shim.
 */
class FrameRingWriter(
    private val framePath: String,
    private val armedPath: String,
) {
    fun setArmed(armed: Boolean) {
        runCatching {
            File(armedPath).writeText(if (armed) "1" else "0")
        }
    }

    fun writeNv21(
        width: Int,
        height: Int,
        nv21: ByteArray,
        timestampNs: Long = System.nanoTime(),
    ): Boolean {
        return runCatching {
            val header = ByteBuffer.allocate(32).order(ByteOrder.LITTLE_ENDIAN)
            header.putInt(MAGIC)
            header.putInt(width)
            header.putInt(height)
            header.putInt(width) // stride
            header.putInt(FORMAT_NV21)
            header.putInt(++sequence)
            header.putLong(timestampNs)
            val out = File(framePath)
            out.parentFile?.mkdirs()
            out.outputStream().use { stream ->
                stream.write(header.array())
                stream.write(nv21)
            }
            true
        }.getOrDefault(false)
    }

    companion object {
        const val FORMAT_NV21 = 0
        private const val MAGIC = 0x4B594356
        @Volatile private var sequence = 0

        const val DEFAULT_FRAME_PATH = "/data/local/tmp/kyc_virtcam.frame"
        const val DEFAULT_ARMED_PATH = "/data/local/tmp/kyc_virtcam.armed"
    }
}
