package com.quitvow.shield

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.File

class MatcherTest {
  // Gerçek kurallar (pakete gömülen kopya) ve küçük bir örnek liste
  private val rules = JSONObject(File("src/main/assets/shield-rules.json").readText())
  private fun arr(k: String) = rules.getJSONArray(k).let { a -> List(a.length()) { a.getString(it) } }
  private val list = Matcher.hashList("""
    # yorum
    bet365.com
    jojobet.com
    nesine.com
    iddaa.com.
  """.trimIndent().byteInputStream())
  private val m = Matcher(arr("roots"), rules.getString("rootSuffix"), arr("patterns"), arr("allow"), arr("doh"), list)

  @Test fun listeVeAltAlanAdlari() {
    assertEquals(Matcher.Reason.LIST, m.check("bet365.com"))
    assertEquals(Matcher.Reason.LIST, m.check("www.bet365.com."))
    assertEquals(Matcher.Reason.LIST, m.check("m.sports.BET365.com"))
    assertEquals(Matcher.Reason.LIST, m.check("iddaa.com"))
  }

  @Test fun listedeOlmayanYeniAdreslerKurallaYakalanir() {
    assertEquals(Matcher.Reason.RULE, m.check("jojobet10412.com"))
    assertEquals(Matcher.Reason.RULE, m.check("www.grandpashabet8260.com"))
    assertEquals(Matcher.Reason.RULE, m.check("sekabet-giris.net"))
    assertEquals(Matcher.Reason.RULE, m.check("2014marsbahis.com"))
    assertEquals(Matcher.Reason.RULE, m.check("canli-bahis-siteleri.com"))
    assertEquals(Matcher.Reason.RULE, m.check("superslot77.xyz"))
    assertEquals(Matcher.Reason.RULE, m.check("royalcasino.com.tr"))
  }

  @Test fun tarayicininGizliDnsSunucuları() {
    assertEquals(Matcher.Reason.DOH, m.check("dns.google"))
    assertEquals(Matcher.Reason.DOH, m.check("chrome.cloudflare-dns.com"))
  }

  @Test fun mesruSitelerEngellenmez() {
    for (d in listOf("google.com", "alphabet.com", "betterhelp.com", "bethesda.net", "betul.com.tr", "hurriyet.com.tr",
        "trendyol.com", "ziraatbank.com.tr", "e-devlet.gov.tr", "occasion.fr", "slotmachine-museum.org", "betonarme.com.tr",
        "yesilay.org.tr", "api.quitvow.com.tr", "youtube.com", "whatsapp.net")) {
      assertNull(d, m.check(d))
    }
  }

  @Test fun gecersizAdlar() {
    assertNull(m.check(""))
    assertNull(m.check("localhost"))
  }

  @Test fun ozetDosyasiYazilipOkunur() {
    val f = File.createTempFile("list", ".bin")
    f.outputStream().use { Matcher.writeHashes(list, it) }
    val back = f.inputStream().use { Matcher.readHashes(it) }
    assertEquals(list.toList(), back.toList())
    assertEquals(4, back.size) // tekrarsız; "iddaa.com." normalize edilir
  }

  @Test fun kayitEdilebilirEtiket() {
    assertEquals("ornek", Matcher.registrableLabel("www.ornek.com.tr"))
    assertEquals("jojobet1", Matcher.registrableLabel("a.b.jojobet1.com"))
    assertEquals(listOf("a.b.c.com", "b.c.com", "c.com"), Matcher.suffixes("a.b.c.com"))
  }
}
