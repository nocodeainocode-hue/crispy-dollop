package com.quitvow.shield

/**
 * VPN tünelinden gelen IPv4 paketlerini okur ve yanıt paketlerini kurar. Tünele yalnızca sahte DNS sunucusunun adresi ve
 * bilinen genel çözümleyicilerin adresleri yönlendirildiği için başka trafik buraya gelmez.
 * - UDP/53: DNS sorgusu (okunur, filtrelenir, iletilir ya da NXDOMAIN ile yanıtlanır)
 * - TCP (DoT 853, DoH 443, DNS/TCP 53): RST ile hemen reddedilir; istemci beklemeden "bağlantı yok" görür
 */
object Packets {
  const val PROTO_TCP = 6
  const val PROTO_UDP = 17
  const val TCP_FIN = 0x01
  const val TCP_SYN = 0x02
  const val TCP_RST = 0x04
  const val TCP_ACK = 0x10

  class Ip4(val proto: Int, val src: ByteArray, val dst: ByteArray, val ihl: Int, val total: Int)

  class Udp4(
    val src: ByteArray, val dst: ByteArray,
    val srcPort: Int, val dstPort: Int,
    val payloadOffset: Int, val payloadLength: Int,
  )

  /** TCP bölütü (yalnız RST üretmek için gereken alanlar). */
  class Tcp4(
    val src: ByteArray, val dst: ByteArray,
    val srcPort: Int, val dstPort: Int,
    val seq: Long, val ack: Long, val flags: Int, val dataLength: Int,
  )

  class DnsQuery(val name: String, val qtype: Int, val questionEnd: Int)

  private fun u16(b: ByteArray, i: Int) = ((b[i].toInt() and 0xff) shl 8) or (b[i + 1].toInt() and 0xff)
  private fun u32(b: ByteArray, i: Int) = (u16(b, i).toLong() shl 16) or u16(b, i + 2).toLong()
  private fun put16(b: ByteArray, i: Int, v: Int) { b[i] = (v ushr 8).toByte(); b[i + 1] = v.toByte() }
  private fun put32(b: ByteArray, i: Int, v: Long) { put16(b, i, (v ushr 16).toInt() and 0xffff); put16(b, i + 2, v.toInt() and 0xffff) }

  /** IPv4 başlığı: parçalı paketler ve bozuk başlıklar reddedilir. */
  fun parseIp4(p: ByteArray, len: Int): Ip4? {
    if (len < 20) return null
    if ((p[0].toInt() ushr 4) != 4) return null
    val ihl = (p[0].toInt() and 0x0f) * 4
    if (ihl < 20 || len < ihl) return null
    if ((u16(p, 6) and 0x3fff) != 0) return null // parçalı paket (DNS sorgularında olmaz)
    val total = minOf(u16(p, 2), len)
    if (total < ihl) return null
    return Ip4(p[9].toInt() and 0xff, p.copyOfRange(12, 16), p.copyOfRange(16, 20), ihl, total)
  }

  fun parseUdp4(p: ByteArray, len: Int): Udp4? {
    val ip = parseIp4(p, len) ?: return null
    if (ip.proto != PROTO_UDP || ip.total < ip.ihl + 8) return null
    val udpLen = u16(p, ip.ihl + 4)
    val payloadLen = minOf(udpLen - 8, ip.total - ip.ihl - 8)
    if (payloadLen <= 0) return null
    return Udp4(ip.src, ip.dst, u16(p, ip.ihl), u16(p, ip.ihl + 2), ip.ihl + 8, payloadLen)
  }

  fun parseTcp4(p: ByteArray, len: Int): Tcp4? {
    val ip = parseIp4(p, len) ?: return null
    if (ip.proto != PROTO_TCP || ip.total < ip.ihl + 20) return null
    val o = ip.ihl
    val dataOff = ((p[o + 12].toInt() and 0xf0) ushr 4) * 4
    if (dataOff < 20 || ip.total < o + dataOff) return null
    return Tcp4(ip.src, ip.dst, u16(p, o), u16(p, o + 2), u32(p, o + 4), u32(p, o + 8), p[o + 13].toInt() and 0x3f, ip.total - o - dataOff)
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

  private fun ip4Header(p: ByteArray, proto: Int, src: ByteArray, dst: ByteArray, total: Int) {
    p[0] = 0x45
    put16(p, 2, total)
    p[6] = 0x40 // parçalama yok
    p[8] = 64   // TTL
    p[9] = proto.toByte()
    System.arraycopy(src, 0, p, 12, 4)
    System.arraycopy(dst, 0, p, 16, 4)
    put16(p, 10, checksum(p, 0, 20))
  }

  /** src:srcPort → dst:dstPort IPv4/UDP paketi (UDP sağlama toplamı IPv4'te isteğe bağlıdır; 0 bırakılır). */
  fun buildUdp4(src: ByteArray, srcPort: Int, dst: ByteArray, dstPort: Int, payload: ByteArray, payloadLen: Int = payload.size): ByteArray {
    val total = 20 + 8 + payloadLen
    val p = ByteArray(total)
    ip4Header(p, PROTO_UDP, src, dst, total)
    put16(p, 20, srcPort)
    put16(p, 22, dstPort)
    put16(p, 24, 8 + payloadLen)
    System.arraycopy(payload, 0, p, 28, payloadLen)
    return p
  }

  /**
   * Gelen TCP bölütüne RST yanıtı (RFC 793 §3.4): ACK taşıyorsa seq = gelen ack, bayrak RST; taşımıyorsa (SYN) seq = 0,
   * ack = gelen seq + veri (+1 SYN/FIN), bayrak RST|ACK. TCP sağlama toplamı zorunludur (sahte başlıkla hesaplanır).
   */
  fun tcpRst(t: Tcp4): ByteArray {
    val p = ByteArray(40)
    ip4Header(p, PROTO_TCP, t.dst, t.src, 40)
    put16(p, 20, t.dstPort)
    put16(p, 22, t.srcPort)
    val hasAck = (t.flags and TCP_ACK) != 0
    if (hasAck) {
      put32(p, 24, t.ack)
      put32(p, 28, 0)
      p[33] = TCP_RST.toByte()
    } else {
      var ack = t.seq + t.dataLength
      if ((t.flags and TCP_SYN) != 0) ack++
      if ((t.flags and TCP_FIN) != 0) ack++
      put32(p, 24, 0)
      put32(p, 28, ack and 0xffffffffL)
      p[33] = (TCP_RST or TCP_ACK).toByte()
    }
    p[32] = (5 shl 4).toByte() // veri ofseti 5 (20 bayt)
    put16(p, 34, 0)            // pencere
    put16(p, 36, tcpChecksum(p, 20, 20, t.dst, t.src))
    return p
  }

  /** TCP sağlama toplamı: sahte başlık (kaynak, hedef, 0, protokol, uzunluk) + bölüt. */
  fun tcpChecksum(p: ByteArray, off: Int, len: Int, src: ByteArray, dst: ByteArray): Int {
    val pseudo = ByteArray(12)
    System.arraycopy(src, 0, pseudo, 0, 4)
    System.arraycopy(dst, 0, pseudo, 4, 4)
    pseudo[9] = PROTO_TCP.toByte()
    put16(pseudo, 10, len)
    var sum = sum16(pseudo, 0, 12) + sum16(p, off, len)
    while ((sum ushr 16) != 0L) sum = (sum and 0xffff) + (sum ushr 16)
    return (sum.inv() and 0xffff).toInt()
  }

  private fun sum16(b: ByteArray, off: Int, len: Int): Long {
    var sum = 0L
    var i = off
    while (i < off + len - 1) { sum += u16(b, i); i += 2 }
    if ((len and 1) == 1) sum += (b[off + len - 1].toInt() and 0xff) shl 8
    return sum
  }

  fun checksum(b: ByteArray, off: Int, len: Int): Int {
    var sum = sum16(b, off, len)
    while ((sum ushr 16) != 0L) sum = (sum and 0xffff) + (sum ushr 16)
    return (sum.inv() and 0xffff).toInt()
  }
}
