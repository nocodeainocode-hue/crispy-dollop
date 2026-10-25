package com.quitvow.shield

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PacketsTest {
  private val client = byteArrayOf(10, 111, 222.toByte(), 1)
  private val dns = byteArrayOf(10, 111, 222.toByte(), 2)
  private val google = byteArrayOf(8, 8, 8, 8)

  /** "jojobet1045.com" için A sorgusu (id 0x1234, RD=1) */
  private fun query(name: String, qtype: Int = 1): ByteArray {
    val q = java.io.ByteArrayOutputStream()
    q.write(byteArrayOf(0x12, 0x34, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0))
    for (l in name.split('.')) { q.write(l.length); q.write(l.toByteArray()) }
    q.write(0); q.write(0); q.write(qtype); q.write(0); q.write(1)
    return q.toByteArray()
  }

  /** Ham IPv4/TCP bölütü (seçenek yok): test için. */
  private fun tcp(src: ByteArray, srcPort: Int, dst: ByteArray, dstPort: Int, seq: Long, ack: Long, flags: Int, data: Int = 0): ByteArray {
    val p = ByteArray(40 + data)
    p[0] = 0x45; p[2] = ((40 + data) ushr 8).toByte(); p[3] = (40 + data).toByte(); p[8] = 64; p[9] = 6
    System.arraycopy(src, 0, p, 12, 4); System.arraycopy(dst, 0, p, 16, 4)
    p[20] = (srcPort ushr 8).toByte(); p[21] = srcPort.toByte(); p[22] = (dstPort ushr 8).toByte(); p[23] = dstPort.toByte()
    for (i in 0..3) { p[24 + i] = (seq ushr (24 - 8 * i)).toByte(); p[28 + i] = (ack ushr (24 - 8 * i)).toByte() }
    p[32] = 0x50; p[33] = flags.toByte()
    return p
  }

  private fun u16(b: ByteArray, i: Int) = ((b[i].toInt() and 0xff) shl 8) or (b[i + 1].toInt() and 0xff)
  private fun u32(b: ByteArray, i: Int) = (u16(b, i).toLong() shl 16) or u16(b, i + 2).toLong()

  @Test fun sorguPaketiOkunur() {
    val payload = query("jojobet1045.com")
    val pkt = Packets.buildUdp4(client, 40000, dns, 53, payload)
    val udp = Packets.parseUdp4(pkt, pkt.size)!!
    assertArrayEquals(client, udp.src)
    assertArrayEquals(dns, udp.dst)
    assertEquals(40000, udp.srcPort)
    assertEquals(53, udp.dstPort)
    val q = Packets.parseQuery(pkt, udp.payloadOffset, udp.payloadLength)!!
    assertEquals("jojobet1045.com", q.name)
    assertEquals(1, q.qtype)
    assertEquals(Packets.PROTO_UDP, Packets.parseIp4(pkt, pkt.size)!!.proto)
  }

  @Test fun engelYanitiNxdomain() {
    val payload = query("bet365.com", 28)
    val q = Packets.parseQuery(payload, 0, payload.size)!!
    val r = Packets.nxdomain(payload, 0, q)
    assertEquals(0x12, r[0].toInt()); assertEquals(0x34, r[1].toInt())       // aynı kimlik
    assertEquals(0x81, r[2].toInt() and 0xff)                                // QR=1, RD=1
    assertEquals(0x83, r[3].toInt() and 0xff)                                // RA=1, NXDOMAIN
    assertEquals(1, r[5].toInt()); assertEquals(0, r[7].toInt())             // 1 soru, 0 cevap
    assertEquals(payload.size, r.size)
  }

  @Test fun ipBaslikSaglamaToplamiDogru() {
    val pkt = Packets.buildUdp4(dns, 53, client, 40000, ByteArray(10))
    assertEquals(0, Packets.checksum(pkt, 0, 20)) // doğru başlıkta toplam 0 çıkar
  }

  @Test fun bozukPaketlerReddedilir() {
    assertNull(Packets.parseUdp4(ByteArray(10), 10))
    val payload = query("a.com")
    payload[2] = 0x81.toByte() // yanıt bayrağı
    assertNull(Packets.parseQuery(payload, 0, payload.size))
    val trunc = query("example.com").copyOf(15)
    assertNull(Packets.parseQuery(trunc, 0, trunc.size))
    assertNotNull(Packets.parseQuery(query("x.co"), 0, query("x.co").size))
    // UDP paketi TCP olarak okunmaz, TCP paketi UDP olarak okunmaz
    val udp = Packets.buildUdp4(client, 1, dns, 53, query("x.co"))
    assertNull(Packets.parseTcp4(udp, udp.size))
    val syn = tcp(client, 50000, dns, 853, 1000, 0, Packets.TCP_SYN)
    assertNull(Packets.parseUdp4(syn, syn.size))
  }

  @Test fun synIcinRstAckUretilir() {
    // DoT denemesi: istemci 10.111.222.2:853'e SYN gönderir
    val syn = tcp(client, 50000, dns, 853, 1000, 0, Packets.TCP_SYN)
    val t = Packets.parseTcp4(syn, syn.size)!!
    assertEquals(853, t.dstPort); assertEquals(1000L, t.seq); assertEquals(Packets.TCP_SYN, t.flags); assertEquals(0, t.dataLength)
    val r = Packets.tcpRst(t)
    assertEquals(40, r.size)
    val back = Packets.parseTcp4(r, r.size)!!
    assertArrayEquals(dns, back.src); assertArrayEquals(client, back.dst)           // adresler ters
    assertEquals(853, back.srcPort); assertEquals(50000, back.dstPort)               // portlar ters
    assertEquals(0L, back.seq); assertEquals(1001L, back.ack)                        // ack = seq + 1 (SYN)
    assertEquals(Packets.TCP_RST or Packets.TCP_ACK, back.flags)
    assertEquals(0, Packets.checksum(r, 0, 20))                                      // IP başlığı
    assertEquals(0, Packets.tcpChecksum(r, 20, 20, dns, client))                     // TCP sağlama toplamı (sahte başlıkla) 0 çıkar
  }

  @Test fun ackTasiyanBolutIcinRst() {
    // Kurulu bağlantıda veri: seq = gelen ack, bayrak yalnız RST
    val seg = tcp(client, 50001, google, 443, 5000, 777, Packets.TCP_ACK, data = 12)
    val t = Packets.parseTcp4(seg, seg.size)!!
    assertEquals(12, t.dataLength)
    val r = Packets.tcpRst(t)
    assertEquals(777L, u32(r, 24))
    assertEquals(Packets.TCP_RST, r[33].toInt() and 0x3f)
    assertArrayEquals(google, r.copyOfRange(12, 16))
    assertEquals(0, Packets.tcpChecksum(r, 20, 20, google, client))
  }

  @Test fun uzunVeriliBolutteAckIleriSarar() {
    val seg = tcp(client, 50002, dns, 53, 100, 0, Packets.TCP_FIN, data = 10)
    val r = Packets.tcpRst(Packets.parseTcp4(seg, seg.size)!!)
    assertEquals(111L, u32(r, 28)) // 100 + 10 veri + 1 FIN
    assertTrue((r[33].toInt() and Packets.TCP_ACK) != 0)
  }
}
