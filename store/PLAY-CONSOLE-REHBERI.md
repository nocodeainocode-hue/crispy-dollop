# Google Play Console: adım adım (1. sürüm ve 1.2.0 güncellemesi)

Sırasıyla ilerle. Köşeli parantezli yerleri kendin doldur. Metinler `MAGAZA-METINLERI.md`'de, görseller `store/play/` klasöründe.
**1.2.0 güncellemesi için** yalnızca şu bölümlere bak: 2 (içerik derecelendirmesi, veri güvenliği, uygulama erişimi), 3 (mağaza girişi), 4 (sürüm ve kademeli yayın). Uygulama zaten oluşturulduğundan 1. bölüm referans içindir.

## 1. Uygulamayı oluştur

**Tüm uygulamalar → Uygulama oluştur**

| Alan | Cevap |
|---|---|
| Uygulama adı | `QuitVow: Bahis ve Kumarı Bırak` |
| Varsayılan dil | Türkçe – tr-TR |
| Uygulama mı, oyun mu | Uygulama |
| Ücretsiz mi, ücretli mi | Ücretsiz (paketler uygulama içi satın alma: `pack_30`, `pack_60`, `pack_90`, tek seferlik; uygulama yine "ücretsiz" kalır) |
| Beyanlar | Geliştirici Programı Politikaları ve ABD ihracat yasaları kutularını işaretle |

## 2. Uygulama içeriği (Politika → Uygulama içeriği)

### Gizlilik politikası
`https://quitvow.com.tr/gizlilik/`

### Uygulama erişimi
"Tüm işlevler veya bazıları kısıtlı" → **Talimat ekle**:
- Ad: `İnceleme hesabı`
- Kullanıcı adı / e-posta: `[REVIEW_EMAIL]`
- Şifre: `[REVIEW_CODE]`
- Diğer bilgiler:
```
Sign in: on the first screen tap "I already have an account · sign in". Enter any name, the email above and tap "Send code". No email is sent to this address; enter the 6-digit code above as the code. Then you can create a pact (choose "Start without a witness" to skip inviting real people).
Payments: the 7-day trial is free and needs no payment. The 30/60/90-day packs are one-time in-app purchases through Google Play (not a subscription); you do not need to buy anything to review the app.
```

### Reklamlar
Hayır, uygulamada reklam yok.

### İçerik derecelendirmesi
- E-posta: `[iletişim adresin]`
- Kategori: **Diğer tüm uygulama türleri**
- Şiddet, cinsellik, küfür, uyuşturucu: hepsi **Hayır**
- "Kumar / simüle kumar içeriyor mu": **Hayır**. Uygulama kumarı bırakmaya yardım ediyor; kumar oynatmıyor, kumar içeriği göstermiyor.
- Kullanıcı etkileşimi / kullanıcıların içerik paylaşması: **Hayır**. Şahitlere giden mailler sabit şablondur; kullanıcılar birbirleriyle serbest mesajlaşmaz.
- Konum paylaşımı: Hayır. Dijital ürün satın alma: **Evet** (1.2.0'dan itibaren: tek seferlik uygulama içi paketler, abonelik yok).

### Hedef kitle ve içerik
- Hedef yaş grubu: **Yalnızca 18 ve üzeri**
- Çocukların ilgisini çekebilir mi: Hayır

### Haber uygulaması: Hayır
### Kamu kurumu uygulaması: Hayır
### Finansal özellikler: Hiçbiri

### Sağlık uygulamaları
Kategori: "Sağlık ve fitness". Özelliklerde **Ruh ve davranış sağlığı / bağımlılık desteği** benzeri seçeneği işaretle. Tıbbi cihaz değil, teşhis koymuyor, tedavi değil.

### Veri güvenliği
**Veri toplama ve güvenlik:**
- Kullanıcı verisi topluyor ya da paylaşıyor musunuz: **Evet**
- Aktarılan tüm veriler şifreleniyor mu: **Evet**
- Kullanıcılar veri silmeyi isteyebilir mi: **Evet**
- Hesap silme adresi: `https://quitvow.com.tr/gizlilik/` (8. bölüm: uygulama içinden ve e-postayla silme)

**Toplanan veri türleri** (hepsinde: *paylaşılmıyor*, *toplanıyor*, *şifreli aktarılıyor*):

| Tür | Zorunlu mu | Amaç |
|---|---|---|
| Kişisel bilgiler → E-posta adresi | Zorunlu | Uygulama işlevselliği, Hesap yönetimi |
| Kişisel bilgiler → Ad | İsteğe bağlı | Uygulama işlevselliği |
| Kişisel bilgiler → Diğer bilgiler (şahitlerin adı ve e-postası) | İsteğe bağlı | Uygulama işlevselliği |
| Sağlık ve fitness → Sağlık bilgileri (bırakılan alışkanlık türü, dürtü puanı) | Zorunlu | Uygulama işlevselliği |
| Uygulama etkinliği → Uygulama etkileşimleri (günlük kontrol, kriz butonu, tekrar oynama bildirimi) | Zorunlu | Uygulama işlevselliği |
| Uygulama bilgileri ve performans → Diğer (son sinyal zamanı, cihaz platformu) | Zorunlu | Uygulama işlevselliği |
| Finansal bilgiler → Satın alma geçmişi (satın alınan paket, Google Play sipariş ve doğrulama bilgisi) | İsteğe bağlı (yalnızca paket alanlar) | Uygulama işlevselliği, Hesap yönetimi (1.2.0'dan itibaren) |

**Toplanmayanlar:** konum, kişiler/rehber, fotoğraf ve video (imza videosu telefonda kalır, sunucuya gitmez), ödeme kartı ve banka bilgisi (ödeme Google Play'de yapılır, bize gelmez), tarama geçmişi, reklam kimliği.

"Paylaşılıyor mu" sorusunda hizmet sağlayıcılar (Supabase, Railway, Resend) **paylaşım sayılmaz**, çünkü verileri bizim adımıza işliyorlar.

## 3. Mağaza girişi (Büyüme → Mağazada bulunma → Ana mağaza girişi)

- Uygulama adı, kısa açıklama, tam açıklama: `MAGAZA-METINLERI.md`
- Uygulama simgesi: `store/play/ikon-512.png`
- Öne çıkan grafik: `store/play/one-cikan-gorsel-1024x500.png`
- Telefon ekran görüntüleri: `store/play/telefon/01…08` (sırayla)
- **Çeviri ekle → İngilizce:** ad `QuitVow: Quit Gambling`, kısa açıklama `MAGAZA-METINLERI.md`'de

**Mağaza ayarları:**
- Kategori: **Sağlık ve Fitness**
- Etiketler: **Sağlık ve fitness**, **Kişisel gelişim** (listede bağımlılık/zihinsel sağlık etiketi yok; alakasız etiket seçme)
- E-posta: `destek@quitvow.com.tr`
- Web sitesi: `https://quitvow.com.tr`

## 4. Sürüm

1. **Test → Dahili test → Yeni sürüm oluştur**
2. Play Uygulama İmzalama'yı kabul et (Google uygulama imzalama anahtarını saklar; Expo'daki anahtar "yükleme anahtarı" olur)
3. AAB dosyasını yükle (1.2.0 için: sürüm kodu 5, EAS üretim build'i)
4. Sürüm notu: `MAGAZA-METINLERI.md` → "Sürüm notu (1.2.0)"
5. Testçi listesine kendi Gmail adresini ekle, kendi telefonunda Play'den indirip dene
6. Sorun yoksa: **Üretim → Sürümü üretime yükselt** → ülkeleri seç → incelemeye gönder

### 1.2.0 için ek adımlar (paketler ve yeni tema)

- **Lisans testi:** Ayarlar → Lisans testi bölümüne test Gmail adresini ekle. Test hesabıyla satın alma penceresinde test kartı çıkar, ücret alınmaz.
- **Uygulama içi ürünler:** Para kazanma → Ürünler → Uygulama içi ürünler: `pack_30`, `pack_60`, `pack_90` **etkin** olmalı (fiyatlar KDV öncesi girilir; Play %20 KDV ekler).
- **Dahili testte dene:** (a) yeni hesapla paket seç, imzala, Play ödeme penceresi açılsın, test satın almayı tamamla, pakt kurulsun; (b) başka denemede ödemeden vazgeç, imza ekranında kal; (c) 1.0.0 kuruluyken dahili test sürümüne güncelle, giriş ve veri korunsun; (d) ana ekran, kriz, günlük kontrol, imza videosu (kamera izni) takılmadan çalışsın; (e) "Paketim" fiyatlarla açılsın.
- **Üretime çıkış:** Sürümü **kademeli yayın** (%20 → %50 → %100) ile çıkar. **Yayın → Yayın ayarları → Yönetilen yayın**'ı aç; mağaza girişi (metin ve 8 görsel) ve uygulama sürümü incelemeden sonra aynı anda yayına alınır. Görselleri yeni tema canlıya çıkmadan yükleme (mağaza görseli yayındaki uygulamayı yansıtmalı).
- **Veri güvenliği formu:** Yukarıdaki "Satın alma geçmişi" satırını ekle ve formu yeniden gönder; gizlilik politikası paket ödemesini anlatıyor olmalı (`site/src/legal/tr.mjs`, "paket satışı açıldığında" ifadeleri şimdiki zamana çevrilir).
- **Sağlık beyanı:** Uygulama içeriği → Sağlık uygulamaları; açıklamadaki "teşhis, tedavi, iyileştirme veya önleme yapmaz" ifadesiyle tutarlı olsun.
- `VpnService` beyanı bu sürümde **gerekmez** (bahis engelleyici sonraki sürümde).

**Ülkeler:** Türkiye'den başla. İngilizce yardım hattı numaraları (ABD, İngiltere) henüz doğrulanmadı; diğer ülkeleri onlar doğrulanınca açmak daha güvenli.
