package dev.khaos.kycverify.virtcam

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.sin

/**
 * Correlates synthetic IMU motion with liveness head-tilt prompts.
 * On rooted lab devices a Magisk sensor hook can consume [latestSample];
 * without the hook this still logs expected motion for findings.
 */
class ImuBehavioralSync(context: Context) : SensorEventListener {
    data class Sample(
        val ax: Float,
        val ay: Float,
        val az: Float,
        val timestampNs: Long,
        val synthetic: Boolean,
    )

    private val sensorManager =
        context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    @Volatile
    var latestSample: Sample? = null
        private set

    @Volatile
    var spoofEnabled: Boolean = false

    private var spoofJob: Job? = null
    private var yawAmplitudeDeg: Float = 15f
    private var pitchAmplitudeDeg: Float = 8f
    private var periodMs: Long = 2000

    fun startListening() {
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
    }

    fun stopListening() {
        sensorManager.unregisterListener(this)
        stopSpoof()
    }

    fun startSpoof(
        scope: CoroutineScope,
        yawDeg: Float = 15f,
        pitchDeg: Float = 8f,
        periodMs: Long = 2000,
    ) {
        this.yawAmplitudeDeg = yawDeg
        this.pitchAmplitudeDeg = pitchDeg
        this.periodMs = periodMs
        spoofEnabled = true
        spoofJob?.cancel()
        spoofJob = scope.launch(Dispatchers.Default) {
            var t = 0L
            while (isActive && spoofEnabled) {
                val phase = (2.0 * PI * t.toDouble() / periodMs.toDouble())
                val yaw = sin(phase).toFloat() * yawAmplitudeDeg
                val pitch = sin(phase / 2.0).toFloat() * pitchAmplitudeDeg
                // Map angles to plausible accelerometer deltas around gravity.
                val ax = (yaw / 90f) * 2.5f
                val ay = 9.81f + (pitch / 90f) * 1.5f
                val az = 0.2f + sin(phase / 3.0).toFloat() * 0.1f
                latestSample = Sample(ax, ay, az, System.nanoTime(), synthetic = true)
                MagiskHookBridge.writeImuSample(ax, ay, az)
                delay(16)
                t += 16
            }
        }
    }

    fun stopSpoof() {
        spoofEnabled = false
        spoofJob?.cancel()
        spoofJob = null
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (spoofEnabled || event == null) return
        if (event.sensor.type != Sensor.TYPE_ACCELEROMETER) return
        latestSample = Sample(
            ax = event.values.getOrElse(0) { 0f },
            ay = event.values.getOrElse(1) { 0f },
            az = event.values.getOrElse(2) { 0f },
            timestampNs = event.timestamp,
            synthetic = false,
        )
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

    companion object {
        private const val TAG = "ImuBehavioralSync"
    }
}
