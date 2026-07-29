package dev.khaos.kycverify.virtcam

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import java.io.File

/**
 * Foreground service that arms/disarms virtual camera injection.
 * Prefer local clip loop; WebRTC frames can be pushed via [pushNv21Frame].
 */
class VirtualCamService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private lateinit var ring: FrameRingWriter
    private var player: ClipLoopPlayer? = null
    private var imu: ImuBehavioralSync? = null
    private var profile: CameraCharacteristicsProfile = CameraCharacteristicsProfile.pixelBaseline()
    @Volatile private var armed = false

    override fun onCreate() {
        super.onCreate()
        ring = ensureWritableRing()
        imu = ImuBehavioralSync(this).also { it.startListening() }
        profile = CameraCharacteristicsProfile.fromDeviceHints(
            Build.MANUFACTURER,
            Build.MODEL,
        )
        MagiskHookBridge.writeProfile(profile)
        ensureChannel()
        startForeground(NOTIF_ID, buildNotification(armed = false))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_ARM -> {
                val path = intent.getStringExtra(EXTRA_CLIP_PATH)
                arm(path)
            }
            ACTION_DISARM -> disarm()
            ACTION_IMU_SPOOF_START -> {
                val yaw = intent.getFloatExtra(EXTRA_YAW, 15f)
                val pitch = intent.getFloatExtra(EXTRA_PITCH, 8f)
                imu?.startSpoof(scope, yaw, pitch)
            }
            ACTION_IMU_SPOOF_STOP -> imu?.stopSpoof()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = LocalBinder()

    override fun onDestroy() {
        disarm()
        imu?.stopListening()
        scope.cancel()
        super.onDestroy()
    }

    fun isArmed(): Boolean = armed

    fun currentProfile(): CameraCharacteristicsProfile = profile

    fun pushNv21Frame(width: Int, height: Int, nv21: ByteArray) {
        if (!armed) return
        ring.writeNv21(width, height, nv21)
    }

    private fun arm(clipPath: String?) {
        armed = true
        // Prefer world-readable Magisk path; fall back to app files if write fails.
        val writableRing = ensureWritableRing()
        ring = writableRing
        ring.setArmed(true)
        MagiskHookBridge.writeProfile(profile)
        player?.stop()
        if (!clipPath.isNullOrBlank()) {
            val file = File(clipPath)
            player = ClipLoopPlayer(
                ring,
                profile.activeArrayWidth,
                profile.activeArrayHeight,
                fps = 15,
            ).also { it.start(file) }
        }
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, buildNotification(armed = true))
        Log.i(TAG, "Virtual cam ARMED clip=$clipPath hook=${MagiskHookBridge.isHookPresent()}")
    }

    private fun ensureWritableRing(): FrameRingWriter {
        val primary = FrameRingWriter(
            FrameRingWriter.DEFAULT_FRAME_PATH,
            FrameRingWriter.DEFAULT_ARMED_PATH,
        )
        val probe = ByteArray(6) // 2x2 NV21
        if (primary.writeNv21(2, 2, probe)) {
            return primary
        }
        val dir = File(filesDir, "virtcam").also { it.mkdirs() }
        val fallback = FrameRingWriter(
            File(dir, "frame.bin").absolutePath,
            File(dir, "armed.txt").absolutePath,
        )
        Log.w(TAG, "Using app-private virtcam paths; Magisk hook must read ${dir.absolutePath}")
        return fallback
    }

    private fun disarm() {
        armed = false
        ring.setArmed(false)
        player?.stop()
        player = null
        imu?.stopSpoof()
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, buildNotification(armed = false))
        Log.i(TAG, "Virtual cam DISARMED")
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "KYC VirtCam",
            NotificationManager.IMPORTANCE_LOW,
        )
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(channel)
    }

    private fun buildNotification(armed: Boolean): Notification {
        val text = if (armed) "Inject armed (lab)" else "Inject idle"
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("KYC Companion VirtCam")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    inner class LocalBinder : android.os.Binder() {
        fun service(): VirtualCamService = this@VirtualCamService
    }

    companion object {
        private const val TAG = "VirtualCamService"
        const val CHANNEL_ID = "kyc_virtcam"
        const val NOTIF_ID = 42

        const val ACTION_ARM = "dev.khaos.kycverify.virtcam.ARM"
        const val ACTION_DISARM = "dev.khaos.kycverify.virtcam.DISARM"
        const val ACTION_IMU_SPOOF_START = "dev.khaos.kycverify.virtcam.IMU_START"
        const val ACTION_IMU_SPOOF_STOP = "dev.khaos.kycverify.virtcam.IMU_STOP"
        const val EXTRA_CLIP_PATH = "clip_path"
        const val EXTRA_YAW = "yaw"
        const val EXTRA_PITCH = "pitch"

        fun armIntent(context: Context, clipPath: String?): Intent =
            Intent(context, VirtualCamService::class.java).apply {
                action = ACTION_ARM
                putExtra(EXTRA_CLIP_PATH, clipPath)
            }

        fun disarmIntent(context: Context): Intent =
            Intent(context, VirtualCamService::class.java).apply {
                action = ACTION_DISARM
            }
    }
}
