package com.hunter.system.verify

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import com.hunter.system.data.Prefs
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

sealed class Verdict {
    object Verified : Verdict()
    data class Rejected(val reason: String) : Verdict()
    object Unavailable : Verdict()   // network or rate limit exhausted -> queue offline or honor mode
}

object Photo {
    fun compress(path: String, maxSide: Int = 1024): ByteArray {
        val b = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, b)
        val bmp = BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = maxOf(1, maxOf(b.outWidth, b.outHeight) / maxSide) })
        return ByteArrayOutputStream().also { bmp.compress(Bitmap.CompressFormat.JPEG, 80, it) }.toByteArray()
    }
    fun sha256(b: ByteArray) = MessageDigest.getInstance("SHA-256").digest(b).joinToString("") { "%02x".format(it) }
}

/** Chain: Gemini (retry w/ backoff) -> Groq (retry) -> Unavailable. Never throws; never blocks logging forever. */
class PhotoVerifier(private val prefs: Prefs) {
    private fun prompt(task: String) = "Verify this photo shows the user completing their daily task: $task. " +
        "Respond ONLY with 'VERIFIED' or 'NOT_VERIFIED' and a one-line reason."

    suspend fun verify(jpeg: ByteArray, task: String): Verdict = withContext(Dispatchers.IO) {
        val b64 = Base64.encodeToString(jpeg, Base64.NO_WRAP)
        if (prefs.geminiKey.isNotBlank()) retry { gemini(b64, task) }?.let { return@withContext parse(it) }
        if (prefs.groqKey.isNotBlank()) retry { groq(b64, task) }?.let { return@withContext parse(it) }
        Verdict.Unavailable
    }

    private suspend fun retry(block: () -> String?): String? {
        var wait = 1000L
        repeat(3) { block()?.let { return it }; delay(wait); wait *= 2 }
        return null
    }

    private fun post(url: String, headers: Map<String, String>, body: JSONObject): String? = try {
        val c = URL(url).openConnection() as HttpURLConnection
        c.requestMethod = "POST"; c.connectTimeout = 15000; c.readTimeout = 30000; c.doOutput = true
        c.setRequestProperty("Content-Type", "application/json")
        headers.forEach { (k, v) -> c.setRequestProperty(k, v) }
        c.outputStream.use { it.write(body.toString().toByteArray()) }
        if (c.responseCode in 200..299) c.inputStream.bufferedReader().readText() else null   // 429/5xx -> caller retries
    } catch (e: Exception) { null }

    // POST generativelanguage.googleapis.com/v1beta/models/{model}:generateContent (key in header, not URL, so it stays out of logs)
    private fun gemini(b64: String, task: String): String? = try {
        val body = JSONObject().put("contents", JSONArray().put(JSONObject().put("parts", JSONArray()
            .put(JSONObject().put("text", prompt(task)))
            .put(JSONObject().put("inline_data", JSONObject().put("mime_type", "image/jpeg").put("data", b64))))))
        post("https://generativelanguage.googleapis.com/v1beta/models/${prefs.geminiModel}:generateContent",
            mapOf("x-goog-api-key" to prefs.geminiKey), body)?.let {
            JSONObject(it).getJSONArray("candidates").getJSONObject(0).getJSONObject("content")
                .getJSONArray("parts").getJSONObject(0).getString("text")
        }
    } catch (e: Exception) { null }

    // Groq is OpenAI-compatible.
    private fun groq(b64: String, task: String): String? = try {
        val content = JSONArray()
            .put(JSONObject().put("type", "text").put("text", prompt(task)))
            .put(JSONObject().put("type", "image_url").put("image_url", JSONObject().put("url", "data:image/jpeg;base64,$b64")))
        val body = JSONObject().put("model", prefs.groqModel).put("max_tokens", 60)
            .put("messages", JSONArray().put(JSONObject().put("role", "user").put("content", content)))
        post("https://api.groq.com/openai/v1/chat/completions", mapOf("Authorization" to "Bearer ${prefs.groqKey}"), body)?.let {
            JSONObject(it).getJSONArray("choices").getJSONObject(0).getJSONObject("message").getString("content")
        }
    } catch (e: Exception) { null }

    private fun parse(t: String): Verdict {
        val s = t.trim()
        return when {
            s.startsWith("NOT_VERIFIED", true) -> Verdict.Rejected(s.substring(12).trim(' ', '-', ':', '.').ifBlank { "Photo does not show the task." })
            s.startsWith("VERIFIED", true) -> Verdict.Verified
            else -> Verdict.Rejected("Could not confirm the task from this photo.")
        }
    }
}
