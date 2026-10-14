package com.quitvow.shield

/**
 * VPN tünelinden gelen IPv4/UDP paketlerini ve içlerindeki DNS sorgularını okur, yanıt paketlerini kurar.
 * Tünele yalnızca sahte DNS sunucusunun adresi yönlendirildiği için başka trafik buraya gelmez.
 */
object Packets {
  class Udp4(
    val src: ByteArray, val dst: ByteArray,
    val srcPort: Int, val dstPort: Int,
    val payloadOffset: Int, val payloadLength: Int,
  )

  class DnsQuery(val name: String, val qtype: Int, val questionEnd: Int)

  private fun u16(b: ByteArray, i: Int) = ((b[i].toInt() and 0xff) shl 8) or (b[i + 1].toInt() and 0xff)
  private fun put16(b: ByteArray, i: Int, v: Int) { b[i] = (v ushr 8).toByte(); b[i + 1] = v.toByte() }

  fun parseUdp4(p: ByteArray, len: Int): Udp4? {
    if (len < 28) return null
    if ((p[0].toInt() ushr 4) != 4) return null
    val ihl = (p[0].toInt() and 0x0f) * 4
    if (ihl < 20 || len < ihl + 8) return null
    if ((p[9].toInt() and 0xff) != 17) return null // UDP değil
    if ((u16(p, 6) and 0x3fff) != 0) return null    // parçalı paket (DNS sorgularında olmaz)
    val total = minOf(u16(p, 2), len)
    val udpLen = u16(p, ihl + 4)
    val payloadLen = minOf(udpLen - 8, total - ihl - 8)
    if (payloadLen <= 0) return null
    return Udp4(p.copyOfRange(12, 16), p.copyOfRange(16, 20), u16(p, ihl), u16(p, ihl + 2), ihl + 8, payloadLen)
  }

  /** DNS sorgusunun ilk sorusunu okur (sorgularda sıkıştırma işaretçisi kullanılmaz). */
  fun parseQuery(d: ByteArray, off: Int, len: Int): DnsQuery? {
    if (len < 17) return null
    val flags = u16(d, off + 2)
    if ((flags and 0x8000) != 0) return null // yanıt, sorgu değil
    if (u16(d, off + 4) < 1) return null
    val sb = StringBuilder()
    var i = off + 12
    val end = off + len
    while (true) {
      if (i >= end) return null
      val l = d[i].toInt() and 0xff
      if (l == 0) { i++; break }
      if (l > 63 || i + 1 + l > end) return null
      if (sb.isNotEmpty()) sb.append('.')
      for (k in 1..l) sb.append((d[i + k].toInt() and 0xff).toChar())
      i += 1 + l
    }
    if (i + 4 > end) return null
    return DnsQuery(sb.toString(), u16(d, i), i + 4)
  }

  /** Engellenen ad için yanıt: "böyle bir ad yok" (NXDOMAIN). Tarayıcı "siteye ulaşılamıyor" gösterir. */
  fun nxdomain(d: ByteArray, off: Int, q: DnsQuery): ByteArray {
    val qLen = q.questionEnd - off
    val r = d.copyOfRange(off, off + qLen)
    val rd = r[2].toInt() and 0x01
    r[2] = (0x80 or (r[2].toInt() and 0x78) or rd).toByte() // QR=1, opcode aynı, RD aynı
    r[3] = (0x80 or 3).toByte()                              // RA=1, RCODE=3
    put16(r, 4, 1); put16(r, 6, 0); put16(r, 8, 0); put16(r, 10, 0)
    return r
  }

  /** src:srcPort → dst:dstPort IPv4/UDP paketi (UDP sağlama toplamı IPv4'te isteğe bağlıdır; 0 bırakılır). */
  fun buildUdp4(src: ByteArray, srcPort: Int, dst: ByteArray, dstPort: Int, payload: ByteArray, payloadLen: Int = payload.size): ByteArray {
    val total = 20 + 8 + payloadLen
    val p = ByteArray(total)
    p[0] = 0x45
    put16(p, 2, total)
    p[6] = 0x40 // parçalama yok
    p[8] = 64   // TTL
    p[9] = 17   // UDP
    System.arraycopy(src, 0, p, 12, 4)
    System.arraycopy(dst, 0, p, 16, 4)
    put16(p, 10, checksum(p, 0, 20))
    put16(p, 20, srcPort)
    put16(p, 22, dstPort)
    put16(p, 24, 8 + payloadLen)
    System.arraycopy(payload, 0, p, 28, payloadLen)
    return p
  }

  fun checksum(b: ByteArray, off: Int, len: Int): Int {
    var sum = 0L
    var i = off
    while (i < off + len - 1) { sum += u16(b, i); i += 2 }
    if ((len and 1) == 1) sum += (b[off + len - 1].toInt() and 0xff) shl 8
    while ((sum ushr 16) != 0L) sum = (sum and 0xffff) + (sum ushr 16)
    return (sum.inv() and 0xffff).toInt()
  }
}
