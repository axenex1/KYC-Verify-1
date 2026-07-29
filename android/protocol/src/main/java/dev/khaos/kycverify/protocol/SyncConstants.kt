package dev.khaos.kycverify.protocol

/** Mirrors lib/sync/messages.ts desktop constants. */
object SyncConstants {
    const val SYNC_WS_PORT = 3001
    const val SYNC_HTTP_PORT = 3001
    const val SYNC_WS_PATH = "/sync"

    const val STREAM_DESKTOP_TO_MOBILE = "desktop_to_mobile"
    const val STREAM_MOBILE_TO_DESKTOP = "mobile_to_desktop"

    const val ROLE_DESKTOP = "desktop"
    const val ROLE_MOBILE = "mobile"

    const val FACING_USER = "user"
    const val FACING_ENVIRONMENT = "environment"

    /** Default capture fps for desktop_to_mobile / virtcam loop. */
    const val DESKTOP_TO_MOBILE_CAPTURE_FPS = 15

    fun defaultWsUrl(host: String = "127.0.0.1"): String =
        "ws://$host:$SYNC_WS_PORT$SYNC_WS_PATH"

    fun defaultHttpBase(host: String = "127.0.0.1"): String =
        "http://$host:$SYNC_HTTP_PORT"
}
