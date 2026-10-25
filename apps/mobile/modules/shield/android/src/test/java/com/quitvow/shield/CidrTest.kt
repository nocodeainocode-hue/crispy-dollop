package com.quitvow.shield

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CidrTest {
  private val c = Cidr.parse(listOf("8.8.8.8", "45.90.28.0/24", "76.76.2.11/24", "bozuk", "1.2.3.4/33", "300.1.1.1"))

  @Test fun tekAdresVeAralik() {
    assertEquals(3, c.size) // bozuk girdiler atlanır
    assertTrue(c.contains(byteArrayOf(8, 8, 8, 8)))
    assertFalse(c.contains(byteArrayOf(8, 8, 4, 4)))
    assertTrue(c.contains(byteArrayOf(45, 90, 28, 200.toByte())))
    assertFalse(c.contains(byteArrayOf(45, 90, 29, 1)))
    assertTrue(c.contains(byteArrayOf(76, 76, 2, 0)))   // ana bilgisayar bitleri temizlenmiş /24
    assertFalse(c.contains(byteArrayOf(10, 111, 222.toByte(), 2)))
    assertFalse(Cidr.EMPTY.contains(byteArrayOf(8, 8, 8, 8)))
  }

  @Test fun agAdresiTemizlenir() {
    val (net, bits) = Cidr.parseOne("76.76.2.11/24")!!
    assertArrayEquals(byteArrayOf(76, 76, 2, 0), net)
    assertEquals(24, bits)
    assertEquals(32, Cidr.parseOne("9.9.9.9")!!.second)
    assertNull(Cidr.parseOne("1.2.3"))
    assertNull(Cidr.parseOne("1.2.3.4/abc"))
  }
}
