# QuitVow: Monetizasyon Modeli

**Karar özeti:** Gelir **mücadele paketleri** (30/60/90 gün) ve ücretsiz 7 günlük deneme. **Hiçbir şekilde kullanıcı parası tutulmaz** (eski "emanet / Söz Kasası" fikri kaldırıldı). Bağlayıcılık paraya değil **sosyal taahhüde** (vasiler, imza videosu, 72 saatlik çıkış kilidi) ve **tamamlama ödülüne** dayanır.

**Abonelik yok (karar, 25 Ekim 2026):** Paketler tek seferliktir ve yenilenmez. Pakt bittikten sonra engeli ve şahit ağını canlı tutmak isteyen için **otomatik yenilenmeyen Koruma** ürünü vardır (bölüm 2c). **Aylık otomatik yenilenen abonelik hiçbir üründe kullanılmaz.**

> Bu bir taslaktır. Fiyatlar **henüz belirlenmedi** ve pazar verisiyle doğrulanmadı. Hukuki/vergi maddeleri avukat ve mali müşavirle teyit edilmeden uygulanmamalıdır. Şirket ABD merkezli olduğundan KVKK (Türkiye'deki kullanıcılar için) ve ABD tarafı birlikte düşünülmelidir.

## 1. İlkeler (pazarlık dışı)

1. **Kriz anında para duvarı yok.** Kriz modu, sakinleşme oyunları ve yardım hatları (ALO 182, 112, Yeşilay 115) her zaman ücretsiz.
2. **Vasiler hiçbir zaman ödemez.** Vasi modu ücretsiz; güven ağı ürünün kalbi.
3. **Kayıptan kazanç yok.** Tekrar oynama ücret doğurmaz; "kaydın başına ücret", "yeniden başlama ücreti" gibi bir şey olmaz.
4. **Bahis sektöründen gelir yok.** Reklam, ortaklık, veri satışı yok.
5. **Sonuç vaadi yok.** "Garanti", "kesin bırakırsın" denmez. Paketler bir **araç ve süre** satar, sonuç satmaz (tüketici hukuku riski).
6. **Kolay iptal / iade** mağaza kuralları çerçevesinde.
7. **Veri para kazanmak için kullanılmaz.**

## 2. Katmanlar

| | **Ücretsiz deneme (7 gün, hesap başına 1 kez)** | **Mücadele paketi (30 / 60 / 90 gün)** |
|---|---|---|
| Pakt süresi | 7 gün | 30, 60 veya 90 gün |
| Vasi (2–3), vasi bildirimleri, vasi portalı | ✓ | ✓ |
| Günlük kontrol, günlük, "en riskli saat / en sık tetik" | ✓ | ✓ |
| Kriz modu + oyunlar + yardım hatları | ✓ | ✓ |
| İmza videosu (isteğe bağlı) | ✓ | ✓ |
| **Detaylı tetik analizi** (saat dilimleri, tetik/duygu sıralaması, son 7 gün) | — | ✓ |
| **Uzman/terapist raporu** (kullanıcı kendisi paylaşır) | — | ✓ |
| Tamamlama ödülü (sonraki pakette indirim) | — | ✓ (henüz uygulanmadı) |
| Bahis engeli (1.3.0, Android) | ✓ | ✓ |

Pakt bittikten sonra: bölüm 2c (Koruma).

**Deneme bitince:** 7 gün dolunca pakt tamamlanır; devam için paket gerekir. Deneme hakkı yenilenmez. Denemedeyken pakete geçilirse mevcut pakt uzatılır, gün sayısı ve seri korunur.

**Uygulama durumu:** Yetki modeli sunucuda çalışır (`purchases` tablosu, deneme tek seferlik, paket hakkı tüketimi, 402 yanıtı, paket gerektiren rapor). Google Play satın alma doğrulaması **henüz yok**: üretim dışında paket otomatik "demo" olarak verilir (`DEMO_PURCHASES`), üretimde varsayılan kapalıdır ve satın alma kaydı yoksa 402 döner.

## 2b. Paywall tasarımı

**Anlar**
1. **Deneme sürerken (5. günden itibaren):** ana ekranda tek bir sessiz kart ("DENEME · N GÜN KALDI"). Açılır pencere, geri sayım ya da baskı yok.
2. **Deneme bitince:** tam ekran paket seçimi. İlk cümle ilerlemeyi kabul eder ("7 gün tuttun"). Pakt, paket alınınca **yeniden açılır**: gün sayısı, seri ve vasiler korunur.
3. **Kilitli özellik kartları:** Günlük'te detaylı analiz ve Paketim'de rapor.

**Hiçbir zaman:** kriz ekranı, tekrar oynadım akışı, oyunlar, vasi tarafı ve yardım hatlarında paywall yok. Paywall ekranında bile görünür bir "Zorlanıyorsan: Krizdeyim" bağlantısı vardır; kriz her zaman paywall'dan önce gelir.

**Paket seçim ekranı:** 30 / 60 / 90 gün, **90 gün önceden seçili** (tek dokunuşla değiştirilir), her pakette gün başı fiyat gösterilir. Fiyat Google Play'den yerel para biriminde gelir; elle yazılmaz.

**Dürüstlük kuralları:** sahte aciliyet (geri sayım, "son N paket") yok; veriye dayanmayan "en çok tercih edilen" rozeti yok; başarı garantisi verilmez; "Şimdi değil" her zaman görünür ve normal boyuttadır; ödeme ve iade koşulları Google Play'e bağlıdır ve ekranda yazar.

**"Şimdi değil" → ücretsiz mod:** pakt tamamlanır. Kriz modu (vasilere bildirim dahil), oyunlar, günlük kayıt, yardım hatları ve vasi erişimi açık kalır. Ana ekranda "PAKET BEKLİYOR" görünür ve tek dokunuşla paket ekranına gider. Tekrar oynadım / çıkış talebi gizlenir (pakt aktif değil). Paket alınırsa kaldığı yerden devam edilir; pakt çok önce bittiyse (yeni süre geçen günden kısaysa) yeni pakt kurulur.

**Google Play akışı (yapılacak):** telefon satın almayı yapar, satın alma belgesini API'ye yollar; API Google'a doğrulatır, `purchases` tablosuna `source='play'` yazar (aynı belge iki kez kullanılamaz) ve belgeyi onaylar. Gerekenler: Play Console hesabı, ürün kimlikleri (`pack_30`, `pack_60`, `pack_90`), Google servis hesabı ve Expo Go dışında bir telefon derlemesi.

## 2c. Pakt sonrası: Koruma ürünü (karar, 25 Ekim 2026)

**Tek seferliğin amacı.** Ürün erişim süresi değil **bitiş çizgisi** satar: 30/60/90 günlük pakt tamamlanır, kutlanır, kullanıcı gider. Abonelikte başarı kullanıcının kalmasıdır; bizde başarı artık ihtiyaç duymamasıdır. Kumar borcu olan kitle için "unutulan abonelik" tam da kaçtığı mekaniktir (küçük, tekrar eden, fark edilmeyen kesinti); "bir kere ödedim" cümlesi eşe ve şahide anlatılabilir. Abonelik ayrıca iade/iptal şikâyeti ve Play'in ek açıklama yükünü getirir. Bedeli: pakt bitince gelir sıfırdır, oysa bahis engeli (günlük liste ve kural güncellemesi) ve şahit uyarıları sunucuda sürer. "Deneme + yıllık" paywall'ların iyi görünen rakamları büyük ölçüde unutulan yenilemelerden gelir; o geliri bilerek almıyoruz.

**Karar:**

1. **Paketler** (Filiz 30, Fidan 60, Ağaç 90) tek seferlik kalır. Taahhüt ürünü budur; süresi dolunca kendiliğinden yenilenmez.
2. **Koruma**, pakt sonrası için: `koruma_365` (12 ay, tek seferlik, **otomatik yenilenmez**; süresi bitince kullanıcı yeniden karar verir) ve `koruma_omur` (kalıcı, tek seferlik). Kapsam: bahis engeli liste ve kural güncellemeleri, engel kapanınca ve sinyal kesilince şahit uyarıları, aylık özet e-postası, günlük ve analiz arşivine erişim.
3. **Aylık otomatik yenilenen abonelik hiçbir üründe yok.** Abonelik ekonomisi denenecekse yalnız Koruma'da ve yine yenilenmeyen biçimde (ön ödemeli), paktta asla.
4. **Telefondaki engel hiçbir zaman ödeme yüzünden kapanmaz.** Koruma yoksa engel son indirdiği liste ve kurallarla çalışmaya devam eder; yalnızca sunucu tarafı (güncelleme, şahit uyarısı, özet) durur. Kriz modu, yardım hatları, oyunlar ve şahit erişimi her zaman ücretsiz (bölüm 1).
5. **Tamamlama ödülü** Koruma'ya köprüdür: paketi bitirene Koruma'da indirim. `completionDiscountPct` bugün 0; Koruma ile birlikte anlamlı bir değer verilir.
6. Paket süresince Koruma kapsamı pakete dahildir; Koruma ayrıca satılmaz, **pakt bitiminde** teklif edilir ("Bahçen tamam" ekranı ve ücretsiz moddaki tek kart). Deneme bitiminde teklif edilmez (önce paket).

**Dürüstlük kuralları Koruma için de geçerlidir:** sahte aciliyet yok; "engelin kapanacak" tehdidi yok (kapanmıyor, madde 4); fiyat Play'den gelir; "Şimdi değil" her zaman görünür ve normal boyuttadır.

**Uygulama notları.** Play'de tek seferlik uygulama içi ürün; paketlerle aynı akış (satın alma belgesi → API doğrulaması → `purchases` yetkisi; `koruma_365` için 365 günlük, `koruma_omur` için süresiz bitiş). Play'in "ön ödemeli abonelik planı" da yenilenmez ama ayrı abonelik altyapısı ister; mevcut yapıda tek seferlik ürün daha az iştir. `/shield/rules` ve `/shield/list` 1.3.0'da herkese açıktır; Koruma gelince **liste güncellemesi** oturum anahtarı ve yetkiyle sunulur, kurallar açık kalabilir (küçük dosya, markaların yakalanması herkes için iyi). Heartbeat ve şahit uyarıları zaten yalnız aktif paktta çalışır; Koruma bunu pakt sonrasına uzatır.

**Ölçüm:** pakt tamamlayanların Koruma'ya geçiş oranı; Koruma bitiminde yeniden alma oranı; Koruma'lı kullanıcıda engelin açık kalma süresi. Koruma'sız kullanıcıda engel durumu sunucuya gelmez; bu bilinçli bir kabuldür.

**Açık maddeler:** paket ve Koruma fiyatları (gün başı fiyat mantığında Koruma, 90 günlük paketten ucuz görünüp paktın atlanmasına yol açmamalı; Koruma'da pakt, günlük kontrol ve çıkış kilidi yoktur); `koruma_omur`'un gerçekten satılıp satılmayacağı (destek yükü ve "ömür boyu" vaadinin hukuki karşılığı); Koruma süresinin yeni bir paketle çakışması (paket süresince Koruma sayacı durdurulur mu).

## 3. Satış mekaniği

- **Tek seferlik uygulama içi ürünler** (Google Play Billing): "30 günlük", "60 günlük", "90 günlük" paket. Ödemeyi, vergi tahsilini ve iadeleri Google yönetir; sunucu yalnızca satın alma doğrulaması ve yetki (entitlement) tutar.
- **Koruma ürünleri** (tek seferlik, bölüm 2c): `koruma_365` (12 ay) ve `koruma_omur` (kalıcı). Aynı doğrulama ve yetki mekanizması; otomatik yenileme yok.
- **Tamamlama ödülü:** Paketi bitirene bir sonraki pakette indirim. Para tutulmaz, nakit iade yoktur; yalnızca ürün indirimi. Sabit ve öngörülebilir, rastgele ödül değildir (kumar mekaniğine benzemez).
- **Fiyatlar:** Henüz yok. Test aşamasında 2–3 fiyat noktası karşılaştırılır. Ölçüt: ödeme dönüşümü **ve** paketin tamamlanma oranı (yalnızca gelir değil).
- **Burs / indirim kodu:** Terapist ve STK yoluyla, gelir desteği için.
- Mağaza komisyonu fiyatlandırmaya dahil edilir (Google Play abonelik/ürün komisyonları güncel koşullardan kontrol edilmeli).

## 4. Bağlayıcılık: para olmadan nasıl?

Para tutulmadığı için kayıptan kaçınma etkisi zayıflar. Telafi araçları:
- **Vasi onayı + 72 saatlik çıkış kilidi** (iki anahtar).
- **İmza videosu** (isteğe bağlı): vasilerin gördüğü ses ve yüzle verilmiş söz.
- **Vasi bildirimi:** tekrar oynama ve kriz anında vasilere haber.
- **Tamamlama ödülü** ve ilerleme görünürlüğü (90 hücre).
- **Kefaret görevi, taahhüt puanı** (sonuç kendine uygulanır).

Para tabanlı bir yapı (depozito, bağış sözü) istenirse **v2/v3**'te, hukuki ve ödeme altyapısı hazır olunca ayrıca değerlendirilir.

## 5. ABD şirketi, Türkiye kullanıcıları

- KVKK, Türkiye'deki kullanıcıların verisi için büyük olasılıkla geçerli; yurt dışı veri sorumlusu için VERBİS kaydı ve temsilci gerekebilir. Verinin yurt dışında tutulması KVKK md. 9 kapsamında değerlendirilmeli.
- Kurumsal Apple/Google geliştirici hesapları için genelde D-U-N-S numarası gerekir.
- Abonelik/paket gelirinde Türkiye'deki vergilerin kim tarafından tahsil edildiği mali müşavirle teyit edilmeli.

## 6. Ölçülecekler

| Ölçüt | Neden |
|---|---|
| Pakt başlatma oranı (kayıt → 2 vasi kabulü) | Vasi daveti en büyük sürtünme |
| 7. gün devam, deneme → paket dönüşümü | Değer görüyor mu? |
| 30/60/90. gün pakt devamı ve tamamlanma | Asıl başarı ölçüsü |
| Nüks sonrası geri dönüş | Ürün işe yarıyor mu? |
| Vasi kabul oranı ve aktifliği | Ağın sağlığı |

Gelir ölçütleri, tamamlanma ölçütlerinin önüne geçmemeli.

## 7. Yapılacaklar

1. Google Play Billing entegrasyonu + sunucuda satın alma doğrulaması ve paket yetkisi.
2. Fiyat testi altyapısı ve ölçüm.
3. Tamamlama ödülü (indirim kodu) mekanizması.
4. Hukuk: KVKK (ABD şirketi), gizlilik metni, kullanım şartları.
5. Kurum satışı için pilot (1–2 klinik/STK), v2 sonrası.
6. Koruma ürünü (bölüm 2c): Play'de `koruma_365` ve `koruma_omur`, sunucuda yetki ve bitiş tarihi, pakt bitimi ekranında teklif, `/shield/list` güncellemesinin yetkiye bağlanması, tamamlama indiriminin Koruma'ya uygulanması. Fiyatlar paketlerle birlikte belirlenir.
