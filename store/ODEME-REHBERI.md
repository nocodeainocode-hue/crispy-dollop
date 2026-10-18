# Paket satışı (Google Play) kurulum rehberi

Kod hazır (`odeme` dalı). Ödemenin canlıya çıkması için aşağıdaki adımlar sırayla yapılmalı. Köşeli parantezli yerleri kendin doldur.

## 1. Play Console: ödeme alma bilgisi (sende)

Ayarlar → Ödeme profili → "Ödemeleri nasıl aldığınız" kartında **ödeme yöntemi (banka hesabı) yok**. Ekle. Vergi bilgisi istenirse OmniPure Marketing LLC adına ABD vergi formu (W-8BEN-E) gerekebilir; muhasebecine sor.

İstersen aynı sayfadaki **%15 hizmet ücreti programına** kaydol (yıllık ilk 1 milyon dolara kadar komisyon %15, aksi halde %30).

## 2. Sürüm 1.1'i derle ve Play'e yükle

`expo-iap` kütüphanesi `com.android.vending.BILLING` iznini kendisi ekler. Bu izin olmadan Play "tek seferlik ürün eklemek için APK'ya faturalandırma izni gerekir" diye ürün oluşturmayı kapatıyor.

```bash
cd apps/mobile
npx eas-cli@latest build --platform android --profile production
```

Çıkan `.aab` dosyasını Play Console → Test → Dahili test'e yükle (üretime değil). Sürüm numarası otomatik artar.

## 3. Uygulama içi ürünleri oluştur (Play Console)

Para kazanma → Ürünler → Tek seferlik ürünler → Ürün oluştur. Üç ürün:

| Ürün kimliği | Ad | Fiyat |
|---|---|---|
| `pack_30` | 30 günlük paket | 349 ₺ |
| `pack_60` | 60 günlük paket | 549 ₺ |
| `pack_90` | 90 günlük paket | 749 ₺ |

Ürün kimlikleri **birebir** böyle olmalı, sunucu bunları bekliyor. Ürünler **tüketilebilir** tek seferlik ürünlerdir; sunucu satın almayı doğruladıktan sonra Google'da tüketir, böylece aynı paket yeniden alınabilir. Oluşturduktan sonra **etkinleştir**.

## 4. Servis hesabı (sunucunun Google'a sorması için)

Eski "API erişimi" sayfası artık yok.

1. Google Cloud Console'da bir proje seç ya da oluştur. **Google Play Android Developer API**'yi etkinleştir.
2. IAM ve Yönetici → Servis hesapları → servis hesabı oluştur (ör. `quitvow-play-verify`). Bu hesabın **JSON anahtarını** oluştur ve indir.
3. Play Console → Kullanıcılar ve izinler → **Yeni kullanıcılar davet et** → servis hesabının e-posta adresini yaz.
4. Uygulama izinleri sekmesinde QuitVow'u ekle ve şu izni ver: **Siparişleri ve abonelikleri görüntüle**. Satın alma doğrulaması için yeterli. İade gerekirse **Siparişleri ve abonelikleri yönet** de eklenir.
5. Daveti gönder. Yetkinin API'ye yansıması birkaç saat sürebilir.

Hesap listesinde başka bir uygulamaya ait bir servis hesabı görünüyorsa onu **kullanma**, QuitVow için ayrı hesap aç.

## 5. Railway ortam değişkenleri

JSON anahtarının **içeriğini sen** yapıştır; sohbette ya da depoda paylaşma.

| Değişken | Değer |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | indirdiğin JSON dosyasının tamamı |
| `GOOGLE_PLAY_PACKAGE` | `com.quitvow.app` (varsayılan, eklemesen de olur) |
| `DEMO_PURCHASES` | **ekleme** ya da `false` (üretimde zaten kapalı) |

Kaydedince Railway yeniden dağıtır. Sunucu açılışında `/health` yanıtında `"billing": true` görünmeli:

```bash
curl https://api.quitvow.com.tr/health
```

## 6. Dene (ödeme yapmadan)

Play Console → Ayarlar → Lisans testi bölümüne kendi Gmail adresini ekle. Bu hesapla yapılan satın almalar için **kart çekilmez**. Dahili test sürümünü telefona kur, Plan ekranından bir paket seç, satın al. Beklenen: Play ödeme penceresi açılır, bittikten sonra "X günlük pakete geçtin" mesajı çıkar.

## 7. Üretime çıkar

Her şey çalışınca aynı sürümü Üretim'e yükselt ve incelemeye gönder. Mağaza açıklamasındaki "PAKETLER" bölümü (`MAGAZA-METINLERI.md` en altı) **ancak bu noktada** eklenir; uygulamada çalışmayan özelliği açıklamada yazmak ret sebebi.

## Bilinen açık konular

- **Tamamlama indirimi:** Sunucu bir paketi bitirene "sonraki pakette %40 indirim" veriyor ve e-posta bunu duyuruyor. Play'deki tek seferlik ürünün fiyatı sabit; indirim için ayrı ürün (`pack_30_indirim` gibi) ya da Play'in indirim teklifleri gerekir. Şimdilik uygulama gerçek ödeme açıkken indirim satırını **göstermiyor**. E-postadaki duyuru bu çözülene kadar kaldırılmalı ya da indirim uygulanmalı.
- **iOS:** Satın alma yalnızca Android'de. iOS için Apple makbuz doğrulaması sunucuya ayrıca yazılacak.
- **Fiyat gösterimi:** Plan ekranı fiyatı Play'den okuyup yazıyor. Kurulum ekranında (ilk paket seçimi) henüz fiyat görünmüyor.
