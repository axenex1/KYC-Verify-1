package dev.khaos.kycverify.webrtc

import android.content.Context
import android.util.Log
import dev.khaos.kycverify.protocol.SyncConstants
import dev.khaos.kycverify.protocol.SyncMessage
import org.webrtc.Camera2Enumerator
import org.webrtc.CameraVideoCapturer
import org.webrtc.DataChannel
import org.webrtc.DefaultVideoDecoderFactory
import org.webrtc.DefaultVideoEncoderFactory
import org.webrtc.EglBase
import org.webrtc.IceCandidate
import org.webrtc.MediaConstraints
import org.webrtc.MediaStream
import org.webrtc.PeerConnection
import org.webrtc.PeerConnectionFactory
import org.webrtc.RtpReceiver
import org.webrtc.SdpObserver
import org.webrtc.SessionDescription
import org.webrtc.SurfaceTextureHelper
import org.webrtc.VideoSource
import org.webrtc.VideoTrack
import java.util.concurrent.ConcurrentHashMap

/**
 * Dual peer-connection manager matching lib/sync/use-webrtc.ts:
 * - mobile initiates mobile_to_desktop
 * - desktop initiates desktop_to_mobile (mobile answers)
 */
class WebRtcSessionManager(
    context: Context,
    private val sessionId: String,
    private val send: (SyncMessage) -> Unit,
    private val onRemoteTrack: (streamType: String, track: VideoTrack) -> Unit,
) {
    private val appContext = context.applicationContext
    private val eglBase: EglBase = EglBase.create()
    private val factory: PeerConnectionFactory
    private val peers = ConcurrentHashMap<String, PeerConnection>()
    private var localCapturer: CameraVideoCapturer? = null
    private var localVideoTrack: VideoTrack? = null
    private var surfaceHelper: SurfaceTextureHelper? = null
    private var videoSource: VideoSource? = null

    init {
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(appContext)
                .setEnableInternalTracer(false)
                .createInitializationOptions()
        )
        val encoderFactory = DefaultVideoEncoderFactory(eglBase.eglBaseContext, true, true)
        val decoderFactory = DefaultVideoDecoderFactory(eglBase.eglBaseContext)
        factory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .createPeerConnectionFactory()
    }

    fun eglContext(): EglBase.Context = eglBase.eglBaseContext

    fun startLocalCamera(facingFront: Boolean = true): VideoTrack {
        stopLocalCamera()
        val enumerator = Camera2Enumerator(appContext)
        val deviceName = enumerator.deviceNames.firstOrNull { name ->
            if (facingFront) enumerator.isFrontFacing(name) else enumerator.isBackFacing(name)
        } ?: enumerator.deviceNames.firstOrNull()
            ?: throw IllegalStateException("No camera available")

        val capturer = enumerator.createCapturer(deviceName, null)
            ?: throw IllegalStateException("Could not create camera capturer")
        localCapturer = capturer

        surfaceHelper = SurfaceTextureHelper.create("CaptureThread", eglBase.eglBaseContext)
        videoSource = factory.createVideoSource(false)
        capturer.initialize(surfaceHelper, appContext, videoSource!!.capturerObserver)
        capturer.startCapture(1280, 720, 30)

        val track = factory.createVideoTrack("mobile_camera", videoSource)
        track.setEnabled(true)
        localVideoTrack = track
        return track
    }

    fun switchCamera(facingFront: Boolean) {
        val capturer = localCapturer ?: return
        try {
            capturer.switchCamera(object : CameraVideoCapturer.CameraSwitchHandler {
                override fun onCameraSwitchDone(isFrontCamera: Boolean) {
                    Log.i(TAG, "Camera switched front=$isFrontCamera requestedFront=$facingFront")
                }

                override fun onCameraSwitchError(errorDescription: String?) {
                    Log.w(TAG, "Camera switch error: $errorDescription")
                }
            })
        } catch (e: Exception) {
            Log.w(TAG, "switchCamera failed", e)
        }
    }

    fun stopLocalCamera() {
        try {
            localCapturer?.stopCapture()
        } catch (_: Exception) {
        }
        localCapturer?.dispose()
        localCapturer = null
        localVideoTrack?.dispose()
        localVideoTrack = null
        videoSource?.dispose()
        videoSource = null
        surfaceHelper?.dispose()
        surfaceHelper = null
    }

    fun shouldInitiate(streamType: String): Boolean =
        streamType == SyncConstants.STREAM_MOBILE_TO_DESKTOP

    fun createOffer(streamType: String, localTrack: VideoTrack?) {
        val pc = getPeer(streamType)
        if (localTrack != null) {
            pc.addTrack(localTrack, listOf(streamType))
        }
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"))
        }
        pc.createOffer(object : SdpAdapter("createOffer") {
            override fun onCreateSuccess(desc: SessionDescription?) {
                if (desc == null) return
                pc.setLocalDescription(SdpAdapter("setLocal"), desc)
                send(
                    SyncMessage.StreamOffer(
                        sessionId = sessionId,
                        sdp = desc.description,
                        streamType = streamType,
                    )
                )
            }
        }, constraints)
    }

    fun handleSignalingMessage(message: SyncMessage) {
        when (message) {
            is SyncMessage.StreamOffer -> {
                val pc = getPeer(message.streamType)
                val remote = SessionDescription(SessionDescription.Type.OFFER, message.sdp)
                pc.setRemoteDescription(SdpAdapter("setRemoteOffer"), remote)
                pc.createAnswer(object : SdpAdapter("createAnswer") {
                    override fun onCreateSuccess(desc: SessionDescription?) {
                        if (desc == null) return
                        pc.setLocalDescription(SdpAdapter("setLocalAnswer"), desc)
                        send(
                            SyncMessage.StreamAnswer(
                                sessionId = sessionId,
                                sdp = desc.description,
                                streamType = message.streamType,
                            )
                        )
                    }
                }, MediaConstraints())
            }

            is SyncMessage.StreamAnswer -> {
                val pc = getPeer(message.streamType)
                val remote = SessionDescription(SessionDescription.Type.ANSWER, message.sdp)
                pc.setRemoteDescription(SdpAdapter("setRemoteAnswer"), remote)
            }

            is SyncMessage.IceCandidateMsg -> {
                val pc = getPeer(message.streamType)
                if (message.candidate.isNotBlank()) {
                    pc.addIceCandidate(
                        IceCandidate(
                            message.sdpMid,
                            message.sdpMLineIndex ?: 0,
                            message.candidate,
                        )
                    )
                }
            }

            else -> Unit
        }
    }

    fun closeAll() {
        stopLocalCamera()
        peers.values.forEach { it.close() }
        peers.clear()
        factory.dispose()
        eglBase.release()
    }

    private fun getPeer(streamType: String): PeerConnection {
        peers[streamType]?.let { return it }
        val iceServers = listOf(
            PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer()
        )
        val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
        }
        val pc = factory.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
            override fun onSignalingChange(newState: PeerConnection.SignalingState?) = Unit
            override fun onIceConnectionChange(newState: PeerConnection.IceConnectionState?) = Unit
            override fun onIceConnectionReceivingChange(receiving: Boolean) = Unit
            override fun onIceGatheringChange(newState: PeerConnection.IceGatheringState?) = Unit
            override fun onIceCandidate(candidate: IceCandidate?) {
                if (candidate == null) return
                send(
                    SyncMessage.IceCandidateMsg(
                        sessionId = sessionId,
                        candidate = candidate.sdp,
                        sdpMid = candidate.sdpMid,
                        sdpMLineIndex = candidate.sdpMLineIndex,
                        streamType = streamType,
                    )
                )
            }

            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) = Unit
            override fun onAddStream(stream: MediaStream?) = Unit
            override fun onRemoveStream(stream: MediaStream?) = Unit
            override fun onDataChannel(dc: DataChannel?) = Unit
            override fun onRenegotiationNeeded() = Unit
            override fun onAddTrack(receiver: RtpReceiver?, mediaStreams: Array<out MediaStream>?) {
                val track = receiver?.track() as? VideoTrack ?: return
                onRemoteTrack(streamType, track)
            }
        }) ?: throw IllegalStateException("Failed to create PeerConnection")
        peers[streamType] = pc
        return pc
    }

    private open class SdpAdapter(private val label: String) : SdpObserver {
        override fun onCreateSuccess(desc: SessionDescription?) = Unit
        override fun onSetSuccess() = Unit
        override fun onCreateFailure(error: String?) {
            Log.e(TAG, "$label create failure: $error")
        }

        override fun onSetFailure(error: String?) {
            Log.e(TAG, "$label set failure: $error")
        }
    }

    companion object {
        private const val TAG = "KycWebRtc"
    }
}
