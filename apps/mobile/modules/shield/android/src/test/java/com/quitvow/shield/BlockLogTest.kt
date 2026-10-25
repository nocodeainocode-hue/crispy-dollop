package com.quitvow.shield

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BlockLogTest {
  @Test fun ayniSiteninArtArdaSorgulariBirKezSayilir() {
    val log = BlockLog(windowMs = 60_000)
    assertTrue(log.first("bet365.com", 1_000))
    assertFalse(log.first("www.bet365.com", 1_500))       // alt alan adı aynı site
    assertFalse(log.first("m.sports.bet365.com", 30_000))
    assertTrue(log.first("jojobet.com", 31_000))           // başka site
    assertTrue(log.first("bet365.com", 62_000))            // pencere geçti
  }

  @Test fun ulkeKoduIkinciDuzeyAyrilir() {
    val log = BlockLog(windowMs = 60_000)
    assertTrue(log.first("www.royalcasino.com.tr", 0))
    assertFalse(log.first("royalcasino.com.tr", 10))
    assertTrue(log.first("baskacasino.com.tr", 20))
  }

  @Test fun kapasiteDolduğundaEnEskiAtilir() {
    val log = BlockLog(windowMs = 60_000, cap = 2)
    assertTrue(log.first("a.com", 0)); assertTrue(log.first("b.com", 1)); assertTrue(log.first("c.com", 2))
    assertTrue(log.first("a.com", 3)) // a atıldı: yeniden "ilk"
  }
}
