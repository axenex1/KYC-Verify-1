package dev.khaos.kycverify.protocol

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.modules.SerializersModule
import kotlinx.serialization.modules.polymorphic
import kotlinx.serialization.modules.subclass

@Serializable
data class PairQrPayload(
    val sessionId: String,
    val token: String,
    val wsUrl: String,
)

@Serializable
data class DocumentTransformPayload(
    val scale: Double,
    val rotationDeg: Double,
    val skewX: Double,
    val skewY: Double,
)

@Serializable
sealed class SyncMessage {
    abstract val sessionId: String

    @Serializable
    @SerialName("pair_request")
    data class PairRequest(
        override val sessionId: String,
        val role: String,
        val token: String,
    ) : SyncMessage()

    @Serializable
    @SerialName("pair_ack")
    data class PairAck(
        override val sessionId: String,
        val role: String,
        val success: Boolean,
        val error: String? = null,
    ) : SyncMessage()

    @Serializable
    @SerialName("camera_facing")
    data class CameraFacing(
        override val sessionId: String,
        val facing: String,
    ) : SyncMessage()

    @Serializable
    @SerialName("transform_proposed")
    data class TransformProposed(
        override val sessionId: String,
        val transform: DocumentTransformPayload,
    ) : SyncMessage()

    @Serializable
    @SerialName("transform_applied")
    data class TransformApplied(
        override val sessionId: String,
        val transform: DocumentTransformPayload,
    ) : SyncMessage()

    @Serializable
    @SerialName("transform_rejected")
    data class TransformRejected(
        override val sessionId: String,
    ) : SyncMessage()

    @Serializable
    @SerialName("stream_offer")
    data class StreamOffer(
        override val sessionId: String,
        val sdp: String,
        val streamType: String,
    ) : SyncMessage()

    @Serializable
    @SerialName("stream_answer")
    data class StreamAnswer(
        override val sessionId: String,
        val sdp: String,
        val streamType: String,
    ) : SyncMessage()

    @Serializable
    @SerialName("ice_candidate")
    data class IceCandidateMsg(
        override val sessionId: String,
        val candidate: String,
        val sdpMid: String? = null,
        val sdpMLineIndex: Int? = null,
        val streamType: String,
    ) : SyncMessage()

    @Serializable
    @SerialName("ping")
    data class Ping(
        override val sessionId: String,
    ) : SyncMessage()

    @Serializable
    @SerialName("pong")
    data class Pong(
        override val sessionId: String,
    ) : SyncMessage()

    @Serializable
    @SerialName("inject_state")
    data class InjectState(
        override val sessionId: String,
        val armed: Boolean,
        val mode: String = "avatar",
    ) : SyncMessage()

    @Serializable
    @SerialName("clip_ready")
    data class ClipReady(
        override val sessionId: String,
        val clipId: String,
        val mimeType: String = "video/mp4",
        val byteLength: Long = 0,
    ) : SyncMessage()

    @Serializable
    @SerialName("finding_signal")
    data class FindingSignal(
        override val sessionId: String,
        val outcome: String,
        val signals: Map<String, String> = emptyMap(),
    ) : SyncMessage()
}

private val syncModule = SerializersModule {
    polymorphic(SyncMessage::class) {
        subclass(SyncMessage.PairRequest::class)
        subclass(SyncMessage.PairAck::class)
        subclass(SyncMessage.CameraFacing::class)
        subclass(SyncMessage.TransformProposed::class)
        subclass(SyncMessage.TransformApplied::class)
        subclass(SyncMessage.TransformRejected::class)
        subclass(SyncMessage.StreamOffer::class)
        subclass(SyncMessage.StreamAnswer::class)
        subclass(SyncMessage.IceCandidateMsg::class)
        subclass(SyncMessage.Ping::class)
        subclass(SyncMessage.Pong::class)
        subclass(SyncMessage.InjectState::class)
        subclass(SyncMessage.ClipReady::class)
        subclass(SyncMessage.FindingSignal::class)
    }
}

val SyncJson = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
    explicitNulls = false
    classDiscriminator = "type"
    serializersModule = syncModule
}

fun decodeSyncMessage(raw: String): SyncMessage =
    SyncJson.decodeFromString(SyncMessage.serializer(), raw)

fun encodeSyncMessage(message: SyncMessage): String =
    SyncJson.encodeToString(SyncMessage.serializer(), message)

fun decodePairQrPayload(raw: String): PairQrPayload =
    SyncJson.decodeFromString(PairQrPayload.serializer(), raw)
