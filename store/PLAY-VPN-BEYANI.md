# Google Play: VpnService beyanı (2. sürüm, bahis engeli)

Bahis engeli Android'in `VpnService` altyapısını kullanır. Play Console bu uygulamalardan ayrı bir beyan ister:
**Uygulama içeriği → VPN hizmeti** (ya da güncel adıyla "Foreground service / VpnService declaration"). Aşağıdaki cevaplar koddaki gerçek davranışa göre yazıldı; kod değişirse bunu da güncelle.

## Uygulamanın temel işlevi VPN mi?

Hayır, VPN bir araç olarak kullanılıyor. Play politikasında izin verilen kategori: **cihaz güvenliği / içerik filtresi** (ebeveyn denetimi ve güvenlik duvarı benzeri). Kumar bırakmak isteyen kullanıcı, kendi isteğiyle telefonunda kumar sitelerine erişimi kapatır.

## Beyan metni (İngilizce, Console'a yapıştırılacak)

```
QuitVow helps people quit gambling. The optional "betting blocker" uses VpnService only to run an on-device DNS filter:
- Only DNS queries are routed into the local tunnel (a single private DNS address is routed); all other traffic bypasses the VPN.
- Queries for gambling domains (a public gambling blocklist plus pattern rules) are answered with NXDOMAIN on the device; all other queries are forwarded unchanged to the device's own DNS servers.
- No traffic is sent to our servers or any third party, nothing is decrypted, no ads are injected, and browsing history is never stored or transmitted. Only a local daily count of blocked lookups is kept on the device.
- The app reports to our server only whether the blocker is on or off, so that the user's chosen accountability partners can be told if it is turned off during a commitment the user made.
- The user turns the blocker on explicitly in the app (with the system VPN consent dialog) and can turn it off at any time in the app or in Android settings.
```

## Video (Console isterse)

Kısa ekran kaydı: Profil → Bahis engeli → "Engeli aç" → sistem VPN izin penceresi → Tamam → durum "ENGEL AÇIK" → "Bir adres dene" ile `bet365.com` → "Engelli ✓" → tarayıcıda bet365.com açılmıyor → "Engeli kapat".

## Mağaza metnine eklenecek (2. sürüm yayınlanınca)

```
• Bahis engeli (Android): Telefonundaki bahis ve casino sitelerine girişi kapatır. Telefonunun içinde çalışır; internet trafiğin hiçbir yere gönderilmez. Engeli kapatırsan şahitlerine haber gider.
```

## Açık konular (2. sürüm)

- **Bildirime dokununca kriz modu açılmıyor.** Bildirim geliyor; dokununca görünmez ara ekran (ShieldOpenActivity) isteği kaydediyor ve uygulamayı öne getiriyor, ancak uygulama öne geldiğinde JS tarafı kaydı okumuyor (App.tsx'teki AppState "active" dinleyicisi tetiklenmiyor gibi). Emülatörde JS kayıtları logcat'e düşmediği için ayıklanamadı; React Native DevTools ile bakılacak. Şu an bildirime dokununca uygulama son kaldığı ekranda açılıyor.
- Ayarlar'dan VPN'i kapatma, telefonu yeniden başlatma ve başka VPN açma senaryoları gerçek telefonda denenmeli.
