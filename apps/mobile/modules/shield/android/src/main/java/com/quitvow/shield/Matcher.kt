package com.quitvow.shield

import java.io.BufferedReader
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.InputStream
import java.io.OutputStream

/**
 * Bir alan adının engellenip engellenmeyeceğine karar verir. Android'e bağımlı değildir (bilgisayarda test edilir).
 *
 * Sıra: izin listesi → DoH sunucuları (tarayıcının filtreyi atlatmasını önler) → kumar listesi (alan adı ve üst alan adları)
 * → Türkiye kuralları (marka kökleri + desenler; listede olmayan yeni adresleri yakalar, örn. jojobet10412.com).
 * Liste 279 bin adres içerdiği için bellekte metin değil, sıralı 64 bitlik özet (FNV-1a) dizisi olarak tutulur (~2 MB).
 */
class Matcher(
  roots: List<String>,
  rootSuffix: String,
  patterns: List<String>,
  allow: List<String>,
  doh: List<String>,
  private val hashes: LongArray,
) {
  enum class Reason { DOH, LIST, RULE }

  private val allowSet = allow.map { it.lowercase() }.toHashSet()
  private val dohSet = doh.map { it.lowercase() }.toHashSet()
  private val rootRe: Regex? = roots.takeIf { it.isNotEmpty() }?.let { r ->
    Regex("^[0-9]{0,4}(?:" + r.sortedByDescending { it.length }.joinToString("|") { Regex.escape(it.lowercase()) } + ")$rootSuffix$")
  }
  private val patternRes = patterns.map { Regex(it) }

  val listSize: Int get() = hashes.size

  fun check(rawName: String): Reason? {
    val name = normalize(rawName) ?: return null
    val suffixes = suffixes(name)
    if (suffixes.any { it in allowSet }) return null
    if (suffixes.any { it in dohSet }) return Reason.DOH
    if (hashes.isNotEmpty() && suffixes.any { hashes.binarySearch(fnv64(it)) >= 0 }) return Reason.LIST
    val label = registrableLabel(name)
    if (rootRe?.matches(label) == true) return Reason.RULE
    if (patternRes.any { it.containsMatchIn(label) }) return Reason.RULE
    return null
  }

  companion object {
    /** Ülke kodlu ikinci düzey sonekler (example.com.tr → "example"). */
    private val SECOND_LEVEL = setOf("com", "co", "net", "org", "gen", "web", "info", "biz", "bel", "gov", "edu", "ac", "tv", "av", "k12")

    fun normalize(raw: String): String? {
      val n = raw.trim().trimEnd('.').lowercase()
      return if (n.length in 3..253 && n.contains('.')) n else null
    }

    /** a.b.example.com → [a.b.example.com, b.example.com, example.com] (tek başına "com" yok) */
    fun suffixes(name: String): List<String> {
      val out = ArrayList<String>(4)
      var i = 0
      var s = name
      while (true) {
        out.add(s)
        i = s.indexOf('.')
        if (i < 0) break
        s = s.substring(i + 1)
        if (!s.contains('.')) break
      }
      return out
    }

    fun registrableLabel(name: String): String {
      val p = name.split('.')
      if (p.size >= 3 && p[p.size - 2] in SECOND_LEVEL && p.last().length == 2) return p[p.size - 3]
      return if (p.size >= 2) p[p.size - 2] else p[0]
    }

    fun fnv64(s: String): Long {
      var h = -0x340d631b7bdddcdbL // 0xcbf29ce484222325
      for (ch in s) {
        h = h xor (ch.code.toLong() and 0xff)
        h *= 0x100000001b3L
      }
      return h
    }

    /** Bir satıra bir alan adı olan listeyi (yorumlar # ile) sıralı, tekrarsız özet dizisine çevirir. */
    fun hashList(input: InputStream): LongArray {
      var arr = LongArray(1 shl 16)
      var n = 0
      input.bufferedReader().use { r: BufferedReader ->
        while (true) {
          val line = r.readLine() ?: break
          val d = normalize(line.substringBefore('#')) ?: continue
          if (n == arr.size) arr = arr.copyOf(arr.size * 2)
          arr[n++] = fnv64(d)
        }
      }
      val sorted = arr.copyOf(n).also { it.sort() }
      // tekrarları at
      var w = 0
      for (i in sorted.indices) if (i == 0 || sorted[i] != sorted[i - 1]) sorted[w++] = sorted[i]
      return sorted.copyOf(w)
    }

    fun writeHashes(hashes: LongArray, out: OutputStream) {
      DataOutputStream(out.buffered()).use { d -> d.writeInt(hashes.size); for (h in hashes) d.writeLong(h) }
    }

    fun readHashes(input: InputStream): LongArray =
      DataInputStream(input.buffered()).use { d -> LongArray(d.readInt()) { d.readLong() } }
  }
}
