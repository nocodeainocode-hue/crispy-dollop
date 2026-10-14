package com.quitvow.shield

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Engelin kalıcı durumu: kullanıcı engeli istedi mi, sunucu adresi ve oturum anahtarı (durum bildirimi için),
 * bugün kaç istek engellendi, kurallar ve liste. Kurallar ve liste sunucudan güncellenir; ilk açılışta pakete gömülü kurallar kullanılır.
 */
object ShieldStore {
  private const val PREFS = "quitvow_shield"
  private const val RULES_FILE = "shield-rules.json"
  private const val LIST_FILE = "shield-list.bin"

  fun prefs(ctx: Context): SharedPreferences = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Kullanıcı engeli açtı mı (kendi isteğiyle kapatana kadar true). Açıkken çalışmıyorsa durum "kapalı" bildirilir. */
  fun wanted(ctx: Context) = prefs(ctx).getBoolean("wanted", false)
  fun setWanted(ctx: Context, v: Boolean) = prefs(ctx).edit().putBoolean("wanted", v).apply()

  fun setAuth(ctx: Context, apiUrl: String, token: String?) =
    prefs(ctx).edit().putString("apiUrl", apiUrl.trimEnd('/')).putString("token", token).apply()
  fun apiUrl(ctx: Context): String? = prefs(ctx).getString("apiUrl", null)
  fun setLocale(ctx: Context, lang: String) = prefs(ctx).edit().putString("locale", lang).apply()
  fun locale(ctx: Context): String = prefs(ctx).getString("locale", "tr") ?: "tr"
  fun token(ctx: Context): String? = prefs(ctx).getString("token", null)

  private fun today() = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
  fun countBlocked(ctx: Context) {
    val p = prefs(ctx)
    val day = today()
    val n = if (p.getString("blockedDay", null) == day) p.getInt("blockedCount", 0) else 0
    p.edit().putString("blockedDay", day).putInt("blockedCount", n + 1).apply()
  }
  fun blockedToday(ctx: Context): Int = prefs(ctx).let { if (it.getString("blockedDay", null) == today()) it.getInt("blockedCount", 0) else 0 }

  private fun rulesJson(ctx: Context): JSONObject {
    val f = File(ctx.filesDir, RULES_FILE)
    val text = if (f.exists()) f.readText() else ctx.assets.open(RULES_FILE).bufferedReader().use { it.readText() }
    return JSONObject(text)
  }

  private fun JSONArray?.strings(): List<String> = if (this == null) emptyList() else List(length()) { getString(it) }

  fun loadMatcher(ctx: Context): Matcher {
    val r = rulesJson(ctx)
    val list = File(ctx.filesDir, LIST_FILE)
    val hashes = if (list.exists()) runCatching { list.inputStream().use { Matcher.readHashes(it) } }.getOrElse { LongArray(0) } else LongArray(0)
    return Matcher(
      r.optJSONArray("roots").strings(), r.optString("rootSuffix", ""), r.optJSONArray("patterns").strings(),
      r.optJSONArray("allow").strings(), r.optJSONArray("doh").strings(), hashes,
    )
  }

  fun rulesVersion(ctx: Context) = runCatching { rulesJson(ctx).optInt("version", 0) }.getOrDefault(0)
  fun listVersion(ctx: Context): String? = prefs(ctx).getString("listVersion", null)
  fun listSize(ctx: Context): Int = prefs(ctx).getInt("listSize", 0)

  /** Kuralları ve (değiştiyse) listeyi sunucudan indirir. Ağ yoksa sessizce eski hâliyle devam eder. true: bir şey değişti. */
  fun refresh(ctx: Context): Boolean {
    val api = apiUrl(ctx) ?: return false
    val rulesText = get("$api/shield/rules") ?: return false
    val rules = JSONObject(rulesText)
    var changed = false
    val rf = File(ctx.filesDir, RULES_FILE)
    if (!rf.exists() || rf.readText() != rulesText) { rf.writeText(rulesText); changed = true }
    val v = rules.optString("listVersion", "")
    if (v.isNotEmpty() && v != listVersion(ctx)) {
      val conn = open("$api/shield/list") ?: return changed
      try {
        if (conn.responseCode != 200) return changed
        // Sunucu listeyi gzip ile gönderir; HttpURLConnection açarak verir
        val hashes = conn.inputStream.use { Matcher.hashList(it) }
        if (hashes.size < 1000) return changed // bozuk yanıt; eldekini koru
        val tmp = File(ctx.filesDir, "$LIST_FILE.tmp")
        tmp.outputStream().use { Matcher.writeHashes(hashes, it) }
        tmp.renameTo(File(ctx.filesDir, LIST_FILE))
        prefs(ctx).edit().putString("listVersion", v).putInt("listSize", hashes.size).apply()
        changed = true
      } finally { conn.disconnect() }
    }
    return changed
  }

  private fun open(url: String): HttpURLConnection? = runCatching {
    (URL(url).openConnection() as HttpURLConnection).apply { connectTimeout = 15_000; readTimeout = 60_000 }
  }.getOrNull()

  private fun get(url: String): String? {
    val c = open(url) ?: return null
    return try { if (c.responseCode == 200) c.inputStream.bufferedReader().use { it.readText() } else null } catch (_: Exception) { null } finally { c.disconnect() }
  }

  /** Sunucuya engel durumunu bildirir. Engel kapanırsa sunucu, aktif paktın şahitlerine haber verir. */
  fun reportShield(ctx: Context, shield: String) {
    val api = apiUrl(ctx) ?: return
    val token = token(ctx) ?: return
    Thread {
      runCatching {
        val c = open("$api/pacts/current/heartbeat") ?: return@runCatching
        try {
          c.requestMethod = "POST"
          c.doOutput = true
          c.setRequestProperty("Content-Type", "application/json")
          c.setRequestProperty("Authorization", "Bearer $token")
          c.outputStream.use { it.write("""{"platform":"android","shield":"$shield"}""".toByteArray()) }
          c.responseCode
        } finally { c.disconnect() }
      }
    }.start()
  }
}
