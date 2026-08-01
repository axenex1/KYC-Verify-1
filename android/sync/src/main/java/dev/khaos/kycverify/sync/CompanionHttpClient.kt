package dev.khaos.kycverify.sync

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * HTTP helpers against the sync server (same host as WS, port 3001 via adb reverse).
 */
class CompanionHttpClient(
    private val httpBase: String,
    private val sessionId: String,
    private val token: String,
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(120, TimeUnit.SECONDS)
        .build()

    data class ClipMeta(
        val clipId: String,
        val mimeType: String,
        val byteLength: Long,
        val armed: Boolean,
    )

    fun fetchClipMeta(): ClipMeta? {
        val req = Request.Builder()
            .url("$httpBase/companion/clip/$sessionId?token=$token")
            .header("Accept", "application/json")
            .get()
            .build()
        client.newCall(req).execute().use { res ->
            if (!res.isSuccessful) return null
            val body = res.body?.string() ?: return null
            val json = JSONObject(body)
            return ClipMeta(
                clipId = json.optString("clipId"),
                mimeType = json.optString("mimeType", "video/mp4"),
                byteLength = json.optLong("byteLength"),
                armed = json.optBoolean("armed", false),
            )
        }
    }

    fun downloadClipBytes(): ByteArray? {
        val req = Request.Builder()
            .url("$httpBase/companion/clip/$sessionId/data?token=$token")
            .get()
            .build()
        client.newCall(req).execute().use { res ->
            if (!res.isSuccessful) return null
            return res.body?.bytes()
        }
    }

    fun setInjectArmed(armed: Boolean): Boolean {
        val payload = JSONObject()
            .put("sessionId", sessionId)
            .put("token", token)
            .put("armed", armed)
            .toString()
        val req = Request.Builder()
            .url("$httpBase/companion/inject")
            .post(payload.toRequestBody("application/json".toMediaType()))
            .build()
        client.newCall(req).execute().use { res ->
            return res.isSuccessful
        }
    }

    fun postFinding(outcome: String, signals: Map<String, String>): Boolean {
        val signalObj = JSONObject()
        signals.forEach { (k, v) -> signalObj.put(k, v) }
        val payload = JSONObject()
            .put("sessionId", sessionId)
            .put("token", token)
            .put("outcome", outcome)
            .put("signals", signalObj)
            .toString()
        val req = Request.Builder()
            .url("$httpBase/companion/findings")
            .post(payload.toRequestBody("application/json".toMediaType()))
            .build()
        client.newCall(req).execute().use { res ->
            return res.isSuccessful
        }
    }
}
