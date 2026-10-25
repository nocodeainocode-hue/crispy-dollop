package com.quitvow.shield

/**
 * Engellenen adların kısa süreli hafızası. Tek bir sayfa açılışı aynı ad için onlarca DNS sorgusu üretir (A, AAAA, HTTPS, yeniden
 * denemeler); sayaç ve bildirim yalnız bir adın penceredeki İLK engellenişinde çalışır. Android'e bağımlı değildir.
 */
class BlockLog(private val windowMs: Long = 60_000L, private val cap: Int = 256) {
  private val seen = object : LinkedHashMap<String, Long>(64, 0.75f, true) {
    override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Long>?) = size > cap
  }

  /** true: bu ad (kayıt edilebilir alan adı düzeyinde) pencere içinde ilk kez engelleniyor. Pencere ilk engellemeden başlar (en çok dakikada bir sayım). */
  @Synchronized
  fun first(name: String, now: Long = System.currentTimeMillis()): Boolean {
    val key = Matcher.registrable(name)
    val last = seen[key]
    if (last != null && now - last <= windowMs) return false
    seen[key] = now
    return true
  }
}
