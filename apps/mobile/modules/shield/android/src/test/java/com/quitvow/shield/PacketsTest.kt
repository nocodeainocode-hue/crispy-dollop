package com.quitvow.shield

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class PacketsTest {
  private val client = byteArrayOf(10, 111, 222, 1)
  private val dns = byteArrayOf(10, 111, 222, 2)

  /** "jojobet1045.com" için A sorgusu (id 0x1234, RD=1) */
  private fun query(name: String, qtype: Int = 1): ByteArray {
    val q = java.io.ByteArrayOutputStream()
    q.write(byteArrayOf(0x12, 0x34, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0))
    for (l in name.split('.')) { q.write(l.length); q.write(l.toByteArray()) }
    q.write(0); q.write(0); q.write(qtype); q.write(0); q.write(1)
    return q.toByteArray()
  }

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
  }
}
