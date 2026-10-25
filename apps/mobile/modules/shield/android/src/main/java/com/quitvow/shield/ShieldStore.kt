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
 * bugün kaç adres engellendi, kurallar ve liste. Kurallar ve liste sunucudan güncellenir; ilk açılışta pakete gömülü kurallar kullanılır.
 */
object ShieldStore {
  private const val PREFS = "quitvow_shield"
  private const val RULES_FILE = "shield-rules.json"
  private const val LIST_FILE = "shield-list.bin"

  /** Sunucudan gelen kurallar (bkz. apps/api/shield/rules.json). */
  class Rules(
    val version: Int,
    val roots: List<String>, val rootSuffix: String, val patterns: List<String>,
    val allow: List<String>, val doh: List<String>,
    /** Tünele yönlendirilecek genel çözümleyici adresleri ("8.8.8.8", "45.90.28.0/24") */
    val resolvers: List<String>,
  )

  fun prefs(ctx: Context): SharedPreferences = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Kullanıcı engeli açtı mı (kendi isteğiyle kapatana kadar true). Açıkken çalışmıyorsa durum "kapalı" bildirilir. */
  fun wanted(ctx: Context) = prefs(ctx).getBoolean("wanted", false)
  fun setWanted(ctx: Context, v: Boolean) = prefs(ctx).edit().putBoolean("wanted", v).apply()

  fun setAuth(ctx: Context, apiUrl: String, token: String?) =
    prefs(ctx).edit().putString("apiUrl", apiUrl.trimEnd('/')).putString("token", token).apply()
  fun apiUrl(ctx: Context): String? = prefs(ctx).getString("apiUrl", null)
  fun setLocale(ctx: Context, lang: String) = prefs(ctx).edit().putString("locale", lang).apply()
  fun locale(ctx: Context): String = prefs(ctx).getString("locale", "tr") ?: "tr"

  /** Bildirimden gelen açılış isteği: 2 dakika geçerli, bir kez okunur. */
  fun setOpenRequest(ctx: Context, screen: String) =
    prefs(ctx).edit().putString("openRequest", screen).putLong("openRequestAt", System.currentTimeMillis()).apply()
  fun takeOpenRequest(ctx: Context): String? {
    val p = prefs(ctx)
    val v = p.getString("openRequest", null) ?: return null
    val fresh = System.currentTimeMillis() - p.getLong("openRequestAt", 0) < 2 * 60 * 1000L
    p.edit().remove("openRequest").remove("openRequestAt").apply()
    return if (fresh) v else null
  }
  fun token(ctx: Context): String? = prefs(ctx).getString("token", null)

  private fun today() = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
  fun countBlocked(ctx: Context) {
    val p = prefs(ctx)
    val day = today()
    val n = if (p.getString("blockedDay", null) == day) p.getInt("blockedCount", 0) else 0
    p.edit().putString("blockedDay", day).putInt("blockedCount", n + 1).putLong("lastBlockedAt", System.currentTimeMillis()).apply()
  }
  fun blockedToday(ctx: Context): Int = prefs(ctx).let { if (it.getString("blockedDay", null) == today()) it.getInt("blockedCount", 0) else 0 }
  fun lastBlockedAt(ctx: Context): Long = prefs(ctx).getLong("lastBlockedAt", 0)

  /** İndirilmiş kurallar; yoksa ya da bozuksa pakete gömülü kopya. */
  private fun rulesJson(ctx: Context): JSONObject {
    val f = File(ctx.filesDir, RULES_FILE)
    val downloaded = if (f.exists()) runCatching { JSONObject(f.readText()) }.getOrNull() else null
    return downloaded ?: JSONObject(ctx.assets.open(RULES_FILE).bufferedReader().use { it.readText() })
  }

  private fun JSONArray?.strings(): List<String> = if (this == null) emptyList() else List(length()) { getString(it) }

  fun loadRules(ctx: Context): Rules {
    val r = rulesJson(ctx)
    return Rules(
      r.optInt("version", 0),
      r.optJSONArray("roots").strings(), r.optString("rootSuffix", ""), r.optJSONArray("patterns").strings(),
      r.optJSONArray("allow").strings(), r.optJSONArray("doh").strings(), r.optJSONArray("resolvers").strings(),
    )
  }

  fun hasList(ctx: Context): Boolean = File(ctx.filesDir, LIST_FILE).exists()

  fun loadMatcher(ctx: Context, rules: Rules = loadRules(ctx)): Matcher {
    val list = File(ctx.filesDir, LIST_FILE)
    val hashes = if (list.exists()) runCatching { list.inputStream().use { Matcher.readHashes(it) } }.getOrElse { LongArray(0) } else LongArray(0)
    return Matcher(rules.roots, rules.rootSuffix, rules.patterns, rules.allow, rules.doh, hashes)
  }

  fun rulesVersion(ctx: Context) = runCatching { rulesJson(ctx).optInt("version", 0) }.getOrDefault(0)
  fun listVersion(ctx: Context): String? = prefs(ctx).getString("listVersion", null)
  fun listSize(ctx: Context): Int = if (hasList(ctx)) prefs(ctx).getInt("listSize", 0) else 0
  fun listUpdatedAt(ctx: Context): Long = prefs(ctx).getLong("listUpdatedAt", 0)

  /** Kuralları ve (değiştiyse) listeyi sunucudan indirir. Ağ yoksa sessizce eski hâliyle devam eder. true: bir şey değişti. */
  fun refresh(ctx: Context): Boolean {
    val api = apiUrl(ctx) ?: return false
    val rulesText = get("$api/shield/rules") ?: return false
    val rules = runCatching { JSONObject(rulesText) }.getOrNull() ?: return false
    if (!rules.has("roots") || !rules.has("doh")) return false // beklenmeyen yanıt (örn. yakalama sayfası); eldekini koru
    var changed = false
    val rf = File(ctx.filesDir, RULES_FILE)
    if (!rf.exists() || rf.readText() != rulesText) { rf.writeText(rulesText); changed = true }
    val v = rules.optString("listVersion", "")
    if (v.isNotEmpty() && (v != listVersion(ctx) || !hasList(ctx))) {
      val conn = open("$api/shield/list") ?: return changed
      try {
        if (conn.responseCode != 200) return changed
        // Sunucu listeyi gzip ile gönderir; HttpURLConnection açarak verir
        val hashes = conn.inputStream.use { Matcher.hashList(it) }
        if (hashes.size < 1000) return changed // bozuk yanıt; eldekini koru
        val tmp = File(ctx.filesDir, "$LIST_FILE.tmp")
        tmp.outputStream().use { Matcher.writeHashes(hashes, it) }
        if (!tmp.renameTo(File(ctx.filesDir, LIST_FILE))) return changed
        prefs(ctx).edit().putString("listVersion", v).putInt("listSize", hashes.size).putLong("listUpdatedAt", System.currentTimeMillis()).apply()
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
