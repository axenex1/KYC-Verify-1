package dev.khaos.kycverify.virtcam

/**
 * Front-camera characteristics profile used to match vendor SDK expectations.
 * Pixel lab baseline defaults; OEM matrix extends via [fromDeviceHints].
 */
data class CameraCharacteristicsProfile(
    val facing: String = "front",
    val sensorWidthMm: Float = 3.6f,
    val sensorHeightMm: Float = 2.7f,
    val focalLengthMm: Float = 2.6f,
    val aperture: Float = 2.2f,
    val activeArrayWidth: Int = 1280,
    val activeArrayHeight: Int = 720,
    val maxFps: Int = 30,
    val outputFormat: String = "NV21",
    val oemFamily: String = "pixel",
) {
    fun toSignalMap(): Map<String, String> = mapOf(
        "facing" to facing,
        "sensorWidthMm" to sensorWidthMm.toString(),
        "sensorHeightMm" to sensorHeightMm.toString(),
        "focalLengthMm" to focalLengthMm.toString(),
        "aperture" to aperture.toString(),
        "activeArrayWidth" to activeArrayWidth.toString(),
        "activeArrayHeight" to activeArrayHeight.toString(),
        "maxFps" to maxFps.toString(),
        "outputFormat" to outputFormat,
        "oemFamily" to oemFamily,
    )

    companion object {
        fun pixelBaseline(): CameraCharacteristicsProfile = CameraCharacteristicsProfile()

        fun fromDeviceHints(manufacturer: String, model: String): CameraCharacteristicsProfile {
            val mfr = manufacturer.lowercase()
            return when {
                mfr.contains("samsung") -> CameraCharacteristicsProfile(
                    sensorWidthMm = 4.0f,
                    sensorHeightMm = 3.0f,
                    focalLengthMm = 2.8f,
                    aperture = 2.2f,
                    oemFamily = "samsung",
                )
                mfr.contains("xiaomi") || mfr.contains("redmi") -> CameraCharacteristicsProfile(
                    sensorWidthMm = 3.8f,
                    sensorHeightMm = 2.9f,
                    focalLengthMm = 2.5f,
                    aperture = 2.4f,
                    oemFamily = "xiaomi",
                )
                mfr.contains("google") || model.lowercase().contains("pixel") -> pixelBaseline()
                else -> pixelBaseline().copy(oemFamily = "generic:$mfr")
            }
        }
    }
}
