# Google Play: VpnService ve ön plan servisi beyanı (1.3.0, bahis engeli)

Bahis engeli Android'in `VpnService` altyapısını kullanır. Play Console bu uygulamalardan ayrı beyanlar ister:
**Uygulama içeriği → VPN hizmeti** ve (hedef SDK 34+) **Uygulama içeriği → Ön plan hizmeti izinleri**.
Aşağıdaki cevaplar koddaki gerçek davranışa göre yazıldı (`apps/mobile/modules/shield`); kod değişirse bunu da güncelle.

## Uygulamanın temel işlevi VPN mi?

Hayır. VPN bir araç olarak kullanılıyor; **uzak sunucuya tünel yoktur**. Play'in VpnService politikası "uzak sunucuya cihaz düzeyinde tünel" açan
uygulamaları kısıtlar; QuitVow trafiği hiçbir sunucuya yönlendirmez, yalnızca telefonun içinde adres sorgularını süzer. Formda
"VPN temel işlev değil" seçilir; izin verilen kategori olarak **cihaz güvenliği / içerik filtresi** (ebeveyn denetimi ve güvenlik duvarı
benzeri) işaretlenir. Kumar bırakmak isteyen kullanıcı, kendi isteğiyle telefonunda kumar sitelerine erişimi kapatır.

## Beyan metni (İngilizce, Console'a yapıştırılacak)

```
QuitVow helps people quit gambling. The optional "betting blocker" uses VpnService only to run an on-device DNS filter:
- Only DNS traffic is routed into the local tunnel: one private DNS address plus the IP addresses of well-known public resolvers
  (Google, Cloudflare, Quad9, OpenDNS, AdGuard, NextDNS, ...). All other traffic never enters the VPN interface.
- DNS queries for gambling domains (a public gambling blocklist plus pattern rules for newly registered mirror domains) are answered
  with NXDOMAIN on the device. All other queries are forwarded unchanged to the device's own DNS servers. TCP connections to the
  routed resolver addresses (DNS-over-HTTPS / DNS-over-TLS used to bypass the filter) are refused with a TCP RST.
- No traffic is sent to our servers or any third party, nothing is decrypted, no ads are injected, and browsing history is never
  stored or transmitted. Only a local daily count of blocked sites is kept on the device.
- The app reports to our server only whether the blocker is on or off, so that the accountability partners the user chose can be
  told if it is turned off during a commitment the user made. The block list and rules are downloaded from our server.
- The user turns the blocker on explicitly in the app (with the system VPN consent dialog) and can turn it off at any time in the
  app or in Android settings. The blocker runs as a foreground service with a persistent, silent notification.
```

## Ön plan servisi (hedef SDK 34+)

- Tür: `systemExempted` (`FOREGROUND_SERVICE_SYSTEM_EXEMPTED`). Android bu türü **VPN izni verilmiş uygulamalara** tanır
  (Ayarlar > Ağ ve internet > VPN'de yapılandırılan uygulamalar). Servis yalnız VPN onayı alındıktan sonra başlatılır; onay yoksa
  başlatılmaz (`VpnService.prepare` kontrolü hem uygulamada hem açılış alıcısında).
- Console'daki ön plan servisi formunda kullanım: "VPN / ağ filtresi: kullanıcının açtığı cihaz içi DNS filtresini, uygulama kapalıyken
  de sürdürmek". Gerekirse kısa video: engel açılır, bildirim çubuğunda "Bahis engeli açık" görünür, uygulama kapatılır, tarayıcıda
  bahis sitesi yine açılmaz.
- Neden gerekli: VpnService ön plan servisi olmazsa Android 8+ servisi arka planda bir dakika içinde durdurur; engel sessizce düşer.

## Video (Console isterse, en çok 90 sn)

Profil → Bahis engeli → "Engeli aç" → sistem VPN izin penceresi → Tamam → durum kartı "ENGEL AÇIK" → "Bir adres dene" ile `bets10.com`
→ "Engelli ✓" → tarayıcıda bets10.com açılmıyor (bildirim: "Bir bahis sitesi engellendi") → "Engeli kapat" → onay penceresi.
İkinci video (belirgin açıklama ve rıza): durum kartındaki "Android bir kez VPN bağlantısı izni sorar... trafiğin dışarı çıkmaz" metni,
sistem izin penceresi ve gizlilik politikasındaki "Bahis engeli" paragrafı.

## Veri güvenliği formu

- Yeni veri türü yok: engel "açık/kapalı" bilgisi mevcut "uygulama etkinliği / cihaz sinyali" kalemine girer (sunucuda, pakt süresince).
- Tarama geçmişi toplanmaz, aktarılmaz; filtre kararları cihazda kalır. Gizlilik politikası (`site/src/legal/*.mjs`) bunu yazar.

## Mağaza metnine eklenecek (1.3.0 ile)

```
• Bahis engeli (Android): Telefonundaki bahis ve casino sitelerine girişi kapatır. Telefonunun içinde çalışır; internet trafiğin hiçbir yere gönderilmez. Engeli kapatırsan şahitlerine haber gider.
```

## Teknik sınırlar (bilinçli)

- **"VPN olmadan bağlantıları engelle" (lockdown) desteklenmez:** tünel yalnız DNS adreslerini yönlendirdiği için bu ayar bütün interneti keser.
  Uygulama kullanıcıya yalnız "Her zaman açık VPN"i önerir ve lockdown'ı açmamasını yazar.
- **Özel DNS (sabit sunucu)**: Android'in Ayarlar > Özel DNS'inde elle sunucu adı girilmişse sorgular filtreyi atlar. Uygulama bunu algılar,
  durumu "kapalı" olarak bildirir (şahitlere haber gider) ve kullanıcıya "Otomatik" seçmesini söyler. Bilinen genel DoT sunucu adları
  (dns.google, one.one.one.one, ...) NXDOMAIN ile düştüğünden Android "Özel DNS sunucusuna erişilemiyor" der; bu bilinçlidir.
- **IPv6 çözümleyici IP'leri** tünele alınmaz (yalnız IPv4). Sistem DNS'i her durumda tünelden geçer; sabit IPv6 DNS yazılmış uygulama nadirdir.
- **Başka VPN** açılınca Android bizimkini kapatır (`onRevoke`): durum "kapalı" bildirilir, şahitlere haber gider.

## Gerçek telefonda denenecekler (yayın öncesi)

- Engel açıkken uygulamayı kapat, 10 dk bekle, tarayıcıda `bets10.com`: açılmamalı (ön plan servisi ayakta).
- Wi-Fi ↔ mobil veri geçişi: normal siteler gecikmeden açılmalı (üst DNS sunucuları ağ değişince yenilenir).
- Telefonu yeniden başlat: engel kendiliğinden kurulmalı (açılış alıcısı); "Her zaman açık VPN" ile de.
- Chrome'da "Güvenli DNS" özel sağlayıcı (https://dns.google/dns-query) seçili: bahis sitesi yine açılmamalı (DoH adı NXDOMAIN, IP'si RST).
- "Özel DNS" sabit sunucu: durum kartı kil uyarısı göstermeli; Profil satırı "Kapalı"; şahit e-postası gitmeli.
- Bildirime dokununca kriz modu açılmalı (uygulama açıkken `onOpen`, kapalıyken saklanan istek). Emülatörde doğrulanamadıysa burada not düş.
