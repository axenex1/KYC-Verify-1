package dev.khaos.kycverify.sync

import android.util.Log
import dev.khaos.kycverify.protocol.SyncMessage
import dev.khaos.kycverify.protocol.decodeSyncMessage
import dev.khaos.kycverify.protocol.encodeSyncMessage
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

enum class SyncConnectionState {
    Idle,
    Connecting,
    Paired,
    Disconnected,
    Error,
}

class SyncClient(
    private val sessionId: String,
    private val token: String,
    private val wsUrl: String,
    private val role: String = "mobile",
    private val onMessage: (SyncMessage) -> Unit,
    private val onState: (SyncConnectionState) -> Unit,
) {
    private val client = OkHttpClient.Builder()
        .pingInterval(20, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private var socket: WebSocket? = null
    private val intentionalClose = AtomicBoolean(false)

    fun connect() {
        intentionalClose.set(false)
        onState(SyncConnectionState.Connecting)
        val request = Request.Builder().url(wsUrl).build()
        socket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                val pair = SyncMessage.PairRequest(
                    sessionId = sessionId,
                    role = role,
                    token = token,
                )
                webSocket.send(encodeSyncMessage(pair))
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val message = decodeSyncMessage(text)
                    if (message is SyncMessage.PairAck) {
                        if (message.success) {
                            onState(SyncConnectionState.Paired)
                        } else if (message.error == "peer_disconnected") {
                            onState(SyncConnectionState.Disconnected)
                        } else {
                            onState(SyncConnectionState.Error)
                        }
                    }
                    onMessage(message)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to decode sync message", e)
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                if (!intentionalClose.get()) {
                    onState(SyncConnectionState.Disconnected)
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket failure", t)
                onState(SyncConnectionState.Error)
            }
        })
    }

    fun send(message: SyncMessage) {
        socket?.send(encodeSyncMessage(message))
    }

    fun disconnect() {
        intentionalClose.set(true)
        socket?.close(1000, "client_close")
        socket = null
        onState(SyncConnectionState.Disconnected)
    }

    companion object {
        private const val TAG = "KycSyncClient"
    }
}
