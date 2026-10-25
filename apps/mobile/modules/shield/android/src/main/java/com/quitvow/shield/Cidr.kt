package com.quitvow.shield

/**
 * IPv4 adres aralıkları ("8.8.8.8", "45.90.28.0/24"). Bilinen genel DNS çözümleyicilerinin adresleri tünele yönlendirilir:
 * sistem DNS'ini atlayıp doğrudan 8.8.8.8'e soran uygulama da filtreden geçer; o adreslere giden DoH/DoT (TCP) reddedilir.
 */
class Cidr private constructor(private val nets: IntArray, private val masks: IntArray) {
  val size: Int get() = nets.size

  fun contains(ip: ByteArray): Boolean {
    if (ip.size != 4) return false
    val v = toInt(ip)
    for (i in nets.indices) if ((v and masks[i]) == nets[i]) return true
    return false
  }

  companion object {
    val EMPTY = Cidr(IntArray(0), IntArray(0))

    fun toInt(ip: ByteArray): Int =
      ((ip[0].toInt() and 0xff) shl 24) or ((ip[1].toInt() and 0xff) shl 16) or ((ip[2].toInt() and 0xff) shl 8) or (ip[3].toInt() and 0xff)

    fun toBytes(v: Int): ByteArray = byteArrayOf((v ushr 24).toByte(), (v ushr 16).toByte(), (v ushr 8).toByte(), v.toByte())

    private fun mask(bits: Int): Int = if (bits == 0) 0 else (-1 shl (32 - bits))

    /** "1.2.3.0/24" → (ağ adresi, önek). Ana bilgisayar bitleri temizlenir (Android addRoute bunu ister). Bozuksa null. */
    fun parseOne(s: String): Pair<ByteArray, Int>? {
      val t = s.trim()
      val slash = t.indexOf('/')
      val addr = if (slash < 0) t else t.substring(0, slash)
      val bits = if (slash < 0) 32 else t.substring(slash + 1).toIntOrNull() ?: return null
      if (bits !in 0..32) return null
      val parts = addr.split('.')
      if (parts.size != 4) return null
      var v = 0
      for (p in parts) { val n = p.toIntOrNull() ?: return null; if (n !in 0..255) return null; v = (v shl 8) or n }
      return toBytes(v and mask(bits)) to bits
    }

    fun parse(list: List<String>): Cidr {
      val parsed = list.mapNotNull(::parseOne)
      val nets = IntArray(parsed.size) { toInt(parsed[it].first) }
      val masks = IntArray(parsed.size) { mask(parsed[it].second) }
      return Cidr(nets, masks)
    }
  }
}
