# Google Play Console: 1. sürüm adım adım

Sırasıyla ilerle. Köşeli parantezli yerleri kendin doldur. Metinler `MAGAZA-METINLERI.md`'de, görseller `store/play/` klasöründe.

## 1. Uygulamayı oluştur

**Tüm uygulamalar → Uygulama oluştur**

| Alan | Cevap |
|---|---|
| Uygulama adı | `QuitVow: Kumarı Bırak` |
| Varsayılan dil | Türkçe – tr-TR |
| Uygulama mı, oyun mu | Uygulama |
| Ücretsiz mi, ücretli mi | Ücretsiz (paketler ileride uygulama içi satın alma olacak; uygulama yine "ücretsiz" kalır) |
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
```

### Reklamlar
Hayır, uygulamada reklam yok.

### İçerik derecelendirmesi
- E-posta: `[iletişim adresin]`
- Kategori: **Diğer tüm uygulama türleri**
- Şiddet, cinsellik, küfür, uyuşturucu: hepsi **Hayır**
- "Kumar / simüle kumar içeriyor mu": **Hayır**. Uygulama kumarı bırakmaya yardım ediyor; kumar oynatmıyor, kumar içeriği göstermiyor.
- Kullanıcı etkileşimi / kullanıcıların içerik paylaşması: **Hayır**. Şahitlere giden mailler sabit şablondur; kullanıcılar birbirleriyle serbest mesajlaşmaz.
- Konum paylaşımı: Hayır. Dijital ürün satın alma: Hayır (şimdilik).

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

**Toplanmayanlar:** konum, kişiler/rehber, fotoğraf ve video (imza videosu telefonda kalır, sunucuya gitmez), finansal bilgi, tarama geçmişi, reklam kimliği.

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
3. AAB dosyasını yükle
4. Sürüm notu: `MAGAZA-METINLERI.md` → "Yeni sürüm notu"
5. Testçi listesine kendi Gmail adresini ekle, kendi telefonunda Play'den indirip dene
6. Sorun yoksa: **Üretim → Sürümü üretime yükselt** → ülkeleri seç → incelemeye gönder

**Ülkeler:** Türkiye'den başla. İngilizce yardım hattı numaraları (ABD, İngiltere) henüz doğrulanmadı; diğer ülkeleri onlar doğrulanınca açmak daha güvenli.
