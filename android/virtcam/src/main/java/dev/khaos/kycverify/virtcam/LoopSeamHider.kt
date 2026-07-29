package dev.khaos.kycverify.virtcam

import kotlin.random.Random

/**
 * Hides loop seams by jittering restart offsets and blending near clip boundaries.
 */
class LoopSeamHider(
    private val clipDurationMs: Long,
    private val random: Random = Random.Default,
) {
    /** Prefer restarting a few frames before the hard end. */
    fun nextLoopStartMs(): Long {
        if (clipDurationMs <= 200) return 0
        val maxJitter = (clipDurationMs * 0.08).toLong().coerceAtLeast(40)
        return random.nextLong(0, maxJitter)
    }

    /** Variable playback rate factor near 1.0 to avoid perfect periodicity. */
    fun nextRateFactor(): Float {
        return 0.97f + random.nextFloat() * 0.06f
    }

    fun notifySeam() {
        MagiskHookBridge.writeSeamOffsetMs(nextLoopStartMs())
    }
}
