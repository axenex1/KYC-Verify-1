package dev.khaos.kycverify.companion

import android.app.Application
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.khaos.kycverify.protocol.SyncConstants
import dev.khaos.kycverify.protocol.SyncMessage
import dev.khaos.kycverify.protocol.decodePairQrPayload
import dev.khaos.kycverify.sync.CompanionHttpClient
import dev.khaos.kycverify.sync.SyncClient
import dev.khaos.kycverify.sync.SyncConnectionState
import dev.khaos.kycverify.virtcam.MagiskHookBridge
import dev.khaos.kycverify.virtcam.VirtualCamService
import dev.khaos.kycverify.webrtc.WebRtcSessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.webrtc.VideoTrack
import java.io.File
import java.net.URI

data class CompanionUiState(
    val connectionState: SyncConnectionState = SyncConnectionState.Idle,
    val sessionId: String = "",
    val token: String = "",
    val wsUrl: String = SyncConstants.defaultWsUrl(),
    val facingFront: Boolean = true,
    val mobileOfferStarted: Boolean = false,
    val remoteTrackAttached: Boolean = false,
    val injectArmed: Boolean = false,
    val showDebugPreview: Boolean = true,
    val imuSpoof: Boolean = false,
    val hookPresent: Boolean = false,
    val statusLine: String = "AUTHORIZED LAB USE ONLY",
    val lastFinding: String? = null,
    val clipLocalPath: String? = null,
)

class CompanionViewModel(app: Application) : AndroidViewModel(app) {
    private val _uiState = MutableStateFlow(CompanionUiState())
    val uiState: StateFlow<CompanionUiState> = _uiState.asStateFlow()

    private var syncClient: SyncClient? = null
    private var webrtc: WebRtcSessionManager? = null
    private var http: CompanionHttpClient? = null
    private var remoteVideoTrack: VideoTrack? = null

    init {
        _uiState.update {
            it.copy(hookPresent = MagiskHookBridge.isHookPresent())
        }
    }

    fun updateManualFields(sessionId: String?, token: String?, wsUrl: String?) {
        _uiState.update { state ->
            state.copy(
                sessionId = sessionId ?: state.sessionId,
                token = token ?: state.token,
                wsUrl = wsUrl ?: state.wsUrl,
            )
        }
    }

    fun onQrScanned(raw: String) {
        try {
            val payload = decodePairQrPayload(raw.trim())
            _uiState.update {
                it.copy(
                    sessionId = payload.sessionId,
                    token = payload.token,
                    wsUrl = payload.wsUrl,
                    statusLine = "QR decoded — connecting…",
                )
            }
            connectManual(
                payload.sessionId,
                payload.token,
                payload.wsUrl,
            )
        } catch (e: Exception) {
            _uiState.update { it.copy(statusLine = "Invalid QR payload") }
            Log.w(TAG, "QR parse failed", e)
        }
    }

    fun connectManual(
        sessionId: String = _uiState.value.sessionId,
        token: String = _uiState.value.token,
        wsUrl: String = _uiState.value.wsUrl,
    ) {
        if (sessionId.isBlank() || token.isBlank() || wsUrl.isBlank()) {
            _uiState.update { it.copy(statusLine = "sessionId, token, wsUrl required") }
            return
        }
        disconnect(keepFields = true)
        _uiState.update {
            it.copy(
                sessionId = sessionId,
                token = token,
                wsUrl = wsUrl,
                statusLine = "Connecting…",
            )
        }

        val httpBase = httpBaseFromWs(wsUrl)
        http = CompanionHttpClient(httpBase, sessionId, token)

        webrtc = WebRtcSessionManager(
            context = getApplication(),
            sessionId = sessionId,
            send = { msg -> syncClient?.send(msg) },
            onRemoteTrack = { streamType, track ->
                if (streamType == SyncConstants.STREAM_DESKTOP_TO_MOBILE) {
                    remoteVideoTrack = track
                    _uiState.update {
                        it.copy(
                            remoteTrackAttached = true,
                            statusLine = "desktop_to_mobile track received",
                        )
                    }
                }
            },
        )

        syncClient = SyncClient(
            sessionId = sessionId,
            token = token,
            wsUrl = wsUrl,
            role = SyncConstants.ROLE_MOBILE,
            onMessage = { message -> onSyncMessage(message) },
            onState = { state ->
                _uiState.update { it.copy(connectionState = state) }
                if (state == SyncConnectionState.Paired) {
                    startMobileOutbound()
                }
            },
        ).also { it.connect() }
    }

    fun disconnect(keepFields: Boolean = false) {
        webrtc?.closeAll()
        webrtc = null
        syncClient?.disconnect()
        syncClient = null
        remoteVideoTrack = null
        http = null
        _uiState.update {
            val base = if (keepFields) {
                it.copy(
                    connectionState = SyncConnectionState.Disconnected,
                    mobileOfferStarted = false,
                    remoteTrackAttached = false,
                    statusLine = "Disconnected",
                )
            } else {
                CompanionUiState(
                    hookPresent = MagiskHookBridge.isHookPresent(),
                    statusLine = "Disconnected",
                )
            }
            base
        }
    }

    fun toggleFacing() {
        val nextFront = !_uiState.value.facingFront
        webrtc?.switchCamera(nextFront)
        _uiState.update { it.copy(facingFront = nextFront) }
        val sessionId = _uiState.value.sessionId
        if (sessionId.isNotBlank()) {
            syncClient?.send(
                SyncMessage.CameraFacing(
                    sessionId = sessionId,
                    facing = if (nextFront) {
                        SyncConstants.FACING_USER
                    } else {
                        SyncConstants.FACING_ENVIRONMENT
                    },
                )
            )
        }
    }

    fun toggleDebugPreview() {
        _uiState.update { it.copy(showDebugPreview = !it.showDebugPreview) }
    }

    fun toggleImuSpoof() {
        val enable = !_uiState.value.imuSpoof
        val ctx = getApplication<Application>()
        val intent = Intent(ctx, VirtualCamService::class.java).apply {
            action = if (enable) {
                VirtualCamService.ACTION_IMU_SPOOF_START
            } else {
                VirtualCamService.ACTION_IMU_SPOOF_STOP
            }
        }
        ContextCompat.startForegroundService(ctx, intent)
        _uiState.update { it.copy(imuSpoof = enable) }
    }

    fun armInject() {
        viewModelScope.launch {
            val path = withContext(Dispatchers.IO) { downloadArmedClip() }
            val ctx = getApplication<Application>()
            val intent = VirtualCamService.armIntent(ctx, path)
            ContextCompat.startForegroundService(ctx, intent)
            http?.let { client ->
                withContext(Dispatchers.IO) { client.setInjectArmed(true) }
            }
            syncClient?.send(
                SyncMessage.InjectState(
                    sessionId = _uiState.value.sessionId,
                    armed = true,
                    mode = "avatar",
                )
            )
            _uiState.update {
                it.copy(
                    injectArmed = true,
                    clipLocalPath = path,
                    showDebugPreview = false,
                    statusLine = if (path != null) {
                        "Inject ARMED — open vendor KYC app"
                    } else {
                        "Inject ARMED (WebRTC/live frames only; no clip)"
                    },
                    hookPresent = MagiskHookBridge.isHookPresent(),
                )
            }
        }
    }

    fun disarmInject() {
        val ctx = getApplication<Application>()
        ContextCompat.startForegroundService(ctx, VirtualCamService.disarmIntent(ctx))
        viewModelScope.launch(Dispatchers.IO) {
            http?.setInjectArmed(false)
        }
        syncClient?.send(
            SyncMessage.InjectState(
                sessionId = _uiState.value.sessionId,
                armed = false,
            )
        )
        _uiState.update {
            it.copy(
                injectArmed = false,
                showDebugPreview = true,
                statusLine = "Inject disarmed",
            )
        }
    }

    fun reportFinding(outcome: String) {
        viewModelScope.launch(Dispatchers.IO) {
            val signals = mapOf(
                "platform" to "android",
                "manufacturer" to Build.MANUFACTURER,
                "model" to Build.MODEL,
                "hookPresent" to MagiskHookBridge.isHookPresent().toString(),
                "injectArmed" to _uiState.value.injectArmed.toString(),
            )
            val ok = http?.postFinding(outcome, signals) == true
            syncClient?.send(
                SyncMessage.FindingSignal(
                    sessionId = _uiState.value.sessionId,
                    outcome = outcome,
                    signals = signals,
                )
            )
            _uiState.update {
                it.copy(lastFinding = if (ok) outcome else "$outcome (local only)")
            }
        }
    }

    private fun startMobileOutbound() {
        if (_uiState.value.mobileOfferStarted) return
        val manager = webrtc ?: return
        try {
            val track = manager.startLocalCamera(_uiState.value.facingFront)
            if (manager.shouldInitiate(SyncConstants.STREAM_MOBILE_TO_DESKTOP)) {
                manager.createOffer(SyncConstants.STREAM_MOBILE_TO_DESKTOP, track)
                _uiState.update {
                    it.copy(
                        mobileOfferStarted = true,
                        statusLine = "Paired — camera offered to desktop",
                    )
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start camera", e)
            _uiState.update { it.copy(statusLine = "Camera start failed: ${e.message}") }
        }
    }

    private fun onSyncMessage(message: SyncMessage) {
        webrtc?.handleSignalingMessage(message)
        when (message) {
            is SyncMessage.ClipReady -> {
                _uiState.update {
                    it.copy(statusLine = "Clip ready on desktop (${message.clipId})")
                }
                viewModelScope.launch { armInject() }
            }
            is SyncMessage.InjectState -> {
                if (message.armed) {
                    viewModelScope.launch { armInject() }
                } else {
                    disarmInject()
                }
            }
            else -> Unit
        }
    }

    private fun downloadArmedClip(): String? {
        val client = http ?: return null
        return try {
            val meta = client.fetchClipMeta() ?: return null
            if (!meta.armed && meta.byteLength <= 0) return null
            val bytes = client.downloadClipBytes() ?: return null
            val dir = File(getApplication<Application>().cacheDir, "clips")
            dir.mkdirs()
            val out = File(dir, "${meta.clipId.ifBlank { "armed" }}.bin")
            out.writeBytes(bytes)
            out.absolutePath
        } catch (e: Exception) {
            Log.w(TAG, "downloadArmedClip failed", e)
            null
        }
    }

    private fun httpBaseFromWs(wsUrl: String): String {
        return try {
            val uri = URI(wsUrl)
            val host = uri.host ?: "127.0.0.1"
            val port = if (uri.port > 0) uri.port else SyncConstants.SYNC_HTTP_PORT
            "http://$host:$port"
        } catch (_: Exception) {
            SyncConstants.defaultHttpBase()
        }
    }

    override fun onCleared() {
        disconnect()
        super.onCleared()
    }

    companion object {
        private const val TAG = "CompanionVM"
    }
}
