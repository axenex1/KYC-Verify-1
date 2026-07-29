package dev.khaos.kycverify.virtcam

import android.media.Image
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import java.io.File
import java.nio.ByteBuffer
import kotlin.math.min

/**
 * Decodes an armed clip to NV21 frames and pushes them into the virtcam ring.
 */
class ClipLoopPlayer(
    private val ring: FrameRingWriter,
    private val targetWidth: Int,
    private val targetHeight: Int,
    private val fps: Int = 15,
) {
    private var thread: HandlerThread? = null
    private var handler: Handler? = null
    @Volatile private var running = false
    private var seamHider: LoopSeamHider? = null

    fun start(clipFile: File) {
        stop()
        if (!clipFile.exists()) {
            Log.e(TAG, "Clip missing: ${clipFile.absolutePath}")
            return
        }
        running = true
        thread = HandlerThread("ClipLoopPlayer").also { it.start() }
        handler = Handler(thread!!.looper)
        handler?.post { loopDecode(clipFile) }
    }

    fun stop() {
        running = false
        handler?.removeCallbacksAndMessages(null)
        thread?.quitSafely()
        thread = null
        handler = null
    }

    private fun loopDecode(clipFile: File) {
        while (running) {
            try {
                playOnce(clipFile)
                seamHider?.notifySeam()
            } catch (e: Exception) {
                Log.e(TAG, "clip decode failed", e)
                Thread.sleep(500)
            }
        }
    }

    private fun playOnce(clipFile: File) {
        val extractor = MediaExtractor()
        extractor.setDataSource(clipFile.absolutePath)
        var track = -1
        var format: MediaFormat? = null
        for (i in 0 until extractor.trackCount) {
            val f = extractor.getTrackFormat(i)
            val mime = f.getString(MediaFormat.KEY_MIME) ?: continue
            if (mime.startsWith("video/")) {
                track = i
                format = f
                break
            }
        }
        if (track < 0 || format == null) {
            extractor.release()
            throw IllegalStateException("No video track in clip")
        }

        val durationUs = if (format.containsKey(MediaFormat.KEY_DURATION)) {
            format.getLong(MediaFormat.KEY_DURATION)
        } else {
            0L
        }
        seamHider = LoopSeamHider((durationUs / 1000L).coerceAtLeast(1))
        val startUs = seamHider!!.nextLoopStartMs() * 1000L
        extractor.selectTrack(track)
        if (startUs > 0 && durationUs > startUs) {
            extractor.seekTo(startUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
        }

        val mime = format.getString(MediaFormat.KEY_MIME)!!
        val codec = MediaCodec.createDecoderByType(mime)
        // Prefer color format that we can convert; use surface-less byte buffer mode.
        codec.configure(format, null, null, 0)
        codec.start()

        val info = MediaCodec.BufferInfo()
        var inputDone = false
        var outputDone = false
        val frameIntervalMs = (1000L / fps).coerceAtLeast(1)
        var lastPush = 0L

        while (running && !outputDone) {
            if (!inputDone) {
                val inIndex = codec.dequeueInputBuffer(10_000)
                if (inIndex >= 0) {
                    val buf = codec.getInputBuffer(inIndex)!!
                    val sample = extractor.readSampleData(buf, 0)
                    if (sample < 0) {
                        codec.queueInputBuffer(
                            inIndex, 0, 0, 0L, MediaCodec.BUFFER_FLAG_END_OF_STREAM
                        )
                        inputDone = true
                    } else {
                        codec.queueInputBuffer(inIndex, 0, sample, extractor.sampleTime, 0)
                        extractor.advance()
                    }
                }
            }

            val outIndex = codec.dequeueOutputBuffer(info, 10_000)
            when {
                outIndex >= 0 -> {
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                        outputDone = true
                    }
                    val now = System.currentTimeMillis()
                    if (now - lastPush >= frameIntervalMs) {
                        val image = codec.getOutputImage(outIndex)
                        if (image != null) {
                            val nv21 = yuv420ToNv21(image, targetWidth, targetHeight)
                            ring.writeNv21(targetWidth, targetHeight, nv21)
                            image.close()
                        }
                        lastPush = now
                    }
                    codec.releaseOutputBuffer(outIndex, false)
                }
            }
        }

        codec.stop()
        codec.release()
        extractor.release()
    }

    companion object {
        private const val TAG = "ClipLoopPlayer"

        fun yuv420ToNv21(image: Image, outW: Int, outH: Int): ByteArray {
            val width = image.width
            val height = image.height
            val ySize = outW * outH
            val nv21 = ByteArray(ySize + ySize / 2)

            val yPlane = image.planes[0]
            val uPlane = image.planes[1]
            val vPlane = image.planes[2]
            val yBuf = yPlane.buffer
            val uBuf = uPlane.buffer
            val vBuf = vPlane.buffer
            val yRowStride = yPlane.rowStride
            val yPixStride = yPlane.pixelStride
            val uRowStride = uPlane.rowStride
            val uPixStride = uPlane.pixelStride
            val vRowStride = vPlane.rowStride
            val vPixStride = vPlane.pixelStride

            var out = 0
            for (row in 0 until outH) {
                val srcRow = (row * height) / outH
                for (col in 0 until outW) {
                    val srcCol = (col * width) / outW
                    val yIndex = srcRow * yRowStride + srcCol * yPixStride
                    nv21[out++] = yBuf.get(min(yIndex, yBuf.limit() - 1))
                }
            }

            var uv = ySize
            for (row in 0 until outH / 2) {
                val srcRow = (row * height) / outH
                for (col in 0 until outW / 2) {
                    val srcCol = (col * width) / outW
                    val vIndex = srcRow * vRowStride + srcCol * vPixStride
                    val uIndex = srcRow * uRowStride + srcCol * uPixStride
                    nv21[uv++] = vBuf.get(min(vIndex, vBuf.limit() - 1))
                    nv21[uv++] = uBuf.get(min(uIndex, uBuf.limit() - 1))
                }
            }
            return nv21
        }

        fun i420LikeToNv21(
            y: ByteBuffer,
            u: ByteBuffer,
            v: ByteBuffer,
            width: Int,
            height: Int,
        ): ByteArray {
            val ySize = width * height
            val out = ByteArray(ySize + ySize / 2)
            y.get(out, 0, min(y.remaining(), ySize))
            var i = ySize
            val chroma = ySize / 4
            val vArr = ByteArray(min(v.remaining(), chroma))
            val uArr = ByteArray(min(u.remaining(), chroma))
            v.get(vArr)
            u.get(uArr)
            for (n in 0 until chroma) {
                out[i++] = vArr.getOrElse(n) { 0 }
                out[i++] = uArr.getOrElse(n) { 0 }
            }
            return out
        }
    }
}
