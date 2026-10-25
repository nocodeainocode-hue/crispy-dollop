# Büyüyen Bahçe Uygulama Planı (QuitVow)

**Durum:** Taslak 2, 25 Ekim 2026 (eleştiri sonrası revizyon). Sekiz alan planının (tema, bitki, kriz, akış, metin, hareket, varlık, yayın) tek belgede birleştirilmiş, çelişkileri çözülmüş ve eleştirmenin bulduğu 12 eksiğin kapatıldığı hâli.
**Ürün:** Kumar/bahis bırakmak isteyenler için Türkçe-öncelikli Android taahhüt uygulaması (Expo SDK 57, RN 0.86.3, EAS). Play'de 1.0.0 yayında; 1.1.1 (ödeme) `odeme` dalında hazırlanıyor.
**Seçilen yön:** "Büyüyen Bahçe". Kullanıcı tam değişiklik istedi. Görsel kaynak: Bahçe tuvali (Main, Kontrol, GunTamam, Kriz, Imza, Paywall, SahitDavet, SahitPortal, Magaza, Kimlik `.dc.html`).

**Okuma rehberi.** Süreler iş günüdür ve hepsi tahmindir (ölçülmemiş). Görev kimlikleri bu belgeye aittir (F0-1, F4-6 gibi); "Kaynak" sütunu alan planlarındaki kimliği gösterir (TEM, BIT, KRI, AKI, MET, HAR, VAR, YAY); **REV-n** bu revizyonda eklenen işleri gösterir (bölüm 0). Dosya yolları depoda doğrulandı; "(yeni)" henüz yok demektir. Depoda hiçbir dosya değiştirilmedi. Doğrulanan temel gerçekler:
- `apps/mobile/src/components/motion.tsx` hareketi azalt ayarını yalnızca modül yüklenirken bir kez okuyor; `expo-haptics` kurulu ama hiç import edilmiyor; `expo-secure-store` kurulu ve `app.json` eklentilerinde.
- `App.tsx:5,71` `Archivo` yazı tipini kök importla yüklüyor (18 TTF paketlenir) ve `const [loaded] = useFonts(...)` ile hata durumunu yok sayıyor; `SplashScreen` yok. Ekran önceliği `App.tsx:30-45`: şahit, kurulum, kriz (`crisisUntil > Date.now()`), paywall/tamamlandı (`pactStatus === 'completed' && !paywallDismissed`), ekran.
- `store.tsx:71` kayıt anahtarı `'lockin.v4'`, `theme` varsayılanı `'dark'`; `store.tsx:83-84` her `set` yeni state nesnesi üretir ve **tüm state** `AsyncStorage`'a JSON olarak yazılır; `server.tsx:56-74` `apply()` her çağrıda `app.set`, `tick` 30 sn'de bir `sync()`.
- `billing.ts:6-7` `/health`'i `cached ??=` ile süreç başına bir kez okur; ağ yoksa `{demo:false, billing:false}` döner. `/health` bugün `{ok, db, play, demo, billing}` (`apps/api/src/app.ts:28`).
- `purchase.ts`: `buyOnPlay` (L38), `recoverPurchases` (L57), `withPack` (L77). `recoverPurchases` yalnız `Plan.tsx:35` mount effect'inde çağrılıyor. `Setup.tsx:111` `app.set({... points: 100, role: 'user'})` ödemeden **önce** yazıyor; `Setup.tsx:113` iptalde `setHold(0)`; `Plan.tsx:42` başarıda `setPick(0)`.
- Gün hesabı `Math.floor((now - startedAt)/86400000)+1` olarak 6 yerde kopya (Home.tsx:24-28, Plan.tsx:22, Profile.tsx:42,77, DayDone.tsx:21-22, Relapse.tsx:20-21; Pending.tsx:109 sunucu bitiş zamanı için), oysa kontrol takvim gününe bağlı (Home `dayKey` L15, Verify `localDay`, sunucu `day: localDay()`); `Verify.tsx:22` sunucu hatasını `.catch(() => {})` ile yutuyor.
- Kriz kilidi **istemcidedir** (`store.tsx:30` `crisisUntil`, `Crisis.tsx:42-54`, "Atlattım" `disabled={left > 0}` L129); sunucu `/pacts/current/crisis` (`routes.ts:232`) yalnız olay yazar ve kabul etmiş şahitlere hemen e-posta gönderir.
- `app.json`'da `android.allowBackup` yok. `apps/mobile/android` klasörü gitignore'da; depoda `.gitattributes`, `tools/`, `art/`, `scripts/` yok; mobil projede test koşucusu yok; `Image` tipinde `resizeMode='repeat'` "iOS only" işaretli.
- `/guardian/me` (`routes.ts:325`) yalnız son kontrol/son tekrar/son kriz/seri/gün döndürür; gün gün kontrol listesi sunucuda yoktur.
- `engel` dalı (`git diff --stat odeme..engel -- apps/mobile`): 31 dosya, +1615/−427; `Profile.tsx` 275 satır, `Home.tsx` +20 (ShieldCard), `Plan.tsx` 18, `Setup.tsx` 12, `server.tsx` 15, `nav.ts` 2 (Scr'ye `'shield'`), `Shield.tsx`, `useShield.ts` ve `apps/mobile/modules/shield` (Kotlin VPN servisi). `purchase.ts` farkı `odeme` dalına ait (`engel` ondan önce ayrılmış).

---

## 0. Revizyon özeti (eleştiri → çözüm)

| REV | Eksik | Çözüm | Nerede |
|---|---|---|---|
| 1 | Krizdeyim erişimi 5 öğeli dock'ta küçülüyor; plan kendiyle çelişiyor | Krizdeyim tam genişlik, ≥84 dp, kaydırma alanı dışında sabit; dock 3 öğe; ölçek büyüyünce yalnız sahne+dock `ScrollView`'a düşer; "yanlışlıkla bastım" ucu Home'dan önce | K17, 6, F1-20, F4-6, 10.1 |
| 2 | Açılışta kilitlenme/çökme için yerel kaçış yok | Kapıya 3 sn sert zaman aşımı, font hatasında sistem fontu, "sağlıklı değil" işareti, `/health` kalıcı önbellek, varsayılan `lite` | K24, 5.5, F1-17, F4-6, F7-7 |
| 3 | Ödeme koruması yetersiz (already owned, çağrı noktaları, 409) | `withPack` içi kurtarma, `payFlow.ts`, ödeme öncesi `dry-run`, "hakkın saklandı" metni | K20, F0-4, F1-21 |
| 4 | Gün tanımı tutarsız | Tek kural: yerel takvim günü; `packDay.ts`; 6 kopya tek yere | K23, 5.2, F1-18 |
| 5 | Yeniden çizim/yazma hedefleri store ile ulaşılamaz | Sığ eşitlik, yazma debounce, seçici, render sayacı | K28, F1-16 |
| 6 | Gizlilik vaadi doğrulanmamış | `allowBackup:false` + doğrulama, ölçülebilir kanonik cümle, taslak TTL | K25, 7.1, F1-19, F1-11 |
| 7 | Şahit penceresi yeni ifşa yaratıyor | Pencere yalnız gün sayısı + lale; `/guardian/me` değişmez; `rest` tam yaprak | 5.3, F8-4, S19 |
| 8 | Ödül koreografisi ve satış anı kumar-benzeri | Bekleme/asma/halka/parıltı yok; `salesQuietUntil`; meşgul ekran ertelemesi; deneme uyarısı Home'da | K26, 4.1, F0-5, F2-2, F4-6, F4-7 |
| 9 | `engel` dalı bütçesiz | Karar F0'da; varsayılan: dondur; maliyet ve Play VPN beyanı yazıldı | K27, F0-8, F10-2, 11, S25 |
| 10 | Vaat-davranış çelişkisi sunucu ve belgelerde | F2-7 (indirim=0, mail metinleri), F9-4 tarama kapsamı genişledi, `dayMessage.ts` hizası | F2-7, F4-7, F9-4, 8.4 |
| 11 | Efor ve takvim iyimser | F2-4 6,5; F4-12 3,0; bekleme günleri ve tatiller takvimde; F1 "kritik dilim" ve F3 yılbaşı dondurmasında | 1.4, 9 |
| 12 | Ölçülemeyen kapılar ve faz çelişkileri | Klinik danışman F0 kapısında, onaysız muhafazakâr varsayılanlar, yazılı çağrışım ölçütü, taslak sayısal hedefler, kapılar faz sırasına hizalandı | F0-9, F4-12, 10.2, 12 |

---

## 1. Karar özeti

### 1.1 Ana kararlar

| No | Karar | Gerekçe / kaynak |
|---|---|---|
| K1 | Yön: tek bitki, 1 gün = 1 yaprak, her 7. gün lale; geçen gün mürekkep çizgi + yeşil dolgu, bugün hardal nabız atan tomurcuk, gelecek kesik kurşun taslak. Izgara, siyah, kırmızı, sürpriz ve rastgele yok. İkon dahil tam değişiklik. | Tasarım; yargıçlar kilit klişesini ve tek kırmızı hücreyi 48 px'te zayıf buldu. |
| K2 | Sürüm sırası: 1.1.1 ödeme; **1.1.2 "Sakin zemin" = F1'in kritik dilimi** (kriz, ödeme güvencesi, açılış güvenlik ağı, gizlilik, gün tanımı, store); **1.1.3 "Net başlangıç" = F1'in ertelenebilir dilimi + F2** (Ocak sonu); F3 "Bahçe zemini" iç faz olarak yılbaşı dondurmasında yürür; 1.2.0 "Kâğıt ve çay", 1.2.1, 1.2.2, 1.3.0 "Büyüyen bitki", 1.3.1, vitrin, temizlik. İlke: önce düzelt, sonra güzelleştir; her sürüm tek başına tutarlı. | Güvenlik ve satış düzeltmeleri tasarımdan bağımsız değer taşır; 1.1.3'ün 22 Aralık sınırına sığmaması kriz/ödeme düzeltmelerini Ocak'a itmesin (REV-11). |
| K3 | Skin bayrağı `EXPO_PUBLIC_SKIN` (klasik / bahce). Tanımsızsa klasik. `eas.json`: preview = bahce, production = klasik; production yalnızca 1.2.0 kapısında bahce olur. Yeni görünüm ana dalda "karanlık yayın" olarak birikir. | Yarım tema hiç kullanıcıya gitmesin; geri dönüş tek satır. |
| K4 | `c.*` token adları korunur, değerler role göre değişir; yeni anlamsal token'lar eklenir; eski adlar F10'da silinir. `line` ikiye bölünür: `line` (dekoratif) ve `edge` (arayüz sınırı, en az 3:1). | `c.*` yaklaşık 480 yerde ve 20 dosyada okunuyor. |
| K5 | Çizim: yeni native bağımlılık yok (react-native-svg dahil). Her şekil iki tek renkli alfa maskesi (ink, wash) + kurşun taslak (pencil); WebP kayıpsız, yalnız @2x, çalışma zamanında `tintColor` ile boyanır. Kaydırma/titreşim sprite'a pişirilir (filtre yok). | Koyu temada ek kopya gerekmez; Android `Image.tintColor` çalışır. |
| K6 | Ana ekran ızgarasız: 1.2.0'da `PlantLite` (View tabanlı, sprite'sız, aynı yerleşim algoritması), 1.3.0'da sprite'lı `Plant`. `PlantLite` sonradan "hafif mod", yedek ve açılış güvenlik ağı olarak kalır. | "Izgara yok" kuralı; Ana ekran iki kez yazılmaz. |
| K7 | Yazı tipi: Fraunces SOFT=100 özel TTF (SemiBold, Medium, Medium Italic; italik gereksizse düşer), Nunito 500/700/800 ve Caveat 600 alt yollarından; `Archivo` F10'da kalkar. Caveat yalnızca en az 22 px ve en çok 3 kelime. | Kök import tüm ağırlıkları pakete sokar. |
| K8 | Hareket yalnızca RN `Animated` + `useNativeDriver` (transform, opacity). Easing interpolate duraklarına pişirilir; sonsuz döngü ekran başına en çok 2; hepsi sınırlı devirli; her hareketin durağan son karesi var. | `width/height` ve Text rengi JS sürücüsüne düşer. |
| K9 | Tek kaynaklar: hareketi azalt `src/motion/reduce.ts`; haptik `src/haptics.ts`; geometri `apps/mobile/src/garden/core.ts`; gün tanımı `src/packDay.ts`; kriz sabitleri `src/crisis/model.ts`; ödeme akışı `src/payFlow.ts`; açılış sağlığı `src/bootGuard.ts`; kapı betiği `scripts/yayin-kontrol.mjs`. | Alan planları aynı şeyi 3-4 kez tarif ediyordu. |
| K10 | Test koşucusu: `vitest` (yalnız devDependency, native değil). Saf modüller `.ts` uzantılı importlarla Node tarafından da yüklenebilir kalır. Bileşen testi yok: ekran çağrı noktalarındaki kırılgan mantık saf modüle (`payFlow.ts`, `packDay.ts`, `screenSelect.ts`) çıkarılır ve onlar test edilir. | Ödeme ve ekran seçimi testleri modül sahteleme ister; bileşen renderer'ı yeni bağımlılık olur. |
| K11 | Kriz: kaydırmasız sahne + kaydırma dışında sabit dock (şahit 72 dp, Sakinleş/Atlattım/yardım satırı 64 dp); kriz modunda haptik yok; nefes sabiti `BREATH = {in:4, hold:4, out:6}` klinik onaya bağlı, **onay yoksa `hold=0`** (tek satır); sallanma en çok 11°, yapısal garanti; kendiliğinden "geçti" denmez. | Klinik yargıç, ölçüm, tasarım. |
| K12 | Kriz teması: `CRISIS_THEME` sabiti. **Varsayılan klinik onay yoksa `'dark'`** (bugünkü zorunlu koyu davranış; açık temada `key={theme}` yeniden kurma maliyeti bilinen ve F4-12'de ölçülen risk); yazılı onay gelirse 1.2.0'dan itibaren `'follow'`. | Zorunlu koyu tema açık temada tüm ağacı yeniden kurar; ama onaysız riskli seçenek gönderilmez (REV-12). |
| K13 | Puan arayüzden ve vaatlerden kalkar (1.1.2); puan yazımları (+5/+10/+3/−25/−50) 1.2.2'de silinir; `store.points` alanı eski kayıt uyumu için kalır. Tamamlama indirimi vaadi kalkar: sunucuda `completionDiscountPct` 0'a çekilir, mail/belge metinleri F2-7'de düzelir (API alanı kalır). "Uzman raporu" yerine "paylaşılabilir özet". | Sunucuda puan yok; indirim Play tarafında karşılıksız (`store/ODEME-REHBERI.md:72`). Onay bekliyor (S1, S3). |
| K14 | Paket adları Filiz/Fidan/Ağaç (her zaman gün sayısıyla) 1.2.1'de gelir; 1.1.3'e kadar "{d} günlük paket". Fiyat Play `displayPrice` dizgisi aynen; "Tek seferlik. Abonelik değil, yenilenmez." fiyatla aynı ekranda. | Play Console başlıkları ve mağaza metni aynı gün eşlenir. |
| K15 | İkon 1.2.0'da değişir (kemer + iki yapraklı filiz + tek hardal tomurcuk); Play 512 ikon ve öne çıkan görsel o hafta, 8 ekran görüntüsü 1.3.0 sonrası. | Splash'te eski işaret yeni zeminde yayınlanmaz. |
| K16 | Mevcut `theme` kaydı: `'dark'` belirsiz olduğundan 1.2.0'da tek seferlik `'system'`e taşınır (`themeV`); varsayılan `'system'`. OS kaynaklı tema değişimi meşgul ekranlarda ertelenir. | Dürtü gece yoğun; yerel durum silinmesin. |
| K17 | Ana ekran, alan yeterliyse kaydırmasız. **Krizdeyim: tam genişlik, en az 84 dp yükseklik (bugünkü `ActionBar` 84 dp), ekranın altında, kaydırma alanının dışında sabit; konum, etiket ve boyut hiçbir sürümde bugünkünden küçülmez.** Dock 3 öğe (Sakinleş, Şahitler, Günlük); "Ben" sağ üst çip; yazı ölçeği büyüyünce yalnız sahne+dock `ScrollView`'a düşer, Krizdeyim yine sabit. "Tekrar oynadım", "Çıkış talebi" ve ŞAHİT rolüne geçiş Profil'e taşınır. | Panik anında kas hafızası; 5 öğeli dock'ta 360 dp'de öğe ≈51 dp'ye düşer (REV-1). |
| K18 | Günlük kontrolde Evet/Hayır eşit ağırlık; kayıt "Kaydet" anında yazılır; rastgele 4-10 saatlik `nextVerifyAt` silinir. | Klinik yargıç; kayıt kaybı hatası. |
| K19 | Dallı Fidan/Ağaç (BIT-11) ve şahit penceresi/imza sanatı 1.3.1'de; 1.3.0'da 60/90 günlük paketler için filiz gövdesi + küçülen yaprak yedeği. | Sprite sanatı en büyük belirsizlik. |
| K20 | Satın alma kodu önce karakterizasyon testleriyle kilitlenir. **`withPack` dönüş sözleşmesi (true / false=iptal / throw) ve imzası aynı kalır; iç davranışı genişler:** ödeme alındıktan sonra `action()` başarısızsa ve Google "zaten sahipsin" dönerse önce `recoverPurchases`, hak varsa `action()` bir kez yeniden denenir; çağrı noktası mantığı `payFlow.ts`'e çıkar; hata sınıfı (`PurchaseError`) eklenir. | Para alınıp pakt kurulamama riski (REV-3). |
| K21 | OTA yok. Geri dönüş katmanları: Play'de yayını durdurma, skin bayrağıyla yeniden derleme, `/health` ile uzaktan "hafif görünüm" (kalıcı önbellekli), yerel sağlık işareti, `GRAIN` ve `QUALITY` bayrakları. | `expo-updates` yok; eklemek native bağımlılık olur. |
| K22 | Ölçüm yeni izleme eklemeden: Play Console + sunucuda zaten tutulan sayılar (`/admin/stats` genişletmesi). Sürüm kırılımı Play'den; sunucuya `app_version` eklenmez; kohortlar tarih bazlı. Sayısal hedefler taslaktır (10.2). | Gizlilik sözü. |
| K23 | **Gün tanımı tek: paket günü sınırı yerel gece yarısıdır** (`startedAt`'in takvim günü = gün 1). `packDayOf`/`streakDayOf` tek modülde (`src/packDay.ts`); kontrol, `done` ve yaprak durumu aynı takvim günü anahtarını kullanır; 6 kopya tek yere taşınır. | Aksam başlayan kullanıcıda iki kontrol aynı "gün"e düşmesin (REV-4). |
| K24 | **Açılış güvenlik ağı:** kapıya tek sert zaman aşımı (3 sn), font hatasında sistem fontu; Home ilk mount'ta "sağlıklı değil" işareti yazar, 5 sn sonra siler; işaret duruyorsa bir sonraki açılışta `PlantLite`; `/health` bayrağı kalıcı önbelleğe yazılır, varsayılan `lite`. | Açılışta çökme/OOM döngüsüne uzaktan ya da yerel kaçış (REV-2). |
| K25 | **Gizlilik:** `android.allowBackup:false` (veya `dataExtractionRules` ile AsyncStorage/video dışlama) eklenir ve cihazda doğrulanır; doğrulanana kadar kanonik cümle ölçülebilir olanıdır: "Yalnızca telefonunda saklanır, sunucuya gönderilmez." | Mevcut manifestte `allowBackup` kapalı değil; neden/mektup/şahit e-postaları `lockin.v4`'te (REV-6). |
| K26 | **Satış sessizliği:** `salesQuietUntil` (kalıcı): kriz bitişi +30 dk, tekrar oynama +24 sa, lale/tamamlama günü +24 sa; bu sürede paywall/tamamlandı ekranı çizilmez. Paywall meşgul ekranları (kurulum, kontrol, gün tamam, tekrar oynama, çıkış, günlük, Sakinleş, kriz, şahit) kesmez; Home'a dönüşte gösterilir. Deneme bitiş uyarısı Home'da korunur. | Lale günü = denemenin son günü; satış anı ödül anına yapışmasın (REV-8). |
| K27 | **`engel` dalı (VPN/DNS filtresi) donuk kalır** ve F10-2'de (koşullu, 5,0 gün tahmin) birleşir; sürekli birleşme maliyeti F0-8'de kayda geçer. Native modül birleşince her AAB `BIND_VPN_SERVICE` taşır; bu "yeni native bağımlılık yok" değişmezine istisna ve Play VPN beyanı gerektirir, bu yüzden bu planın sürümlerine alınmaz. | Expo otomatik bağlama: "ayrı AAB" aynı dalda mümkün değil (REV-9). |
| K28 | **Yeniden çizim disiplini:** `store.set` sığ eşitlikte aynı state'i döndürür; kalıcı yazım debounce edilir; Home/Crisis alt bileşenlere bölünür; kabul "render sayacı" ile ölçülür. | Plan kabulleri (15 sn yeniden çizim yok, Setup render ≤2) bugünkü store ile ölçülemez (REV-5). |

### 1.2 Çözülen çelişkiler

| Konu | Planlar ne diyordu | Karar |
|---|---|---|
| Sprite çözünürlüğü | Bitki: 3 px/dp kovalar. Varlık: yalnız @2x. | Yalnız @2x (`*@2x.webp`, `require` soneksiz): ölçeksiz dosya `drawable-mdpi`'ya düşer, @3x düşük RAM'de 2,25x bellek. Kova genişlikleri 2 px/dp (yaprak 84/112/140 px). 3x cihazda yumuşaklık varsa yalnız ana bitki katmanlarına @3x (F3-5 spike'ı). |
| Rasterleyici | Bitki: resvg-js + sharp. Varlık: yalnız sharp. | Yalnız `sharp`; titreşim `wobble.mjs` ile path noktalarına sabit tohumlu pişirilir. resvg yalnız yedek. |
| Araç yeri | Bitki: `apps/mobile/tools/garden`. Varlık: kök `tools/garden`. Tema: `apps/mobile/tools/fonts`. | Dev-only her şey kökte: `tools/garden`, `tools/fonts`, `tools/store-capture`, `art/garden/src`; kök `scripts/` (`yayin-kontrol.mjs`, `olcum/`); mobil betikler `apps/mobile/scripts/` (`check-theme.mjs`, `copy-check.mjs`). Hiçbiri `apps/mobile/package.json`'a bağımlılık eklemez. |
| Geometri kaynağı | Bitki: `core.ts`. Varlık: `art/garden/geometry.mjs`. | Tek kaynak `apps/mobile/src/garden/core.ts` (RN importsuz); gün tanımı için `src/packDay.ts`'i içe aktarır; golden JSON `apps/mobile/src/garden/golden/`. |
| Dosya adlandırma | Bitki: ink/fill. Varlık: ink/wash/pencil. | `<grup>-<ad>-<katman>@2x.webp`; bitkide `ink`, `wash`, `pencil`; sahnede `line`, `fill`. |
| Image bütçesi | Bitki: 30 günde ~66, ağaçta ~200. Hareket: ekranda en çok 24. | Hedef ≤70 Image + dinamik bindirme ≤6 düğüm. F3-5 kapısı: A sınıfında janky ≤%5 sağlanmazsa 5 günlük önek parçaları (BIT-12) ile ≤24 Image. |
| Gren | Tema: 256 px karo, `repeat`. Bitki: Android'de `repeat` yok. | `repeat` Android'de varsayılmaz. F3-5 spike'ı seçer: tek 512x1024 stretch (≤40 KB) ya da 6 döşeme; `GRAIN` bayrağı kapatır. |
| Spike | BIT-1, VAR-1, HAR-2 aynı spike'tı. | Tek görev F3-5 (3 gün). |
| HoldSign | AKI-8 (`components/`), HAR-12 (`motion/`). | Tek görev; mekanik F1-12, görünüm F8-3. Dosya `src/components/HoldSign.tsx`, matematik `src/motion/holdMath.ts`. Geri dönüş: kalan değer x 900 ms. |
| Kriz sallanması | KRI-6: iki yavaş sinüs x zarf. HAR-11: gust eğrisi. | KRI-6 formülü (4,6 sn + 7,1 sn, ağırlık 0,7/0,3, `swayEnvelope(prog)`); gust yalnızca Ana ekran esintisi ve Kontrol'de. |
| `breathPhase` | `crisis/model.ts` ve `motion/curves.ts`'te ikisi birden. | Yalnız `src/crisis/model.ts`. |
| Ana ekran hareketi | Bitki: 7 sn ±0,9° sallanma. Hareket: seyrek esinti. | Tomurcuk nabzı (en çok 6 devir) + 2,4 sn esinti (en az 15 sn arayla); sürekli sallanma yok. |
| Science / WhyNote | MET-3 satır içi; AKI-6 modal. | Tek bileşen: `Science` satır içi katlanır, kapalı varsayılan. `WhyNote` yazılmaz. Yalnız "Sözün tamamı" için basit Modal. |
| Haptik | BIT-6 doğrudan `Haptics`. HAR-5 politika modülü. | Tüm çağrılar `src/haptics.ts` üzerinden. |
| Tema göçü zamanı | Tema: M1-M3 ayrı yayın. Yayın: palet ve şekil asla ayrı açılmaz. | TEM-1..11 iç kilometre taşı; production'a yalnız 1.2.0'da bayrakla. |
| Splash / ikon | Tema ve yayın: splash 1.2.0. Yayın: ikon 1.3.0. | Splash, adaptif ve monokrom ikon 1.2.0'da birlikte. |
| Regresyon hattı | YAY-6: web `?demo`. VAR-4: emülatör çekimi. | Yalnız emülatör hattı; uygulamaya dev kodu eklenmez. |
| Paket adları zamanı | MET-6: erken. AKI-12/18: geç. | 1.2.1. |
| Kelime hedefleri | Metin: Ana ekran 30, Gün tamam 38. Bitki: ≤15 ve ≤12. | "Görünür varsayılan" (katlı not hariç) ve "sözlük tavanı" (katlı dahil) ayrı. Klasik düzenli 1.1.x'te tavan, yeni düzende görünür hedef geçerli. |
| **Dock vs Krizdeyim** | K17: konum/etiket sabit. F4-6: 5 öğeli dock'ta 124x80'lik çip. | Çelişki kaldırıldı: Krizdeyim dock'tan çıkar, tam genişlik ≥84 dp sabit satır; dock 3 öğe. |
| **Gün tanımı** | Bitki: 24 sa'lik paket günü. Kontrol: takvim günü. | Takvim günü (K23); bitki, `done`, kontrol aynı anahtar. |
| **Ödül koreografisi vs mağaza kuralı** | Uygulama: 1000 ms bekleme, asma (1.15), hardal halka, parıltı sprite'ı. Mağaza: "konfeti/parıltı/madalya yok". | Bekleme, asma, halka, parıltı kalktı; mağaza ve uygulama aynı kuralı taşır (4.1). |
| **`rest` yaprağı** | S19: soluk yaprak. Utandırma yok kuralı. | `rest` tam yaprak + yalnız kendi ekranında ince işaret; paylaşılan yüzeylerde yok (5.3). |
| **Ödül/satış zamanı** | F2-2: kriz sonrası 30 dk. | Genel `salesQuietUntil` kuralı (K26). |

### 1.3 İşaretlenen tutarsızlıklar ve doğrulanamayanlar

1. **Takvim uyumsuzluğu.** Yayın planı 13-14 hafta öngörüyordu. Sekiz planın görev toplamı ham 143 iş günü; çakışmalar ayıklanınca ilk taslakta 128,45; eleştiri sonrası net +18,2 ile **146,65** (1.4). Bu belge görev toplamını esas alır; tatiller ve yayın bekleme günleri takvimde ayrı satırlardır (bölüm 9).
2. **Akış planı özeti** Sürüm B için 8,5, Sürüm C için 9,5 gün diyor; görev toplamları 9,5 ve 9,0. Görev toplamları kullanıldı.
3. **Kelime ölçümleri iki farklı yöntemle** yapılmış: kurulum 920/1165 ve 933/1183; kriz 85, 86, 97. Belge, metin alanı ölçümünü esas alır.
4. **Tuval ile uygulama ayrışmaları** bilerek sadeleştirildi: tuvalde 3-6 sonsuz döngü var (uygulamada ekran başına en çok 2); tuvalin imza göstergesi 9 noktalı (uygulamada 7 adım + kapı); tuvalde Hayır butonu vurgulu (uygulamada eşit); tuval 'Sahit ol' yanında "istediğin an reddet" der (sunucu kabulden sonra ayrılmayı 409 ile reddediyor, S5); tuvalde Gün tamam'daki bekleme/asma/halka/parıltı ve kıvrık-soluk yaprakların şahit penceresinde görünmesi uygulamaya alınmadı.
5. **Doğrulanmamış varsayımlar** (hiçbiri cihazda ölçülmedi): 60 fps, düşük RAM'de bellek, `renderToHardwareTextureAndroid` ve `collapsable` davranışı Fabric/0.86'da, `transformOrigin` + native sürücü, `Image resizeMode='repeat'` Android'de, Metro'da yalnız-@2x soneksiz `require`, asimetrik köşe yarıçaplı kesik kenarlı çizgi, `expo-splash-screen` `dark` bloğu, Android 12+ splash kırpması, **`android.allowBackup` alanının Expo 57 `app.json` şemasındaki adı ve AAB manifestindeki sonucu (F1-19'da docs.expo.dev v57 sayfasından ve manifest dökümünden doğrulanır), `useFonts` hata dönüşünün kapıda ele alınışı**. Hepsi F3-5 spike'ına, F1-17/F1-19'a veya cihaz kapılarına bağlandı.
6. **Tahmin edilen değerler:** font dosya boyutları, opsz değerleri, sprite boyutları (0,45-0,65 MB), Archivo kök importunun 2,1 MB'ı; `expo export` ile F3'te ölçülecek.
7. **Mevcut 17 Ekim ASO girişi** (ad ve kısa açıklama) yeniden oynanmaz.
8. **Takvim günü tanımının bedeli.** Aksam başlayan pakette son gün (gün N) sunucu tamamlama anına kadar (başlangıç saatinden N x 24 sa) iki takvim gününe yayılabilir (tahmin ≈ 1,8 gün); kontrol yine takvim gününde bir kez. Sunucunun tamamlama hesabı değişmez, istemci yalnız gösterir (`min(goal)`).
9. **`engel` dalı değişmezle çelişir:** Kotlin VPN modülü "yeni native bağımlılık yok" kuralına aykırıdır; K27 ile bu planın dışında tutuldu, birleşirse kullanıcıdan açık istisna gerekir.
10. **Kriz kilidi istemcidedir**; sunucuda kilit yoktur. "Yanlışlıkla bastım" için gereken yalnız sunucuda geri çekme kaydı ve şahide düzeltme e-postasıdır (F1-20).

### 1.4 Toplam çabanın özeti

| Kalem | İş günü (tahmin) |
|---|---|
| Sekiz alan planının ham toplamı | ≈143 |
| Birleşik plan, çekirdek (ilk taslak) | 128,45 |
| Eleştiri sonrası net eklenen işler (F0 +1,5; F1 +10,25; F2 +2,5; F4 +3,0; F7 +0,2; F9 +0,75) | +18,2 |
| **Birleşik plan, çekirdek (bu sürüm)** | **146,65** |
| Koşullu / isteğe bağlı (BIT-12 1,5; HAR-14 1,0; BIT-13 1,0; AKI-20 1,0; AKI-21 1,0; TEM-12 0,75; F10-2 `engel` birleşimi 5,0) | +11,25 |
| Risk payı x1,3 (yargıç 1,4-1,8x iyimserlik bildirmişti) | ≈191 |
| Asgari yol (F0, F1, F2, F3, F4, F7 ve F9-1/F9-2; F5, F6, F8, site atlanır) | ≈111 |

Takvim (26 Ekim 2026 Pazartesi başlangıç, haftada 5 gün, tek geliştirici): çekirdek ≈31 hafta, yaklaşık **28 Mayıs 2027** (Kurban Bayramı ≈16-19 Mayıs düşülürse ≈1 Haziran); risk payıyla ≈**30 Temmuz 2027**. 29 Ekim, 1 Ocak, 23 Nisan, 19 Mayıs, 15 Temmuz ve bayramlar takvime işlendi; Play incelemesi ve kademeli yayın beklemeleri ayrı satırlarda (bölüm 9).

---

## 2. Bugün ve hedef ölçümler

### 2.1 Ekran başına görünür kelime (TR, parantez içi EN)

Kaynak: `olcum.json` (kelime = en az bir harf/rakam içeren belirteç, yer tutucu bir kelime). "Hedef" iki sütun: **görünür varsayılan** (katlı "Neden böyle?" notu hariç, yeni düzen) ve **sözlük tavanı** (katlı notlar dahil, `copy-check` kapısı; yaklaşık yeni sayı + %15).

| Ekran | Bugün TR (EN) | Hedef görünür (yeni düzen) | Sözlük tavanı TR/EN |
|---|---|---|---|
| Kurulum toplamı (10 adım) | 920 (1165) | ≤175 (kapı + 7 adım) | 470/620 (yeni sayı 412/547) |
| K1 Tür seçimi | 100 (107) | ≤14 | 45/55 |
| K2 Tetikler | 108 (118) | ≤24 | 65/75 |
| K3 Neden | 62 (85) | ≤15 | 30/40 |
| K4 Şahitler | 128 (163) | ≤28 | 65/80 |
| K5 Paket | 127 (147) | ≤28 | 55/65 |
| K6 Sonuçlar | 94 (138) | adım kalkar | (50/65 yalnız ara sürüm) |
| K7 Mektup | 67 (82) | adım kalkar (imza sonrası, isteğe bağlı) | 35/45 |
| K8 Hesap | 29 (36) | ≤22 | 25/32 |
| K9 Sözleşme | 154 (214) | imza adımına katlanır | 75/110 |
| K10 İmza videosu | 51 (75) | imza sonrasına | (adım kalkar) |
| İmza adımı | (K9+K10) | ≤22 | 55/80 |
| Ana ekran | 67 (74) | ≤15 (deneme son 2 günde +≤10: "Deneme N gün sonra bitiyor." satırı) | 35/45 (yalnız 1.1.x klasik ekran) |
| Günlük kontrol, soru | 20 (28) | ≤12 | 18/25 |
| Günlük kontrol, dürtü | 34 (39) | ≤12 | 30/36 |
| Bugün tamam | 68 (78) | ≤12 (deneme son 2 günde nötr bir satır +≤10) | 45/55 (klasik) |
| Kriz ana ekranı | 97 (118) + kullanıcı metni | ≤30 | toplam 70/85 (ana ekran + Nedenim sayfası ≤40) |
| Tekrar oynadım, form / sonuç | 37 (53) / 59 (77) | ≤30 / ≤45 | 34/46 ; 50/70 |
| Çıkış, şahitli / şahitsiz | 55 (77) / 62 (78) | ≤40 | 50/60 ; 48/62 |
| Paywall (deneme bitti) | 100 (122) | ≤72 (üç satırlık kazanım listesi kalkarsa ≈63) | 80/95 |
| Paketim, paket aktif | 82 (94) | ≤47 | 52/62 |
| Şahitlerim | 79 (94) | ≤53 | 58/70 |
| Günlük | 60 (72) | ≤53 | 58/66 |
| Kilitli analiz kartı | 30 (35) | ≤20 | 22/26 |
| Sakinleş menüsü | 69 (101) | ≤20 | 60/90 (klasik) |
| Pakt tamamlandı | 62 (75) | ≤36 | 42/50 |
| Şahit daveti / portal | 59 (94) / 50-73 (60-86) | ≤22 / ≤30 | 48/70 |
| Kamera izni | 24 (45) | ≤17 | 20/28 |
| Profil | 150 (168) | ≈111 | 115/130 (tahmin) |
| Mağaza ekran görüntüsü, kare başına | ort. 75,1 (toplam 601) | ≤15 | (poster başlığı 4-7 kelime) |

Ek bulgular: 31 ekranda TR ortalama 73, medyan 67 (EN 92/82); 100 kelime ve üstü TR'de 7, EN'de 10 ekran. Bilim kutuları kurulumun 389 kelimesi (%41,7); Ana ekranda 7 alt bağlantı ekranın %59'u; kriz ekranında 5 maddelik talimat toplamın %36'sı. Paywall'da ilk fiyat 66. kelimede, "tek seferlik, abonelik değil" 86-92. kelimede; paket ekranına kurulumda 398 kelime sonra gelinir.

### 2.2 Teknik ölçümler: bugün ve hedef

| Alan | Bugün (kanıt) | Hedef |
|---|---|---|
| Renk kullanımı | `c.*` ≈480 okuma, 20 dosya; palet dışı sabit renk 18 yerde (`#5E1509`, `#DD2B0F`, `rgba(236,48,19,…)`, `#EC3013` …) | Sabit renk 0 (`check-theme.mjs` izin listesi F10'da boş) |
| Kontrast | Eski `mute` 4,21 ve 3,15; Field kenarı 1,81/1,41 | Gövde ≥4,5:1, arayüz sınırı ≥3:1, her iki temada |
| Yazı | 130'dan fazla yerde 8-12,5 px; Kicker 10,5 px; 34 farklı punto | Taban 13 px, 9 basamaklı ölçek; Caveat ≥22 px |
| Erişilebilirlik | `accessibilityRole` 0 kullanım; kriz yardım satırları ≈37-39 dp; "Tekrar oynadım" ≈27 dp | Rol/durum/etiket ortak bileşenlerde; hedefler ≥48 dp (kriz ≥64-72 dp, Krizdeyim ≥84 dp) |
| Hareket | Setup imza: 40 ms `setInterval` + `setHold` (25 yeniden çizim/sn); `useCountUp` her tamsayıda `setState`; `usePulse` JS yeniden başlatma; hareketi azalt tek seferlik okuma; haptik 0 | Yeniden çizim ≤2; JS sürücü 0; dinleyicili tek kanca; seyrek haptik |
| **Yeniden çizim / yazma** | `store.tsx:83-84` her `set` yeni nesne + tüm state JSON yazımı; `server.tsx:74` 30 sn `tick` → `apply()` → `app.set` (eşitlik kontrolü yok) | Değişmeyen veride state referansı aynı; 60 sn boşta Home yeniden çizimi 0, `AsyncStorage.setItem` ≤2 (render ve yazım sayacıyla ölçülür) |
| **Açılış güvenliği** | `useFonts` hatası yok sayılır (`App.tsx:71`), kapı için zaman aşımı yok; `/health` süreç başına bir kez (`billing.ts:6-7`) | Kapı ≤3 sn, sistem fontu yedeği; sağlık işareti; kalıcı `/health` önbelleği |
| **Gün tanımı** | 6 kopya; bitki/`done` farklı anahtarlar | Tek `packDay.ts`, takvim günü |
| **Gizlilik** | `allowBackup` kapalı değil (belirsiz) | `allowBackup:false` doğrulanmış |
| Kriz ekranı | Aramalar kaydırma altında; telefonsuz şahitte ölü dokunuş; `left % 14` yüzünden ilk komut "Ver"; her saniye tüm ekran yeniden çizilir | Kaydırmasız; sabit dock; ilk komut "Nefes al"; yalnız `CrisisClock` saniyelik |
| Paket boyutu | Archivo kök importu 18 TTF ≈2,1 MB (tahmin) | Alt yol importu F1'de; yeni yazı tipi varlıkları ≤1,0 MB; AAB ≤ baz +1,5 MB (1.2.0), ≤ baz +2,0 MB (1.3.0); sprite ≤0,8 MB (bitki seti ≤600 KB, dosya ≤40 KB) |
| Açılış | Splash her zaman `#0A0A0C`; ilk kare koyu | Gündüz `#F4ECDB` / gece `#1B2820`; parlama yok |
| Görsel varlık | Uygulamada 6 simge dosyası; mağazada 8 yeniden üretilemez PNG, eski "LockIn" izi | ≈58-66 sprite; 8 kare TR + EN, hattan üretilir |

### 2.3 Performans ve kalite eşikleri

Hiçbir cihaz ölçümü yok; aşağıdakiler öneri eşiğidir ve **F0-2 baz çizgisi alınmadan kesinleşmez**. Cihaz sınıfları (tahmin): A = 2 GB RAM, 720p, 60 Hz, Android 11-13; B = orta, 4 GB, 1080p. Eşikler: A sınıfında janky kare ≤%5 ve 99. yüzdelik ≤33 ms, B sınıfında ≤%2; her sürüm baz çizgiden kötü olamaz; soğuk açılış ≤ baz +%20; kriz dokunuş→süre gösterimi ≤ baz +50 ms; hareket kaynaklı görüntü belleği ≤12 MB/ekran; kriz 15 dk içinde saniyelik tick kayması ≤150 ms.

**Kapı niteliği (S18'e bağlı):** Gerçek A sınıfı cihaz ölçümü varsa bu eşikler **sert kapıdır**. Yoksa (yalnız AVD + Play ön-başlatma raporu) eşikler **uyarı kapısıdır**: yayını engellemez, ama sürüm notuna "düşük donanım doğrulanmadı" yazılır, %10 kademesinde Android vitals (jank, ANR, çökme) izlenir ve `/health` `ui.plant` ile uzaktan `lite` hazır tutulur.

---

## 3. Tasarım dili

### 3.1 Palet (gündüz kâğıt, gece derin yeşil)

| Rol | Token | Gündüz | Gece | Eski ad eşi |
|---|---|---|---|---|
| Zemin | `paper` | `#F4ECDB` | `#1B2820` | `bg`, `glow`, `c.ink` (dolgu üstü yazı) |
| Kart | `paper2` | `#FBF6EA` | `#243329` | `surf` |
| Dolgu | `sand` | `#E8DCC0` | `#2F3F33` | `cell` |
| Metin (çay mürekkebi) | `ink` | `#24352A` | `#F2E9D4` | `fg` |
| İkincil metin | `ink2` | `#4B5B4B` | `#C3CDB8` | `dim`, `mute` |
| Kurşun çizgi, arayüz sınırı | `edge` | `#6A7864` | `#8C9C86` | (yeni; `line` yalnız dekoratif ayırıcı, ink %22 alfa) |
| Ana eylem (ada çayı) | `act` / `onAct` | `#3B6748` / `#FBF6EA` | `#A9CBA0` / `#142019` | (yeni) |
| Seçili / nefes kartı | `sageWash` | `#CBD9BE` | `#314A39` | (yeni) |
| Yaprak (dolgu, dekor) | `sage` | `#8FAA87` | `#7FA27A` | (yeni) |
| Kil (kriz düğmesi, el notu) | `clay` / `onClay` | `#A24622` / `#FBF6EA` | `#F0A584` / `#2A1710` | `acc`, `acc2` |
| Kil yıkama | `clayWash` | `#EDC3A8` | `#5A3A2B` | (yeni) |
| Hardal (bugün, güneş) | `mustard` | `#DCA83F` | `#EBBD5C` | `amber` (metin için `#7A5200` gündüz) |
| Lale | `tulip` | `#CF5F44` | `#F08C6D` | (yeni) |
| Su (şahit modu) | `water` / `onWater` | `#3F7089` / `#FBF6EA` | `#9CC3D6` / `#142019` | `blue` |
| Şahit penceresi | `waterWash` | `#CFE0E6` | `#2A4350` | (yeni) |
| Toprak, saksı, gökyüzü | `soil`, `pot`, `sky` | `#C9AE86`, `#C98660`, `#DCE5CC` | `#3B3A2C`, `#B9714D`, `#22362A` | (yeni; kriz sahnesi `sky`) |
| Tepeler, gölge | `hill`, `hill2`, `shadow` | tuvaldeki değerler birebir | tuvaldeki değerler birebir | (yeni; gölge = ink tabanlı sert, 4 px aşağıda duran kardeş katman) |
| Gren opaklığı | `grainA` | 0,5 | 0,28 | (yeni) |
| Dış sütun (web), ters yazı | `outer`, `subOn` | `sand`, `#C3CDB8` | `#131C16` (tahmin), `#4B5B4B` | `outer`, `subOn` |

Not: `mute` ayrı bir soluk ton olmaktan çıkar (`ink2`'ye eşit); `grid` 0. Hardal geniş dolgu olarak kullanılmaz (mağaza ve kumar çağrışımı kuralı); yalnız bugünün tomurcuğu ve küçük güneş.

### 3.2 Kontrast ve yasak çiftler

Tuval Kimlik sayfasındaki hesaplı değerler `check-theme.mjs` için test vektörüdür. Gündüz: ink/paper 11,05; ink/paper2 12,04; ink2/paper 6,17; onAct/act 6,05; onClay/clay 5,67; onWater/water 5,01; clay/paper 5,20; edge/paper 3,99; tulip/paper 3,33. Gece: ink/paper 12,68; ink/paper2 11,00; ink2/paper 9,30; onAct/act 9,39; onClay/clay 8,48; onWater/water 8,95; clay/paper 7,60; edge/paper 5,26.

**Yasak çiftler (betik başarısız sayar):** kil metni sand üstünde (4,49); kil / sageWash (4,14); ada çayı metni / sageWash (4,41); ink2 / clayWash (4,48, gündüz). Hardal ve yaprak yalnız dolgu/dekor (hardal/paper 1,84; yaprak/paper 2,16): durum yalnız renkle değil biçimle de ayrılır (düz mürekkep / kesik kurşun / hardal tomurcuk / kıvrık kenar). Siyah (`#000`) ve saf beyaz yok; eski kırmızı hex'ler yok. Opt etiketinde seçili durum `ink` yazı + çizilmiş onay işareti.

### 3.3 Yazı ölçeği

| Rol | Aile | Boyut | Kural |
|---|---|---|---|
| Gün sayısı | Fraunces SemiBold | 112 (küçük ekranda 88) | `num`: tabular-nums; `maxFontSizeMultiplier` 1,0 (≥48 px) |
| Kriz süresi | Fraunces SemiBold | ≥68 (sahneye göre 68-104) | tabular; taşma yok |
| Başlık | Fraunces SemiBold | 36-48 | `letterSpacing ≥ −%2 boyut`, `lineHeight ≥ 1,12x` (Ğ İ Ş Ö Ü) |
| İtalik alt satır | Fraunces Medium Italic | 21-24 | italik örnek gereksizse Nunito 700 |
| Gövde | Nunito 500/700 | 16-19 | taban 13 px; çarpan 1,3 |
| Düğme | Nunito 800 | 19-20 | `minHeight` (sabit yükseklik değil) |
| Kicker / etiket | Nunito 800 | 13, ls 1,2 | büyük harf sabit dizeler olduğu gibi |
| El notu | Caveat 600 | ≥22, ≤3 kelime | `__DEV__` uyarısı; kil rengi kum/sageWash üstünde yasak |

Ölçek basamakları (TS): 13, 14, 16, 18, 19, 24, 36, 48, 112. Özel aile adıyla `fontWeight` asla verilmez. Android'de `includeFontPadding: false`. Fraunces opsz değerleri (SemiBold ≈48, Medium ≈24) tahmindir; cihazda tuvaldeki `font-optical-sizing:auto` ile karşılaştırılır. Okların ve onay işaretlerinin (→ ✓ ○ ✕ ✎ ▶) glifi yazı tipi paketlerinde beklenmez: View ile çizilir. `T` bileşeninde `w` verilmemiş ve boyut ≥26 ise otomatik Fraunces ("d"); açık `w="b"` her zaman Nunito. **Yazı tipleri yüklenemezse** (`useFonts` hatası ya da 3 sn zaman aşımı) `F` haritası `fontFamily` vermez ve sistem fontu kullanılır (K24).

### 3.4 Şekil dili

- **Kusurlu yuvarlak:** `pebble(h, v)` 4-5 deterministik varyant (etiket/indeks hash'i, `Math.random` yok); köşe yarıçapı yüksekliğin oranı (60 px düğme: 32/26/34/28). Kısıt: her dikey kenarda TL+BL ≤1 ve TR+BR ≤1 (betik doğrular). Daire yok (çip/rulet çağrışımı).
- **Eğik kâğıt kartlar:** ±1,2°, indekse göre alternatif; `TextInput` içeren kartta eğim yok; yalnız dekoratif kartlar eğilir.
- **Kâğıt gölgesi:** `elevation`/`boxShadow` değil; aynı yarıçaplı `c.shadow` renkli kardeş katman 4 px aşağıda; basınca üst katman 3 px `translateY` ile gömülür. Saydam düğmede gölge yok.
- **Çizgi:** kalın mürekkep 1,7-3,4 px, dolgu 2 px kaçık (sprite'a pişirilir), gelecek kesik kurşun. Kesik çizgili damga (tek seferlik güvencesi): 2,4 px kil kenar, radius 26/20/28/22, −1,2°; Android'de asimetrik radius + dashed doğrulanır, yedek tek yarıçap 24.
- **Zikzaklı üst kenar**, **kemer pencere** (şahit portalı), **bahçe etiketi** (neden notu).
- **Gren:** tek katman, içeriğin altında, `pointerEvents="none"`, `tintColor=ink`, opaklık `grainA`; `GRAIN` bayrağı ile kapanır; tam ekran bindirme/karışım modu yok.
- **Düğme:** ana düğme 56-64 dp, kriz 72-84 dp; Krizdeyim ≥84 dp tam genişlik; `ActionBar` API'si bozulmaz (52 çağrı derlenir): `kind` light→go, red→clay, ghost, yeni water.

### 3.5 Token mimarisi

`palette.ts` (saf veri, RN importsuz) `DAY`, `NIGHT` ve `CLASSIC` nesnelerini verir; `theme.ts` `SKIN` bayrağına göre seçer. `c`, `applyTheme(t)`, `currentTheme()`, `ThemeName`, `ThemePref` imzaları aynen kalır; `applyTheme` aynı `c` nesnesini `Object.assign` ile değiştirir ve render içinde çağrılmaya devam eder. Yeni ihraçlar: `SP`, `HIT`, `TS`, `DUR`, `SHADOW`, `GRAIN`, `CRISIS_THEME`, `pebble`, `clayA`, `scrimA`, `play`. Açılışta `Appearance.getColorScheme()` ile eşzamanlı ilk palet; `App` kökü `key={theme}` ile yeniden kurulur ve OS kaynaklı değişim meşgul ekranlarda (`setup, verify, relapse, exit, journal, crisis, guardian`) `useShownTheme` ile ertelenir. Varsayılan tercih `'system'`.

---

## 4. Hareket dili

### 4.1 İmza hareketler

**Ödül dili kuralı:** Hiçbir hareket gecikmeli açılış (suspens), aşma/yay (overshoot), parıltı, halka ya da konfeti içermez; açılışlar sakin, tek ve monotondur. (Mağaza kuralı "konfeti/parıltı/madalya yok" ile uygulama aynıdır.)

| Hareket | Nerede | Süre / eğri | Native tekniği | Hareketi azalt | Haptik |
|---|---|---|---|---|---|
| Yaprak açılışı | Gün tamam (günde bir kez) | 800 ms, **gecikme yok**, bezier(.2,.8,.2,1) (aşma yok); scale .6→1 + opacity; ekran açılır açılmaz başlar (kayıt "Kaydet"te zaten yazılı) | tek native timing | yaprak doğrudan açık | settle (tek) |
| Lale açılışı | Her 7. paket günü | 1000 ms, aşma yok; tomurcuk solar; **halka ve parıltı yok** | native timing + paralel opacity | lale açık | aynı tek settle |
| Tomurcuk nabzı | Ana ekran, yalnız kontrol bekliyorken | 3600 ms, scale 1→1,09, en çok 6 devir | doğrusal sürücü + interpolate duraklar | durağan halka | yok |
| Esinti | Ana ekran | 2,4 sn salınım, en az 15 sn arayla | alt-merkez pivotlu rotate | yok | yok |
| Nefes | Kriz, Nefes kartı | 14 sn (4/4/6; onay yoksa 4/0/6), ölçek 1→1,16; yazı aynı başlangıçtan | `Animated.loop` + devir sonu duvar saati düzeltmesi | disk sabit (ölçek ~1,08), yalnız yazı değişir | yok |
| Rüzgârda sallanma | Kriz | en çok 11°, zarf ~%32'de tepe, sonda ~%12-15; 3 sn'de oturur | iki sinüs x zarf, hepsi native | bitki 0°, durağan | yok |
| Köklenme | Kriz | 15 dk, 6 kök; 30 sn'lik timing parçaları | kırpıcı + ters kayan sprite | 10 sn'de bir adım (tween yok) | yok |
| Basılı tut, filiz büyür | İmza | 2200 ms doğrusal; bırakınca kalan x 900 ms geri | tek `Animated.Value` | ilerleme dolgusu çalışır; fidan iki durumlu | signStart, signDone (2 çağrı) |
| Su damlası | Şahit portalı | düşüş 1500 ms bezier(.5,0,.9,.6); su halkası 1600 ms (1350 ms gecikme; sprite yok, View çizimi; bu halka ödül değil, suyun yüzeye değmesi) | paralel native timing | damla yok, halka statik | gönderende tick |
| Kıvrılan yaprak | Tekrar oynama | 900 ms bir kez; 360 ms çapraz solma | iki katman opacity | kıvrık durağan sprite | yok |
| Kâğıt perde | Ekran geçişi | 420 ms alttan yükselir; kriz yalnız 200 ms solma | `translateY` (+ opacity) | 200 ms solma | yok |
| Sayı yerleşir | Gün sayısı | 600 ms scale .94→1 (0'dan sayma yok) | native | anlık | yok |
| Ateş böceği | Gün tamam, yalnız gece (ortam, açılış anıyla senkron değil; sageWash/ink2 tonunda) | 7000 ms, en çok 3 devir | tek sürücü | yok | yok |

### 4.2 Teknik kurallar

1. Hiçbir hareket JS sürücü kullanmaz; native değer üzerinde `addListener` yok; ilerleme `setState` ile taşınmaz. Tamamlanma yalnızca bitiş geri çağrımından gelir.
2. Easing interpolate duraklarına pişirilir (`bakeStops(fn, n≈48)`): native interpolate `easing` kabul etmez; kapalı döngülü eğriyi timing easing'i yapmak her devirde 1 karelik sıçrama verir. Tek yönlü monoton hareketlerde timing easing'i serbest.
3. Genişlik animasyonu `scaleX` + `translateX` telafisi ya da iç içe `overflow:hidden` + zıt `translateX`; pivot reçeteleri `[translate(+p), rotate, scale, translate(−p)]`; alt-merkezden sallanma `[translateY +h/2, rotate, translateY −h/2]` (`transformOrigin`'e bağımlı olmayan yedek; F3-5'te cihazda doğrulanır).
4. Renk dolumu iki katmanlı opacity çaprazıyla.
5. Ekran başına sonsuz döngü ≤2; `useLoop` `__DEV__`'de aşımı uyarır; AppState `active` dönüşünde yeniden eşler; metinle senkron tek döngü (nefes) devir sonunda duvar saatine göre düzeltilir; kriz zaman çizelgesi 30 sn'lik parçalara bölünür.
6. Her `Image` `fadeDuration={0}`; ilk yükte bitki kabı `onLoad`'a kadar opacity 0. `Math.random` yok; jitter sabit tohumlu. **`useCountUp` F1-5'te (Home), `useIntro` F4-6/F4-7'de silinir**; gün kapanışı günde bir kez (`closeAnimDay`), Ana ekran belirmesi günde bir kez (`gardenSeen`).
7. Kriz saniyelik `state` yalnız `CrisisClock` bileşeninde; sahne `React.memo`.

### 4.3 Hareketi azalt

`src/motion/reduce.ts`: modül yüklenirken `AccessibilityInfo.isReduceMotionEnabled()` okunur, `reduceMotionChanged` dinlenir, `useSyncExternalStore` ile `useReducedMotion()` döner; `App.tsx` açılış kapısı ilk okuma bitene kadar (en çok 300 ms, **kapının 3 sn sınırı içinde**) bekler. Etkin değer = kullanıcı tercihi `'reduce'` ise true, `'system'` ise sistem. Profil'de iki durumlu "Hareket" satırı. Android'de RN bunu `TRANSITION_ANIMATION_SCALE == 0` olarak tanımlar; bütçeli telefonlarda hızlandırma hilesi olarak kapatılmış olabilir (tahmin), bu yüzden durağan hâl birinci sınıf tasarlanır. İlke: her hareketin 0 ms'lik son karesi vardır; olayı anlatan metin ve haptik kalır; sürekli ortam hareketleri durur; kullanıcıyı yöneten işlevsel geri bildirim (imza ilerlemesi, kriz saati) korunur. Kâğıt perde 200 ms solmaya iner.

### 4.4 Haptik

`src/haptics.ts` (+ saf `hapticsPolicy.ts`): `tick` (seçim: Opt, paket seçimi), `settle` (gün kapanışı, tek), `signStart`, `signDone` (imza, tam 2 çağrı); basılı tutarken periyodik titreşim yok. Android zinciri (expo-haptics 57 kaynağı okundu): `performAndroidHapticsAsync` önce (Segment_Tick API 34 → Clock_Tick → `selectionAsync`; Confirm API 30 → `impactAsync(Light)`; Gesture_Start API 30 → Clock_Tick; signDone: Confirm → `notificationAsync(Success)`); Vibrator tabanlı yedekler sonda. Her çağrı try/catch; `VIBRATE` birleşik manifestte zaten var, yeni izin yok. **Kurallar:** kriz ve oyunlarda 0 çağrı (kapsam kancası); kriz girişinde titreşim yok; nefes titreşimi yok; iki haptik arası ≥800 ms; Profil "Titreşim" anahtarı (varsayılan açık, S13); web'de no-op.

---

## 5. Bitki sistemi

### 5.1 Sprite hattı

Kaynak SVG'ler `art/garden/src/` (tuvaldeki Main.dc.html yaprak `d="M1.5 11.5 C6 3.2 …"`, lale yolları, sap, tepe, güneş; Kriz.dc.html kökler; SahitPortal.dc.html damla). `tools/garden/` (kendi `package.json`, yalnız `sharp`, sürümler kilitli; APK'ya ve `apps/mobile/package.json`'a girmez): `wobble.mjs`, `build-sprites.mjs` (2x raster, birleşik sınır kutusuna kırpma, beyaz RGB + alfa, WebP kayıpsız effort 6; `MANIFEST.json` içerik özeti; `--check` yeniden üretip karşılaştırır), `budget.mjs` (toplam >0,8 MB veya dosya >40 KB ise hata), `contrast.mjs`. Çıktı `apps/mobile/assets/garden/<grup>/` ve `apps/mobile/src/garden/sprites.ts` (literal `require` manifesti + dp boyutu + renk rolü). EAS üretim çalıştırmaz; çıktılar depoya işlenir.

**Katman seti (≈58-66 dosya):** yaprak ink/wash/pencil x 3 kova; kıvrık yaprak ink/wash x 3; lale açık ink/wash, tomurcuk ink/wash, pencil; sürgün ink/pencil; sap tohum/filiz (ink + pencil); sahne: tepe/toprak şeritleri (line + fill, 1170 px kenar şeridi + düz renkli View), güneş/ay (ay yalnız gece), bulut, neden etiketi, el notu oku, gren; kriz kökleri x6 + hayalet kök; ortak: saksı, tohum, kemer pencere, damla, kapalı/dolu anahtar. **Parıltı ve hardal halka sprite'ları listeden çıkarıldı** (4.1 ödül dili kuralı). Bugünün tomurcuğu ayrı sprite değil: yaprak maskesi 0,62 ölçek + hardal tint. Tepe/toprak tam ekran bitmap değil.

### 5.2 Yerleşim algoritması (tek kaynak `core.ts`)

Filiz (30 gün), tuvalle birebir: kutu 340x400, top=40, bot=360, amp=36, SC=1,36.

- Gövde: `P(t) = (170 + amp·sin(6,4t + 0,55)·(1 − 0,42t), bot − t·(bot − top))`.
- Gün `i` için `t = (i − 0,5)/goal·0,97 + 0,02`; yön `i` tekse +1, çiftse −1; `kT = (1,08 − 0,52t)·(1 + jit·0,14)`; yaprak ölçeği `kT·SC`; açı `−(34 + (jit + 0,5)·22)°`; çapa gövde noktası (yaprak sol-orta, `transformOrigin '0px 50%'`, `scaleX(side)`).
- Her 7. gün yaprak yerine lale (uç `p + yön·34·kT, −34·kT`; ölçek `1,2·(kT + 0,12)`; açı `yön·(8 + (jit + 0,5)·6)°`) ve sürgün.
- `jit(i)`: tuvaldeki `frac(sin(i·12,9898)·43758,5453)` motor farklarına duyarlı olduğundan `Math.imul` tabanlı tamsayı karışımıyla yeniden tanımlanır; `buildLayout('filiz')` ve `('agac')` golden JSON ile kilitlenir.
- Aşamalar `stageFor(goalDays)`: ≤7 tohum, ≤30 filiz, ≤60 fidan, diğerleri ağaç (sunucu 180 kabul ediyor, `routes.ts:190` listesi `[30,60,90,180]`; mobil 30/60/90 sunuyor).
- Fidan/Ağaç (F8): limb modeli, limb başına 30 gün, `u = (m + 0,5)/30·0,97 + 0,02`; limb 0 gövde (gün 1-30), limb 1 sol dal (31-60), limb 2 sağ dal (61-90); yaprak ölçeği fidan ≈0,9 / ağaç ≈0,78 (sanat sprint'inde ayarlanır). 1.3.0 yedeği: filiz gövdesi + yaprak ölçeği `1,36·√(30/goal)`.
- **Gün tanımı (K23), tek kaynak `src/packDay.ts`:**
  - `calendarDay(t)` yerel `y-m-d` bileşenlerinden `Date.UTC(y, m, d)/86400000` tamsayısı (DST'ye dayanıklı; 23/25 saatlik günlerden etkilenmez). `packDayOf(t, startedAt) = min(goal, calendarDay(t) − calendarDay(startedAt) + 1)`; `streakDayOf(t, streakStartedAt)` aynı kuralla.
  - **Sınır yerel gece yarısıdır.** Akşam 20:00'de başlayan kullanıcı için gün 1 o akşamın kalan saatleridir, gün 2 ertesi takvim günüdür. Aynı kullanıcı 22:00'de ve ertesi 09:00'da kontrol ederse bunlar farklı günlere düşer.
  - Check-in anahtarı `localDay()` (zaten `store.tsx`'te, `Verify` ve `server.tsx:99` `day: localDay()` kullanıyor); `done` (`Home.tsx:30` bugün `dayKey`) ve yaprak durumu aynı anahtarı kullanır: yaprak `grown` = bu takvim gününe düşen en az bir check-in.
  - İkinci kontrol: istemci `done` ile engeller; sunucu 409 dönerse (cihaz saat dilimi değişmesi vb.) **sessiz yutulmaz**: istemci "zaten kaydedildi" durumuna geçer ve yerel kayıt çiftlenmez; ağ hatasında yerel kayıt geçerli kalır (`Verify.tsx:22`'deki `.catch(() => {})` bu iki durumu ayırır).
  - Sunucunun tamamlama hesabı (`started_at + goal_days·24sa`) ve `routes.ts:193` 409 kuralı değişmez; istemci yalnız gösterir (1.3 madde 8: aksam başlangıcında son gün iki takvim gününe yayılabilir).
  - Kopyalar tek yere taşınır: Home.tsx:24-28 (+`dayKey` L15), Plan.tsx:22, Profile.tsx:42,77, DayDone.tsx:21-22, Relapse.tsx:20-21. Pending.tsx:109 `end = startedAt + goalDays·DAY` sunucu bitiş zamanıdır, kalır. `Analysis.tsx` son 7 gün grafiği `localDay` ile aynı anahtara çekilir.
  - Test vektörleri (`packDay.test.ts`, TZ ayarlı): akşam başlangıcı + aynı gün gece + ertesi sabah; 23:59→00:01; ABD DST başlangıcı (14 Mart 2027), İngiltere (28 Mart 2027) ve ABD bitişi (7 Kasım 2027); saat dilimi değişimi; goal sınırı.

### 5.3 Yaprak durumları

| Durum | Koşul | Çizim |
|---|---|---|
| `grown` | geçmiş gün, o takvim gününde check-in var | ink + wash tam |
| `curl` | `relapses[]` içinde o gün | kıvrık yaprak ink + wash; yaprak silinmez; lale gününe denk gelirse boynu eğik lale (+18°); **yalnız kullanıcının kendi ekranında** |
| `rest` | geçmiş, check-in yok, tekrar oynama yok | **tam yaprak (`grown` çizimi)**; yalnız kullanıcının kendi ekranında yaprağın altında ince kurşun nokta; soluk dolgu, X, damga, boşluk yok |
| `due` | bugün, check-in yok | hardal tomurcuk, nabız (≤6 devir) |
| `open` | bugün, check-in var | açık yaprak; taze ise açılış (4.1) |
| `future` | gelecek | pencil, opaklık .7 (sürpriz yok) |

Çizim varyantları: `variant="own"` (Ana ekran, Gün tamam: yukarıdaki tablo) ve `variant="window"` (şahit penceresi): yalnız `day` kadar tam yaprak ve 7'nin katı paket günlerinde lale; `rest` ve `curl` **çizilmez**, boşluk yoktur. Paylaşılan hiçbir yüzeyde (şahit portalı, paylaşım metni, mağaza kareleri, mail) kıvrık/işaretli yaprak görünmez.

Check-in kümesi `a.checkIns ∪ a.lastCheckIn`; yeniden kurulumda yalnız `lastCheckIn` geri geldiğinden `historyFloor` (yerel ilk kayıttan önceki günler `grown`) bilinmeyeni cezalandırmaz. Yüksek dürtülü ama tutulan gün yaprağı kıvırmaz. `dayStates({assumeDoneToday:true})` Gün tamam'da bugünü taze açılan çizer.

### 5.4 Çizim mimarisi

Dış `Animated.View` (esinti, native) içinde **StaticPlant** (`React.memo`, `renderToHardwareTextureAndroid`, `collapsable={false}`, `pointerEvents="none"`; kurşun gövde + sürgün, limb başına `overflow:hidden` ink gövde kırpması, geçen günlerin yaprak/laleleri) ve **Dynamic** (≤6 düğüm: bugünün tomurcuğu/yaprağı, taze açılan yaprak/lale, not oku). Gövde ilerlemesi kırpmayla, yapraklar tek tek sprite. Düğüm sayısı: filiz sonu ≈66, ağaç sonu ≈200 `Image`. Büyük sprite yalnız @2x. Erişilebilirlik: bitki tek `View accessible accessibilityRole="image"` ve `L.garden.a11y(day, goal, tulips, curled)`; içerideki `Image`'lar gizli. `PlantLite`: aynı `core.ts` yerleşimiyle `borderRadius`'lı View yaprak/lale; 1.2.0 Ana ekranı, sprite hattı gecikirse yedek, uzaktan "hafif mod", yerel sağlık işareti düşüşü ve kriz sahnesi için.

### 5.5 Güvenlik ağı: açılış, bellek, geri dönüş (K24)

1. **Kapı:** `App.tsx` `const [loaded, fontError] = useFonts(...)`; kapı `loaded || fontError || timedOut` ile açılır. `timedOut` tek `setTimeout(3000)`. Kapı açılınca `SplashScreen.hide()` (F4-1'den sonra) ve içerik çizilir; font yoksa sistem fontu. `motionReady` (en çok 300 ms) bu 3 sn'nin içindedir.
2. **Sağlık işareti (`src/bootGuard.ts`):** Home ilk mount'ta AsyncStorage'a `quitvow.bootFlag.v1` yazar, 5 sn ayakta kalırsa siler. Açılışta işaret duruyorsa önceki açılış 5 sn içinde öldü demektir: `plantMode` bu açılışta `'lite'`; art arda 2 ölümde `'off'` (`PlantLite`, animasyon yok). İşaret sayacı ayrı anahtarda, `lockin.v4`'e dokunmaz.
3. **`/health` bayrağı:** `billing.ts` `load()` (L6-7, `cached ??=`) `ui.plant` alanını da okur ve `quitvow.uiFlags.v1` kalıcı önbelleğine yazar (`/health` bugün `{ok, db, play, demo, billing}`, `app.ts:28`; F7-7 `ui:{plant}` ekler). Ağ yoksa son bilinen değer kullanılır; **hiç bilgi yoksa varsayılan `'lite'`**. Kurulum/Plan zaten `/health`'i okuduğundan (tahmin) önbellek ilk Home'dan önce dolar; mod oturum ortasında değişmez, bir sonraki Home mount'unda geçerli olur. Etkin mod = `min(sağlık işareti, uiFlags)` (`off` < `lite` < `full`).
4. **Sprite yüklenemezse** (`Image onError` ya da `useImageReady` 1,5 sn aşımı) Home yine açılır: bitki `PlantLite`'a düşer; sayı, CTA ve Krizdeyim sprite'tan bağımsızdır.
5. **Test:** `bootGuard.test.ts` (işaret yaz/sil, ardışık ölüm → mod), F7 kabulünde "sprite yüklenemezse Home açılır" ve "font hatasında 3 sn içinde açılır" cihaz testleri.

---

## 6. Ekran ekran uygulama

| Ekran / dosya | Bugünkü ana sorun | Yeni davranış | Faz |
|---|---|---|---|
| Kök: `App.tsx` | `SplashScreen` yok, ilk kare koyu; `useFonts` hatası yok sayılır, kapı için zaman aşımı yok; `key={theme}` yeniden kurma; kriz önceliği testsiz; ödeme/imza sonrası ekran-içi mesaj unmount ile kaybolur; paywall meşgul ekranı kesebilir | Açılış kapısı (fonts + store + auth + motionReady, **3 sn sert zaman aşımı**), `SplashScreen.hide()`; `moment` alanı ile Sealed; ekran seçimi saf `screenSelect.ts`: **şahit → kurulum → kriz → moment → meşgul ekran korunur → paywall/tamamlandı (`salesQuietUntil` dışında) → ekran**; Android geri tuşu | F0-5, F1-11, F1-17, F2-2, F2-3, F4-1 |
| `Setup.tsx` | 10 adım, ilk fiyat sonda; bilim kutuları %41,7; taslak yok; imza sırasında 25 yeniden çizim/sn; geri tuşu yok; `app.set` ödemeden önce | Kapı (3 güven satırı, eşit "Basla" / "Davet aldim", "Hesabim var") + 7 adım: Tür, Tetikler, Neden (atlanabilir), Şahitler, Paket, Hesap, Söz+İmza. Sonuçlar/mektup/video imza sonrasına. Taslak (TTL'li), Yardım (hesapsız), **iki ayrı onay (KVKK / şahit bildirimi)**, `hideHabit` varsayılanı S6'ya bağlı, çıkış kuralı sözleşmede; ödeme çağrı noktası `payFlow.ts` üzerinden | F1-11, F1-12, F1-21, F2-4, F5-2 |
| `Plan.tsx` | Fiyat/güven ekran dışında; varsayılan en pahalı; tebrik yanlış olabilir; indirim vaadi; ham hata; ödeme sonrası 409'da hak kaybı hissi | Sabit footer: fiyatlı CTA + "Tek seferlik…"; varsayılan en kısa/boş seçim; "N yeni gün, deneme dahil"; geçmiş paket seçilemez; ödeme öncesi `dry-run`; "hakkın saklandı" metni; nötr başlık; `buildReport` + "Örnek rapora bak"; `salesQuietUntil`; Filiz/Fidan/Ağaç SeedPacket (F5) | F1-21, F2-2, F5-4 |
| `Sealed.tsx` (yeni) | Ödeme/imza sonrası kapanış anı yok | "Soz verildi." / "Paket acildi."; mektup ve video isteğe bağlı ikincil | F2-3, F5-3 |
| `Home.tsx` | Izgara, 7 alt bağlantı, puan/para satırları, 15 sn yeniden çizim, 0'dan sayma (`useCountUp`) | **Krizdeyim: tam genişlik, ≥84 dp, altta, kaydırma alanı dışında sabit (kil).** Üstte: "Ben" çipi (≥48 dp), sayı bloğu, sahne (`PlantLite`→`Plant`), CTA (62 dp), 3 öğeli dock (Sakinleş, Şahitler, Günlük; ≥48 dp). Yazı ölçeği büyük/yükseklik yetersizse sahne+dock `ScrollView`'a düşer (Krizdeyim sabit). Durumlar: due / done / **deneme-bitiyor** (`home.trialLeft/trialLastDay`, mevcut Home.tsx:98 uyarısı) / completed ("Bahçen tamam.", Paketim). Küçük ekran (<700) 88 px sayı. Gün sınırında `useGardenDay` yenilemesi; sağlık işareti (5.5) | F1-5, F4-6, F7-4 |
| `Verify.tsx` | Kayıt yalnız DayDone "Panele dön"de; rastgele sonraki kontrol; Hayır/Evet vurgusu; sunucu hatası yutulur | Evet/Hayır eşit; dürtü seçici `adjustable`; kayıt "Kaydet"te; 409 = "zaten kaydedildi", ağ hatası = yerel kayıt; "Evet" yolu `go('relapse')` aynen | F1-14, F1-18, F4-7 |
| `DayDone.tsx` | Para/puan, 7 Opt listesi, kırmızı→kemik dolum | Taze yaprak/lale açılışı (gecikmesiz, 800/1000 ms), 4 çip (talked, busy, reason, move), el notu, gece ateş böceği; deneme son 2 günde nötr satır; kapanış günde bir kez; `dayMessage.ts` hizası | F4-7, F7-4 |
| `Crisis.tsx` (+ `src/crisis/*`) | Aramalar kaydırma altında; ölü dokunuş; +10 puan (L130); alarm kırmızısı; tüm ekran saniyelik yeniden çizim; yanlışlıkla basan 15 dk çıkamaz | Kaydırmasız sahne + sabit dock; `CrisisNote`; **"Yanlışlıkla bastım" (ilk 120 sn, ≥48 dp)**; 1.2.0 nefes diski + büyük süre + `CrisisClock`; 1.3.0 kesit: bitki en çok 11°, kökler; süre dolunca "Hâlâ zorsa aramalar açık."; haptik yok | F1-7, F1-8, F1-20, F4-8, F7-5 |
| `Calm.tsx` + oyunlar | Oyunda kriz bilgisi yok; sayaç ve parçacık; kozu simgeleri; sarı ipucu; Sudoku üretimi JS'i bloke eder | `CrisisStrip` (64 dp), nötr dil, reduce-motion; menü: tohum paketi kartları + Nefes; oyun renkleri token'dan; Sudoku üretimi soluk verir | F1-10, F4-5, F6-1 |
| `Relapse.tsx` | "−25/−50", üstü çizili sayı, BOZULDU damgası, ham hata; destek tıklanamaz | "Bir duraklama."; iki eşit seçenek; yaprak silinmez, 900 ms kıvrılır; "N temiz gün gerçekti; silinmiyor."; HelpRow; geri → forma; `salesQuietUntil` +24 sa | F1-13, F2-2, F6-2 |
| `Exit.tsx` | Ceza/ödül cümleleri, "Vazgeç, paktta kal" birincil, 12 px silme bağlantısı, destek yok | "Iki anahtar. Iki sahit."; "Kaliyorum"; 72 saat büyük sayaç; HelpRow; hesap silme ayrı bölümde ≥48 dp | F1-13, F6-3 |
| `Journal.tsx`, `Analysis.tsx` | +3 puan; kilitli kart 30 satır düz metin | Puan yazımı yok; kurşun kalem taslak + ORNEK etiketli önizleme + kendi kayıt sayısı | F6-6 |
| `Profile.tsx` | Tekrar oynadım / Çıkış / Şahit rolü yok; titreşim/hareket ayarı yok | Eklenenler: Tekrar oynadım, Çıkış talebi, "Şahit olarak gir", Hareket, Titreşim, Gece/Gündüz/Sistem hapı; silme kil metin | F1-2, F1-4, F4-6, F6-6 |
| `Pending.tsx` | Sayaç "{accepted}/2" yanıltıcı; indirim; durum yalnız renk | Durum metin + ikon; "Anahtar: n"; Completed indirimsiz, "bahçe belgesi" | F1-13, F6-5 |
| `GuardianApp.tsx` | Kabul sonrası karşılama yok; jeton 60 gün; 13 sp altı metin; yardım yok | Karşılama + sahide mail; "Geri" jetonu silmez; hazır 3 mesaj; sahidin kendi hatları; 1.2.0 token restyle; 1.3.1 kemer pencere (yalnız gün sayısı + lale), damla | F2-5, F4-5, F8-4 |
| `VowRecorder.tsx` | Izin otomatik istenir; kırmızı kayıt | "Kaydi hazirla" / "Simdi degil" eşit; kırmızı yok | F6-7 |

---

## 7. Metin planı

### 7.1 Kurallar

- **Üç katman:** ekranda başlık + en çok 1 giriş cümlesi (≤12 kelime) + seçenek + tek eylem; "Neden böyle?" altında (varsayılan kapalı) bilim gövdesi (≤30 kelime) + gerçek atıf + mekanik; uzun hukuki metin yalnız onay/ayarlar yüzeyinde. Atıfsız "Kaynak" satırı boş dize (gösterilmez); kaynaksız "yazılı söz daha bağlayıcıdır" iddiası kaldırıldı; gövdelerde change talk, precommitment, near-miss, chasing, DSM-5 yok.
- **EN çeviri değil kısa yeniden yazım:** dize başına EN karakter ≤ TR x1,15 (ölçülen oran 1,08). Türkçe ek yalnız `tr.ts` içinde. `n===1` ayrımı bozulmaz.
- **Bahçe sözlüğü:** varsayılan sözcük "gün". "Yaprak" yalnız Ana ekran, Gün tamam ve tekrar oynamada; "lale" yalnız paket günü 7'nin katı olduğunda ve **paket gününe** (K23 takvim günü) bağlı; 30/60/90 = Filiz/Fidan/Ağaç her zaman gün sayısıyla. Bitki yokken "nötr ikiz" metinler kullanılır (1.1.x'te "yaprak" geçmez). `dayMessage.ts` temiz seri kilometre taşlarını (`MILESTONES`, L4) paket günü ve lale ile hizalar (F4-7).
- **Yasak sözcükler** (betik hata verir; TR→yerine): puan/taahhüt puanı (yok); ödül/tamamlama ödülü (yok); **indirim hakkı / %40 indirim (yok)**; kazandın ("tamam"); BOZULDU (yok); ceza ("sonuç"); hücre ("gün"); mücadele paketi ("Filiz · N gün"); uzman/terapist raporu ("paylaşılabilir özet"); "paket yenilenmez", "tamamlama ödülü kazanılmaz"; "Alışkanlığın kökünü kurut", "En kalıcı yol"; "dürtü kırıldı"; "dürüstlük sonucu hafifletir"; **konfeti, parıltı, madalya, jackpot (hem uygulama hem mağaza)**. İstisna: `calm.intro` "Puan yok, ödül yok, seri yok." EN: points, reward, you won, broken, penalty, cell, challenge pack, specialist report, discount, confetti, sparkle, medal.
- **Kanonik dizeler (bir fikir = bir yer):** `packs.oneTime` "Tek seferlik. Abonelik değil, yenilenmez." (fiyatın yanında, fiyat alınamazsa da); `plan.free` (yalnız Paketim); `legal.notTreatment({help})` (hatlar `useHelp()` ile bölgeye göre); `legal.noGuarantee`; **gizlilik tek kalıp (ölçülebilir): "Yalnızca telefonunda saklanır, sunucuya gönderilmez."** (EN: "Stays on your phone; never sent to our server."). "Yedeklenmez" iddiası ancak F1-19 doğrulandıktan sonra eklenebilir.
- **Dokunulmaz / zorunlu alt dize testli:** `help.*` ve `helplines.ts` (ALO 182, Yeşilay 115, 112; US/GB listeleri); **`setup.consent` (tr.ts:107) KVKK ve imza videosu/silme hakkı cümleleri aynen kalır; bugün aynı dize şahitlere bildirim onayını da içerir, F2-4'te şahit bildirimi ayrı `setup.guardianNotice` dizesine çıkarılır (metin değişmez, onay ikiye bölünür; hukuk onayı S23, bölünmüş iki metin hukuka sunulur)**; `setup.payAtSign` aynen; `packs.oneTime` ⊇ "Abonelik" ve "yenilenmez"; `plan.rDisclaimer` ("tıbbi değerlendirme değildir"); `habits.gambling.disclaimer` ("tedavi değildir"); silme/KVKK hakkı (`exit.deleteLink`, `profile.delete*`); `guardian.bulletFree` "Ücret ödemezsin. Reddedebilirsin."; `relapse.actNotify`; `crisis.waveKicker` "GENEL ÖRNEK"; `verify.urgeSmall` şeffaflığı; `crisis.sumOk` dürüstlük cümlesi.
- **Dev/iç metin kullanıcıya gösterilmez:** `setup.netHelp` API adresi yalnız `__DEV__`; `Plan.tsx:95` ham hata ve `purchase.ts` Türkçe sabitleri `pay.*` anahtarlarına.

### 7.2 Anahtar göçü (ekle → geçir → sil)

1. **Ekle (F1-1):** yeni anahtarlar nihai metinle `tr.ts` ve `en.ts`'ye aynı commit'te (`Dict` tipi eksik anahtarı `tsc` hatası yapar): `more.why/how/close/source`, `legal.notTreatment/noGuarantee`, `packs.tier/includes`, `home.more`, `nav.me/guardians/journal/calm`, `done.leaf`, `done.tulip(n)`, `relapse.daysRealNone`, `plan.tKeptClean(total, clean)`, `habits.gambling.guardiansHow`, `pay.priceFail/unavailable/androidOnly/storeFail/cancelled/paidNotConfirmed/paidNotUsable`, `crisis.retract/retractDone`. İmzalar: `plan.buy(d, price?)`, `completed.note(help)`, `packs.name(d)` aynı. `setup.guardianNotice` F2-4'te eklenir. 4 ölü anahtar hemen silinir: `net.videoUnreachable`, `verify.record`, `verify.pointsLine`, `plan.billingPending` (yalnızca sözlüklerde geçiyor, doğrulandı).
2. **Tüketicileri geçir** (F1-F6 ekran görevleri).
3. **Sil (F10-1):** `home.cellsLeft`, `home.points`, `home.saved`, `home.exitLinkSolo`, `verify.cleanTitle`, `verify.cleanSmall`, `done.points`, `done.money`, `relapse.actPoints`, `relapse.broken`, `plan.discount`, `completed.discount`, `packs.short`, `setup.demoShort`, `science`, `setup.guardiansSrc`. Her silme `tsc` ile kanıtlanır.
4. **Kimlikler değişmez:** `habits.gambling.types/when/moods/triggers` (sunucuya `habitLabel` olarak gider, şahit e-postalarında görünür), `done.helpers` kimlikleri, kayıt türleri (tetik/kriz/nuks/iyi), kayıt anahtarı `lockin.v4`; veri göçü gerekmez.

### 7.3 Örnek metinler (hedef)

| Yüzey | TR | EN |
|---|---|---|
| Ana ekran | "gün 14 /30"; "Bugün bir yaprak daha."; "Günün kontrolü"; dock: Sakinleş, Şahitler, Günlük; sabit alt: Krizdeyim; çip: Ben; deneme: "Deneme 2 gün sonra bitiyor." | "One more leaf today."; "Daily check"; Calm, Witnesses, Journal; I'm in crisis; Me; "Trial ends in 2 days." |
| Gün tamam | "14. gün. İkinci lale açtı."; yüksek dürtü: "Zor günü atlattın." | "The second tulip opened."; "You got through a hard day." |
| Kriz | "Rüzgâr geçer."; "Nefes al"; "Şahitlerine haber gitti."; "Yanlışlıkla bastım"; süre dolunca "Hâlâ zorsa aramalar açık." | "the wind passes."; "Your witnesses were told."; "I pressed by mistake"; "If it's still hard, the calls are open." |
| Tekrar oynadım | "Bir duraklama."; "Yaprak silinmez; kenarı kıvrılır."; "N temiz gün gerçekti, silinmiyor." | "N clean days were real and stay." |
| Paywall | "Filiz · 30 gün · 349 ₺"; CTA "Filiz paketi al · 349 ₺"; "Tek seferlik. Abonelik değil, yenilenmez." | "One-time. Not a subscription; it never renews." |
| Ödeme sonrası sorun | "Ödemen alındı, hakkın saklandı. Bu paket şu an uzatılamıyor; destekten yaz ya da Play'den iade al." | "Payment received and your pack is saved. It can't be applied right now; write to support or refund in Play." |
| Kontrol | "Dürüst cevap yeter."; "Dürtü ne kadardı?" | "An honest answer is enough." |
| Kurulum neden | "Neden bırakıyorsun? Kendi sözlerinle yaz. Yalnızca telefonunda saklanır, sunucuya gönderilmez." | "Write it in your own words. It stays on your phone and is never sent to our server." |
| İmza | "Basılı tut." | "Press and hold." |
| Şahit daveti | "Murat, yanında olmanı istiyor. 30 günlük bir söz verdi."; "Çıkış isteğinde bir anahtar sende." | "In an exit request you hold one key." |
| Sakinleş | "Puan yok. Ödül yok." | "No points. No rewards." |

(Paket fiyatları 349/549/749 ₺, `store/ODEME-REHBERI.md`; Play'de değişirse ekran ve mağaza birlikte güncellenir.)

### 7.4 Kapı

`apps/mobile/scripts/copy-check.mjs` (F0-3): ekran bileşimleri `copy-budget.json`'da; tek dize ≤25 kelime (Science gövdesi ≤30; güvenli liste: consent, script, packs şablonları); yasak sözcük; zorunlu alt dizeler; EN oran uyarısı; ölü anahtar taraması; kanonik dize çoğaltma uyarısı; her fonksiyon anahtarını örnek argümanla çağırıp "undefined" arar. Taslak, eski sözlükte kurulumu 916 TR / 1166 EN hesapladı (ölçüm 920/1165).

---

## 8. Varlıklar, mağaza, site, mail

### 8.1 Uygulama varlıkları

- **İkon:** kemer (şahit portalı penceresiyle aynı biçim) + toprak + iki yapraklı filiz + tek hardal tomurcuk; çizgi 1024 uzayında ≈56-64 px (48 px'te ≥3 px). Adaptif ön plan güvenli daire çapı ≈626 px içinde; `android-icon-background.png` kalkar, `app.json` `adaptiveIcon.backgroundColor: '#F4ECDB'`; monokrom katman ayrı siluet; `icon.png` 1024 RGB opak; `favicon.png` 48. 48/96/144 px ve gri tonlamada denenir; kilit çağrışımı sürerse yedek yalnız saksıda filiz.
- **Splash:** `backgroundColor #F4ECDB`, `dark: { backgroundColor '#1B2820', image splash-icon-dark.png }`, saydam PNG; `app.json` kök `backgroundColor` `#F4ECDB`; boş zemin/spinner kalkar. Pencere arka planı tek renk (expo-system-ui eklenmez): gece klavye açılışı parlaması cihazda doğrulanır. `android/` klasörü gitignore'da ve eski; EAS `app.json`'dan prebuild eder. Splash/ikon/`allowBackup` değişiklikleri OTA ile gitmez, derleme şart.
- **Yazı tipi dosyaları:** `apps/mobile/assets/fonts/Fraunces-SoftSemiBold.ttf`, `Fraunces-SoftMedium.ttf`, `Fraunces-SoftMediumItalic.ttf`, `OFL-Fraunces.txt`; `apps/mobile/src/fonts.ts` (`fontMap`); üretim `tools/fonts/build-fraunces.py` (fonttools instancer: SOFT=100, WONK=0; pyftsubset Latin + Latin-Ext + ₺ + noktalama; öznitelikler kern, liga, lnum, tnum, pnum, case). Türkçe doğrulama: cmap'te U+011E/011F/0130/0131/015E/015F/00C7/00E7/00D6/00F6/00DC/00FC/20BA.
- **Sprite seti:** 5.1'deki katalog; sprite yoksa `GardenArt` View yedeğiyle çizer (saksı, yaprak), böylece ekranlar sprite teslimini beklemez.

### 8.2 Mağaza (Play)

- **Değişmez:** ad "QuitVow: Bahis ve Kumarı Bırak" ve kısa açıklama (17 Ekim ASO girişi).
- **Tam açıklama (TR/EN):** "hücre" → bitki dili; "kendin bildirirsen puan kaybın yarıya iner" kalkar; KRİZ ANINDA kesit/nefesle uyumlu; PAKETLER (Filiz 30, Fidan 60, Ağaç 90, "Tek seferlik; abonelik değil; otomatik yenilenmez") yalnız faturalandırma canlıyken ve uygulama onaylandıktan sonra; ÖNEMLİ bölümü sağlık politikası ibaresiyle ("teşhis, tedavi, iyileştirme veya önleme yapmaz", "bir sağlık uzmanına danış"). Veri güvenliği tablosuna "Finansal bilgiler → satın alma geçmişi" (1.1.1 ile).
- **Görseller:** 8 kare (1080x1920, alfasız PNG), `store/play/telefon/01-ana-ekran.png … 08-sakinles.png`, EN seti `telefon-en/`, öne çıkan görsel 1024x500 (TR/EN), ikon 512. Gerçek uygulamadan (emülatör + demo durumu); poster düzeni Magaza.dc.html. Sıra: 01 "Bahsi bırak. Her gün bir yaprak." ("bahis" ilk karede, "Rastgele ödül yok." rozeti), 02 kriz ("Dürtü rüzgâr gibi geçer."), 03 deneme + paket ("Önce 7 gün dene.", "Tek seferlik. Abonelik değil."), 04 şahit portalı, 05 imza, 06 günlük kontrol, 07 gün tamam (tek gece karesi), 08 Sakinleş ("Puan yok. Ödül yok."). n. karede alt bitki şeridinde n. yaprak hardal. 8 kareden 7'si açık zemin; kare başına ≤15 kelime. **Kumar çağrışımı kuralları:** geniş altın/hardal dolgu yok, geniş koyu yeşil zemin yok, konfeti/parıltı/madalya yok (uygulamada da yok, 4.1), kırmızı yok, "kazan" fiili ve puan sayısı yok, "LockIn" yok. Çekim hattı görünür metni tarar ve yasaklı dizgede durur. Mevcut set kusurları: 03 ve site `guardians.webp`'de "LockIn", 01'de açılmış 90 günlük paket.
- **Eşlenme:** Play Console ürün başlıkları (`pack_30/60/90`) Filiz/Fidan/Ağaç ile aynı gün; "Yönetilen yayın" ile onaylı giriş ve onaylı sürüm aynı anda yayına alınır; giriş değişikliği ve uygulama sürümü aynı haftaya denk getirilmez (tek değişken).
- **Yedekleme/veri:** `allowBackup:false` (K25) ile Veri güvenliği formundaki "veriler cihazda" beyanı tutarlı hâle gelir; form F1-19'dan sonra gözden geçirilir. `engel` birleşirse (F10-2) Play Console'da `VpnService` izin beyanı ayrıca gerekir.

### 8.3 Site

`site/src/style.css` token'ları Bahçe paletine (blog ve yasal sayfalar bedavaya geçer); `--mute` kalkar (4,21:1); kil metin yalnız kâğıt/kart üstünde; `.grid90` ızgarası ve hücre üreten script satır içi bitki SVG'sine döner (build'de `site/src/img/garden/hero-plant.svg` basılır); hareketi azalt koruması `html scroll-behavior:smooth`'u da kapsar; Google Fonts bağlantısı `build.mjs`'te tek sabit; Fraunces (SOFT) + Nunito + Caveat; `og:image` mutlak 1200x630. `build.mjs`'teki `LOGO` düzenli ifadesi `<svg viewBox="0 0 512 512">`'e bağlı: logo değişirken bu kural korunur. Görsel sözleşmesi dil başına 5 webp (home, crisis, guardians, calm, packs; 540x1080, her biri ≤90 KB); `sudoku` yuvası `calm` olur. Site, uygulamada olmayan ekranı göstermemek için uygulamadan önce yayınlanmaz. Netlify build'i bağımlılıksız kalır. **Metin taraması kapsamı (F9-4):** `site/src/i18n/*.mjs`, `site/src/blog/*.mjs` (`kumari-birakmak-istiyorum` "Her gün bir hücre", "balon patlatma" vb.), `site/src/legal/tr.mjs`, `en.mjs`, `company.mjs`.

### 8.4 Mail

Metin sürümü aynen kalır; **yalnız vaat-davranış çelişkisi olan satırlar istisnadır (F2-7):** `packCompleted` indirim cümlesi (`apps/api/src/mail.ts:103-105` TR, `162-164` EN; `discountPct` parametresi kalır, 0 gelir) ve `pactActive` "Her gün bir hücre." (`mail.ts:79`; 1.1.3'te nötr "Her gün bir kontrol.", F9-4'te bitki diline). `apps/api/src/mailHtml.ts`: kâğıt `#F4ECDB` / kart `#FBF6EA`; metin `#24352A`; ikincil `#4B5B4B` (13 px alt bilgi); birincil düğme tablo tabanlı `#3B6748` (≥52 px); başlık Georgia, gövde Arial (web yazı tipi yok); şahide giden kind'lar su tonlu (`#CFE0E6` bant, `#3F7089` düğme), sahibe giden kind'lar kâğıt tonlu; kod kutusu `#CBD9BE` zemin, kesik çerçeve, tek satır; preheader; `<meta name="color-scheme" content="light only">`. Dil: `Mail.locale` + `T()` sarmalayıcısı sayesinde 9 çağrı yeri değişmez; `lang` ve tek dilli alt bilgi. Kırmızı yok; kriz/çıkış maillerinde ALO 182 / 112 kil kalın metin. Davet maili adım metni geçiş sürümünde sürüm-nötr: "Davet aldım'a (eski sürümde sağ üstteki SAHİT butonuna) dokun." **Yeni şablon:** `crisisRetracted` ("yanlış alarmdı", TR/EN, F1-20).

### 8.5 Depo yerleşimi (yeni)

`art/garden/src/`, `tools/garden/`, `tools/fonts/`, `tools/store-capture/`, `scripts/yayin-kontrol.mjs`, `scripts/olcum/`, `docs/YAYIN-OLCUM.md`, `docs/TEST-PROTOKOLU.md`, `docs/KRIZ-REGRESYON.md`, `docs/ODEME-REGRESYON.md`, `docs/GECIS-ENVANTERI.md`, `docs/GERI-DONUS.md`; mobilde `src/motion/`, `src/crisis/`, `src/garden/`, `src/haptics.ts`, `src/palette.ts`, `src/fonts.ts`, `src/packDay.ts`, `src/payFlow.ts`, `src/bootGuard.ts`, `src/screenSelect.ts`, `src/setupDraft.ts`, `src/report.ts`, `scripts/check-theme.mjs`, `scripts/copy-check.mjs`.

---

## 9. FAZLAR

Her fazın sonunda ana dal yeşildir (`node scripts/yayin-kontrol.mjs` 0). "Gönderilebilirlik" her fazın tek başına kullanıcıya nasıl çıkabileceğini söyler. **Yürütme sırası kimlik sırasından farklıdır:** F0 → F1 (önce kritik dilim, sonra ertelenebilir dilim) → **F3 (yılbaşı dondurmasında, iç faz)** → F2 → F4 → F5 → F6 → F7 → F8 → F9 → F10. F3, F2'ye bağlı değildir (yalnız F0, F1-2, F1-3); bu sıra 23 Aralık - 3 Ocak penceresini boşa harcamaz.

| Yürütme | Faz | Sürüm | Gün | Kümülatif | Bitiş (çekirdek) | Bitiş (x1,3) |
|---|---|---|---|---|---|---|
| 1 | F0 Temel, ölçüm ve kapılar | (iç) | 10,75 | 10,75 | 11 Kasım | 16 Kasım |
| 2 | F1 Sakin zemin: kritik dilim 18,65 + ertelenebilir dilim 8,5 | 1.1.2 (kritik); ertelenebilir dilim 1.1.3 ile | 27,15 | 37,9 | 18 Aralık (kritik dilim ≈7 Aralık, yayın ≈7-10 Aralık) | 5 Ocak (kritik dilim ≈18 Aralık) |
| 3 | F3 Bahçe zemini | (iç, bayrak kapalı) | 11,0 | 48,9 | 5 Ocak | 26 Ocak |
| 4 | F2 Net başlangıç | 1.1.3 | 15,5 | 64,4 | 26 Ocak (yayın ≈29 Ocak) | 23 Şubat |
| 5 | F4 Kâğıt ve çay | 1.2.0 | 27,5 | 91,9 | 5 Mart (üretim bayram sonrası ≈15-19 Mart) | 19 Nisan |
| 6 | F5 Kurulum ve paket görünümü | 1.2.1 | 8,5 | 100,4 | 23 Mart | 5 Mayıs |
| 7 | F6 Günlük, destek ve Sakinleş | 1.2.2 | 10,0 | 110,4 | 6 Nisan | 25 Mayıs |
| 8 | F7 Büyüyen bitki | 1.3.0 | 15,75 | 126,15 | 29 Nisan (yayın ≈5-7 Mayıs) | 22 Haziran |
| 9 | F8 Dallı bitki, şahit penceresi, imza | 1.3.1 | 7,5 | 133,65 | 10 Mayıs | 6 Temmuz |
| 10 | F9 Vitrin: mağaza, site | (mağaza/site) | 11,75 | 145,4 | 27 Mayıs (Kurban Bayramı düşülürse ≈31 Mayıs) | 29 Temmuz |
| 11 | F10 Temizlik | 1.3.2 | 1,25 | 146,65 | 28 Mayıs | 30 Temmuz |

Tarihler tahmindir; haftada 5 iş günü ve aşağıdaki tatiller düşülerek hesaplandı. "x1,3" sütunu risk payını (1.4) içerir; kritik dilim bu sütunda bile 18 Aralık'ı aşmaz.

**Tatiller (takvime işlendi):** 28 Ekim 2026 öğleden sonra ve 29 Ekim Perşembe (Cumhuriyet Bayramı; ilk hafta 3,5 iş günü), 1 Ocak 2027 Cuma, ≈8 Mart öğleden sonra ve ≈9-11 Mart 2027 Ramazan Bayramı (tahmin; olası 12 Mart köprüsü hesaba katılmadı), 23 Nisan 2027 Cuma, 19 Mayıs 2027 Çarşamba, ≈16-19 Mayıs 2027 Kurban Bayramı (tahmin; yalnız F9 satırında düşüldü), 15 Temmuz 2027 Perşembe.

**Yayın takvimi (iş günü sayılmaz; çalışma bu sırada sonraki faza devam eder; tarihler tahmin):**

| Sürüm | Bekleme satırı |
|---|---|
| 1.1.1 | Play incelemesi: F0 ile paralel; onay gelince `odeme`→`main` ve `v1.1.1` etiketi (tarih Play'e bağlı). |
| 1.1.2 (F1 kritik dilimi) | Dahili test ≥48 sa ≈3-5 Aralık → %20 ≈7 Aralık → %100 ≈10 Aralık. Yılbaşı dondurmasına ≈2 hafta pay. |
| 1.1.3 (F1 ertelenebilir + F2) | Dahili ≥48 sa ≈22-26 Ocak → %20 ≈26 Ocak → %100 ≈29 Ocak. |
| 1.2.0 | Kapalı test (5-8 gönüllü, ≥5 takvim günü) ≈22 Şubat - 5 Mart; klinik okuma ≈1-5 Mart; **bayram haftasında üretim açılışı yok**; %10 ≈15 Mart (2 gün) → %50 ≈17 Mart (2 gün) → %100 ≈19 Mart. 1.2.1, 1.2.0 %100'den ≥3 gün sonra. |
| 1.2.1, 1.2.2 | Her biri %20 → %100, 3 takvim günü (≈24-27 Mart, ≈7-10 Nisan). |
| 1.3.0 | Kapalı test + klinik onay F7 içinde (≈14-27 Nisan; 23 Nisan tatil); %10 ≈29 Nisan (2 gün) → %50 ≈3 Mayıs (2 gün) → %100 ≈5-6 Mayıs. |
| 1.3.1 | %20 → %100 ≈11-14 Mayıs. F9 mağaza işi 1.3.0 %100 + 3-5 gün sonrası başlar. |
| 1.3.2 | 1.3.0 üretimde ≥2 hafta sorunsuz sonrası ≈1 Haziran. |

Değişiklik dondurma penceresi (öneri): 23 Aralık - 3 Ocak. 1.1.2 pencereden önce %100 olur; pencere boyunca yalnız F3 (iç) yürür. Kritik dilim 11 Aralık'ta bitmemişse ertelenebilir dilimin kalanı 1.1.3'e kayar, kritik dilimin kendisi kesilmez.

### F0. Temel, ölçüm ve kapılar (10,75 gün)

**Amaç:** Hiçbir görünür değişiklik yapmadan taban çizgisi, kapı betikleri, test koşucusu, dal hijyeni ve açık kararlar. **Gönderilebilirlik:** sürüm yok; yalnız v1.1.1 etiketi (ödeme onayı sonrası). **Bağımlılık:** yok (1.1.1 Play onayını beklerken başlar). A sınıfı gerçek cihaz gerekir (S18).

| ID | Görev | Başlıca dosyalar | Gün | Kaynak |
|---|---|---|---|---|
| F0-1 | `.gitattributes` (`* text=auto eol=lf`, bat crlf), tek "renormalize" commit'i, `engel` dalına `-X renormalize` (yalnız deneme kopyasında); Netlify/Railway üretim dalını panelden doğrula ve belgele; 1.1.1 onayı sonrası `odeme`→`main` ff-only + `v1.1.1` | `.gitattributes` (yeni), `netlify.toml`, `apps/api/railway.json` | 0,75 | YAY-1 |
| F0-2 | Ölçüm tabanı: `eas.json` `perf` profili (`EXPO_PUBLIC_PERF=1`), `perf.ts` (rAF farkları, kriz dokunuş→süre `markTap/markShown`, **render sayacı ve `AsyncStorage.setItem` yazım sayacı**), adb betiği (gfxinfo, meminfo, top -H), S1-S5 senaryoları, baz çizgi tablosu (boyut, soğuk açılış, janky %, PSS, kriz ms medyan/p90 ≥20 tekrar, Home/Crisis/Setup render sayısı ve 60 sn'de disk yazımı, Play ve sunucu sayıları, 26 ekran görüntüsü) | `eas.json`, `apps/mobile/src/motion/perf.ts` (yeni), `scripts/olcum/` (yeni), `docs/YAYIN-OLCUM.md` (yeni) | 2,25 | YAY-3, HAR-1, KRI-1, REV-5 |
| F0-3 | Kapı betikleri: `yayin-kontrol.mjs` (api test+typecheck, mobil typecheck, expo-doctor, tr/en eşliği, "LockIn" taraması, Play erişim etiketleri, bağımlılık izin listesi, helplines, disclaimer, kontrast); `copy-check.mjs`; `vitest` devDependency + `test`/`typecheck` betikleri; `allowImportingTsExtensions` | `scripts/yayin-kontrol.mjs`, `apps/mobile/scripts/copy-check.mjs`, `copy-budget.json`, `apps/mobile/package.json`, `tsconfig.json` | 2,25 | YAY-4, MET-1 |
| F0-4 | `purchase.ts` karakterizasyon testleri (12+ test; `purchase.ts` değişmez) + **çağrı noktaları için elle kontrol listesi** (`Setup.tsx:111-115` `app.set`→`withPack`→`setHold(0)`, `Plan.tsx:35,39-42` `recoverPurchases`/`upgrade`/`setPick(0)`) | `apps/mobile/src/purchase.test.ts` (yeni), `vitest.config.ts` (yeni), `docs/ODEME-REGRESYON.md` (yeni) | 1,0 | AKI-2, REV-3 |
| F0-5 | `App.tsx:30-45` ekran seçimini saf `screenSelect.ts`'e çıkar (`nav.ts` yalnız tür içeriyor); sıra: şahit → kurulum → kriz → moment → **meşgul ekran korunur** → paywall/tamamlandı (`salesQuietUntil` dışında) → ekran; kriz önceliği ve meşgul-ekran testleri; `KRIZ-REGRESYON.md` (**14 madde**) | `apps/mobile/src/screenSelect.ts` (yeni), `screenSelect.test.ts`, `App.tsx`, `docs/KRIZ-REGRESYON.md` | 1,75 | YAY-10, REV-8 |
| F0-6 | Test protokolü: cihaz matrisi, hareketi azalt (`adb settings put global transition_animation_scale 0`), yazı ölçeği 1,3 ve 2,0, TalkBack, Türkçe karakterler | `docs/TEST-PROTOKOLU.md` | 1,0 | YAY-9 |
| F0-7 | `/admin/stats` genişletmesi (7 gün yeni kullanıcı, ≥2 şahitli pakt oranı, deneme→paket, ilk 7 günde ≥3 kontrol; kişisel veri yok) ve haftalık okuma şablonu | `apps/api/src/routes.ts`, `apps/api/tests/api.test.ts`, `apps/web/src/Admin.tsx` | 1,0 | YAY-16 |
| F0-8 | **`engel` dalı kararı (S25) ve çakışma bütçesi:** `git diff --stat odeme..engel -- apps/mobile` çıktısı (31 dosya, +1615/−427) `GECIS-ENVANTERI.md`'ye; varsayılan: modül donuk, F10-2'de birleşir; sürekli maliyet (her büyük fazdan sonra `Profile/Home/Setup/Plan/server/nav` çakışma denemesi) ve Play VPN beyanı yayın planına yazılır; kullanıcı "şimdi birleştir" derse 3-5 gün (F0'a eklenir, Home durumları ve `Scr` birliği `screenSelect.ts`'te yer alır) | `docs/GECIS-ENVANTERI.md` | 0,5 | REV-9 |
| F0-9 | **Klinik danışman ve onay takvimi:** danışmanın adı, görüşme tarihi, onaylanacak kalemler (nefes sabiti, kriz metni, kriz teması, kriz sallanması, satış sessizliği süreleri) yazılır; onay yoksa muhafazakâr varsayılanlar (4 al/6 ver `hold=0`, `CRISIS_THEME='dark'`, kesitte statik bitki) | `docs/YAYIN-OLCUM.md` | 0,25 | REV-12 |

**Kabul ölçütleri**
- `git ls-files --eol` çıktısında karışık satır sonu yok; Netlify/Railway üretim dalı belgelenmiş; `main`, `odeme` ile aynı noktada ve `v1.1.1` etiketli (ödeme onayı sonrası).
- `docs/YAYIN-OLCUM.md` baz çizgi tablosu dolu (A sınıfı cihaz modeli, RAM, Android sürümü yazılı, ya da "yok: AVD + Play ön-başlatma, eşikler uyarı kapısı" yazılı); kriz dokunuş→süre en az 20 tekrar; **60 sn'de render ve disk yazımı sayıları kayıtlı**; 26 "önce" ekran görüntüsü arşivde.
- `node scripts/yayin-kontrol.mjs` temiz depoda 0, bilerek bozulan etiket/kontrast/yasak sözcükte 1 çıkış verir; `copy-check` eski sözlükte kurulumu TR 920±8 / EN 1165±10 hesaplar ve 4 ölü anahtarı listeler.
- `apps/mobile`'da `npm test` yeşil (≥12 satın alma testi); `git diff apps/mobile/src/purchase.ts` boş; kriz önceliği testi (`crisisUntil > now` iken paywall/tamamlandı olsa da "crisis") ve meşgul-ekran testi (kurulum/kontrol sırasında completed gelse ekran değişmez) yeşil; `docs/ODEME-REGRESYON.md` çağrı noktası listesi yazılı.
- `/admin/stats` yeni alanları döndürür, yanıtta e-posta/ad/not/video yok; `apps/api` testleri yeşil.
- `engel` kararı ve maliyet kaydı yazılı (varsayılan: donuk); klinik danışman adı ve görüşme tarihi yazılı ya da "yok → muhafazakâr varsayılanlar" kaydı var.

### F1. 1.1.2 "Sakin zemin" (27,15 gün: kritik dilim 18,65 + ertelenebilir dilim 8,5)

**Amaç:** Görünüm aynı; güvenlik, ödeme güvencesi, açılış güvenliği, gizlilik, gün tanımı, yeniden çizim disiplini, erişilebilirlik, dil temizliği. **Gönderilebilirlik:** Mevcut koyu temada tek başına Play'e çıkar (%20 → %100, 3 gün). **Bağımlılık:** F0. **Sıra:** önce **K (kritik)** dilim → 1.1.2 yayını → sonra **E (ertelenebilir)** dilim; E dilimi ana dalda birikir ve 1.1.3 ile çıkar (kritik dilim 11 Aralık'ta bitmemişse E dilimi böyle de kaydığı için yayın tarihini etkilemez). E dilimi kesme sırası: F1-10 → F1-4 → F1-5 → F1-13 parçaları.

| ID | Görev | Başlıca dosyalar | Gün | Kaynak | Dilim |
|---|---|---|---|---|---|
| F1-1 | Anahtar altyapısı (7.2'deki ekleme adımı, `pay.*` ve `crisis.retract*` dahil) + 4 ölü anahtarın silinmesi | `i18n/tr.ts`, `en.ts`, `index.ts` | 0,5 | MET-2 | K |
| F1-2 | Hareketi azalt çekirdeği, açılış kapısı (`motionReady`), `store.motion` ve Profil "Hareket" satırı | `src/motion/reduce.ts`, `env.ts` (yeni), `components/motion.tsx`, `store.tsx`, `App.tsx`, `Profile.tsx` | 1,0 | HAR-3 | K |
| F1-3 | Hareket çekirdeği: `tokens`, `curves` (+test), `loop` (`useLoop`), `primitives` (Rise, Settle, usePress, Pivot); `usePulse` gerçek native döngüye; eski adlar barrel'dan çıkmaya devam eder | `src/motion/*`, `components/motion.tsx` | 1,5 | HAR-4 | E |
| F1-4 | Haptik modülü, Profil "Titreşim", Opt tick ve DayDone settle bağlama | `src/haptics.ts`, `hapticsPolicy.ts` (+test), `store.tsx`, `Profile.tsx`, `ui.tsx`, `DayDone.tsx` | 1,0 | HAR-5 | E |
| F1-5 | JS sürücü temizliği (`Wipe`, `FadeSwap`: StepProgress, Science çubuğu, Opt, DayDone dolumu) + Archivo alt yol importları + **`useCountUp` Home'dan kalkar** (`Home.tsx:24` sayı hemen doğru değerle gelir; `motion.tsx` `useCountUp` silinir) | `ui.tsx`, `DayDone.tsx`, `Home.tsx`, `primitives.tsx`, `components/motion.tsx`, `App.tsx` | 1,5 | HAR-6 | E |
| F1-6 | Ortak bileşen erişilebilirliği (klasik görünüm): ActionBar/Opt/HoldBar rol-durum-etiket, süs glifleri gizli, hedefler ≥48 dp, `height`→`minHeight`, klasik paletin `mute` değeri AA, kriz metinleri ≥14 px, `maxFontSizeMultiplier`; **Home Krizdeyim `ActionBar`'ı (kind red, height 84, size 30) boyut ve konum olarak değişmez** | `ui.tsx`, `theme.ts`, `Crisis.tsx` | 1,0 | yargıç ortak maddeler, YAY-8 | K |
| F1-7 | Kriz modeli (saf TS) ve testler: `breathPhase` ilk komut "in", `swayEnvelope`, `ENVELOPE_STOPS`, `rootWindow`, `notifyCopyKey`, `CRISIS_TOTAL_S`; `CRISIS_MS` (`store.tsx:63`) tek kaynak | `src/crisis/model.ts`, `model.test.ts` (yeni), `store.tsx` | 0,5 | KRI-2 | K |
| F1-8 | Kriz ekranı yapısı: kaydırmasız sahne + `CrisisDock` (şahit 72 dp, durum satırı, Sakinleş/Atlattım 64 dp, `HelpRow` 64 dp) + `CrisisNote` + +10 puan kalkar (`Crisis.tsx:130`) + Atlattım nedeni + `StepTransition` `ms` prop'u (kriz 160 ms); kısa kriz metinleri | `Crisis.tsx`, `src/crisis/CrisisDock.tsx`, `CrisisNote.tsx`, `HelpRow.tsx`, `style.ts`, `ui.tsx` (`Screen`), `motion.tsx`, `tr.ts`, `en.ts` | 1,75 | KRI-3 (+KRI-7 hız) | K |
| F1-9 | `useBack` (Calm→kriz, oyun→menü, CrisisNote, Relapse sonuç→form, Exit→home) | `src/components/useBack.ts` (yeni), `Calm.tsx`, `Relapse.tsx`, `Exit.tsx`, `Crisis.tsx` | 0,4 | KRI-4 | K |
| F1-10 | `CrisisStrip` + oyun düzeltmeleri: sayaç/parçacık yok, kozu simgeleri çıkar, reduce-motion, Sudoku hedefleri ve üretim soluğu, Geri say, XOX nötr dil | `Calm.tsx`, `games/*`, `sudokuLogic.ts` | 1,5 | KRI-5, HAR-8 | E |
| F1-11 | Kurulum taslağı (`quitvow.setupDraft.v1`), `STEP` sabitleri, Setup + Root geri tuşu. **Taslak: 48 saat TTL; `createPact`/`logout`/`reset`/hesap silme olaylarında VE her açılışta (lockin.v4'te pakt varsa ya da TTL dolduysa) silinir; neden/mektup alanları ancak F1-19'da `allowBackup:false` doğrulandıysa taslağa yazılır, doğrulanamazsa bu iki alan taslağa yazılmaz** | `Setup.tsx`, `src/setupDraft.ts` (yeni), `store.tsx`, `App.tsx` | 1,25 | AKI-1, REV-6 | K |
| F1-12 | HoldSign mekaniği: tek `Animated.Value` 2200 ms, geri dönüş kalan x 900 ms, tek tetik, `reset()`, "Basılı tutamıyorum" eşdeğeri + `accessibilityActions`, signStart/signDone; 40 ms `setInterval` kalkar | `src/components/HoldSign.tsx`, `src/motion/holdMath.ts` (+test), `Setup.tsx`, `ui.tsx` | 1,5 | HAR-12, AKI-8 (mekanik) | E |
| F1-13 | Dil temizliği (klasik ekranlar): Ana ekran Puan/Tahmini korunan, DayDone puan/para, Relapse puan/üstü çizili sayı/BOZULDU, Exit ceza/ödül/yenilenmez, "kazandın", indirim satırları (Setup, Plan, Completed), "kökünü kurut/en kalıcı yol", Verify `cleanTitle/cleanSmall` | `Home.tsx`, `DayDone.tsx`, `Relapse.tsx`, `Exit.tsx`, `Setup.tsx`, `Plan.tsx`, `Pending.tsx`, `tr.ts`, `en.ts` | 1,5 | MET-7/9 parçaları | E |
| F1-14 | Kontrol kaydı "Kaydet" anında (`Verify.tsx:22-23`: `srv.checkin` ve `a.set({checkIns, lastCheckIn, points, nextVerifyAt})`); rastgele `nextVerifyAt` kaldırılır | `Verify.tsx`, `DayDone.tsx` | 0,5 | AKI-16 (3-4) | K |
| F1-15 | Sürüm 1.1.2 (kritik dilim): AAB, **`allowBackup` manifest doğrulaması**, dahili test ≥48 saat, %20 → %100, ölçüm kıyası, klinik okuma (kriz metni), yayın notu TR/EN ("yeni telefona geçişte yerel neden/mektup/video taşınmaz; hesapla girişte pakt geri gelir") | `app.json`, `eas.json` | 2,0 | YAY-8 | K |
| F1-16 | **Store yeniden çizim ve yazma disiplini:** `store.tsx:84` `set` sığ eşitlikte aynı state'i döndürür; `server.tsx:56-65` `apply()` değişmeyen alanlarda `app.set` çağırmaz (30 sn `tick` hiçbir şey değiştirmiyorsa state aynı kalır); `store.tsx:83` kalıcı yazım 800 ms debounce + AppState background/inactive'te anında flush; Home/Crisis alt bileşenlere bölünür (`React.memo`, sabit referanslı props), gerekirse `useAppSelector`; yeni alanlar (moment, gardenSeen, closeAnimDay, themeV, motion, haptic, salesQuietUntil) bu yoldan yazılır; ölçüm F0-2 render/yazım sayacıyla | `store.tsx`, `server.tsx`, `Home.tsx`, `Crisis.tsx`, `src/motion/perf.ts` | 2,0 | REV-5 | K |
| F1-17 | **Açılış güvenlik ağı:** `App.tsx:71` `[loaded, fontError]`, kapıya 3 sn zaman aşımı, font hatasında sistem fontu (`F` haritası fontFamily vermez); `bootGuard.ts` (sağlık işareti yaz/sil API'si, ardışık ölüm sayacı; Home bağlaması F4-6'da); `billing.ts:6-7` `/health` sonucu kalıcı `quitvow.uiFlags.v1` önbelleği, varsayılan `lite`, ağ hatasında son bilinen değer | `App.tsx`, `src/bootGuard.ts` (+test), `src/billing.ts` | 1,0 | REV-2 | K |
| F1-18 | **Tek gün tanımı:** `src/packDay.ts` (`calendarDay`, `packDayOf`, `streakDayOf`) + test vektörleri (5.2); 6 kopya (Home.tsx:24-28 + `dayKey` L15, Plan.tsx:22, Profile.tsx:42,77, DayDone.tsx:21-22, Relapse.tsx:20-21) tek yere; `Analysis.tsx` 7 gün grafiği `localDay` anahtarına; `Verify.tsx:22` 409 = "zaten kaydedildi", ağ hatası = yerel kayıt | `src/packDay.ts` (yeni), `packDay.test.ts`, `Home.tsx`, `Plan.tsx`, `Profile.tsx`, `DayDone.tsx`, `Relapse.tsx`, `Verify.tsx`, `components/Analysis.tsx` | 1,25 | REV-4 | K |
| F1-19 | **Gizlilik:** `app.json` android bloğuna `allowBackup: false` (alan adı Expo 57 docs'tan doğrulanır; yoksa config plugin ile `android:allowBackup="false"` + `dataExtractionRules`); AAB manifest dökümü ve cihazda yedek dışı doğrulama (`bmgr` ile paketin yedeklenmediği); kanonik gizlilik cümlesi (7.1) ve Play Veri güvenliği formu kontrolü; imza videosu (belge klasörü) dışlama kapsamında | `apps/mobile/app.json`, `tr.ts`, `en.ts`, `store/PLAY-CONSOLE-REHBERI.md` | 0,5 | REV-6 | K |
| F1-20 | **"Yanlışlıkla bastım" (S12), Home'daki Krizdeyim yeniden kaplanmadan önce:** sunucuda yeni geri çekme ucu (ad F1-20 başında `routes.ts` okunarak kesinleşir; mevcut `routes.ts:232` `/pacts/current/crisis` yanında): son `crisis` olayı ≤120 sn ise `crisis_retracted` olayı yazar, kabul etmiş şahitlere `crisisRetracted` düzeltme maili gider, `crisis` olayı silinmez (denetim izi) ama rapor sayısında (`routes.ts:212`) düşülür; istemci: `Crisis.tsx` ilk 120 sn'de ≥48 dp "Yanlışlıkla bastım" satırı, basınca `crisisUntil: 0` ve Home; 120 sn sonra satır görünmez; metin "Şahitlerine yanlış alarm olduğu bildirildi." | `apps/api/src/routes.ts`, `apps/api/src/mail.ts`, `apps/api/tests/api.test.ts`, `apps/api/tests/mail.test.ts`, `apps/mobile/src/server.tsx`, `Crisis.tsx`, `CrisisNote.tsx`, `tr.ts`, `en.ts` | 2,0 | REV-1 | K |
| F1-21 | **Ödeme güvencesi (F2-1'den buraya taşındı ve genişletildi):** (1) `PurchaseError(code)` (platform, unavailable, paidNotConfirmed, paidNotUsable, priceUnavailable); (2) `withPack` iç davranışı: ödeme alınıp `action()` başarısızsa **önce `recoverPurchases`, hak varsa `action()` bir kez yeniden**; Google "zaten sahipsin" dönerse hata yerine kurtarma yolu (ödeme penceresi yeniden açılmaz); dönüş sözleşmesi ve imza aynı; (3) çağrı noktası mantığı `src/payFlow.ts`'e (saf; durum yazımı enjekte edilir): `Setup.tsx:111` `app.set({... role: 'user', points: 100})` ödemeden önce yazılıyordu, artık `role`/profil alanları `createPact` başarısından sonra yazılır (sunucu çağrısının bu alanlara bağlı olmadığı F1-21 başında `server.tsx`/`routes.ts` okunarak doğrulanır, bağlıysa iptalde geri alınır), iptalde `setHold(0)` ve taslak korunur; `Plan.tsx:42` `setPick(0)` yalnız başarıda; `recoverPurchases` `Plan.tsx:35` yanında `withPack` içinde ve imza adımında da çalışır; (4) **ödeme öncesi `dry-run`:** `routes.ts:188` `/pacts/current/upgrade` önkoşullarını (L191 "daha uzun paket", L193 "pakt çok önce bitti") `consumePack` çağırmadan sınayan yeni salt-okunur uç; `Plan.tsx` CTA'dan önce çağırır, hata veya çevrimdışıysa atlanır; (5) ödeme sonrası yine 409 gelirse `paidNotUsable`: hak tüketilmez (`consumePack` L194'ten önce 409 atılıyor), ekranda "Ödemen alındı, hakkın saklandı…" (7.3) + destek/iade yolu | `purchase.ts`, `purchase.test.ts`, `src/payFlow.ts` (+`payFlow.test.ts`), `Setup.tsx`, `Plan.tsx`, `apps/api/src/routes.ts`, `apps/api/tests/play.test.ts`, `tr.ts`, `en.ts` | 3,0 | AKI-3, MET-2, REV-3 | K |

**Kabul ölçütleri (kritik dilim, 1.1.2)**
- Kriz 360x640, 360x800, 412x915'te kaydırmasız: süre, en az bir şahit arama, ALO 182 / Yeşilay 115 / 112, Sakinleş ve Atlattım aynı anda görünür; hedefler (`onLayout`) şahit ≥72, diğerleri ≥64, aralar ≥8 dp; telefonsuz şahit dokunuşu satır içi ipucu verir; `Crisis.tsx`'te `points` yok; ilk komut "Nefes al"; `srv.crisis()` tam bir kez; yazı ölçeği 1,3'te taşma yok. **Home'daki Krizdeyim `onLayout` ile genişlik ≥ ekran−32 dp, yükseklik ≥84 dp, bugünkü ölçülerden küçük değil (KRIZ-REGRESYON madde 13).**
- "Yanlışlıkla bastım": 120 sn içinde görünür ve kilidi bırakır; sunucu olayı yazar ve kabul etmiş şahitlere düzeltme maili gider (api testi, TR/EN); 120 sn sonrası uç 409 verir ve satır görünmez; rapordaki `crises` sayısı geri çekileni saymaz.
- Ödeme: Play penceresi iptalinde "Ödeme tamamlanmadı. Hiçbir şey kurulmadı." görünür, pakt kurulmaz, `role` değişmez; ödeme sonrası sunucu hatasında bir kez otomatik yeniden deneme; yine olmazsa "Ödemen alındı…" ve sonraki denemede ikinci ödeme istenmez (`already owned` → kurtarma, ödeme penceresi açılmaz); `withPack` imzası/dönüşü aynı; `purchase.test.ts` + `payFlow.test.ts` yeşil; `docs/ODEME-REGRESYON.md` lisans test hesabıyla koşuldu (başarı, iptal, bekleyen, uygulama ölümü, ağ kesintisi, already owned, ödeme sonrası 409); `dry-run` ucu `consumePack` çağırmaz (api testi); ham hata/ürün sayısı yok.
- Açılış: `useFonts` hatası simüle edilince ve `/health` kapalıyken (uçak modu) soğuk açılış ≤3 sn içinde uygulama açılır; `bootGuard.test.ts` yeşil; `billing.ts` `/health` yanıtını kalıcı önbelleğe yazar ve ağ yokken son bilinen değeri döndürür.
- Gün tanımı: `packDay.test.ts` yeşil (aksam başlangıcı + aynı gün 22:00 + ertesi 09:00 → gün 1 ve gün 2; DST ve saat dilimi vektörleri); ekran dosyalarında `packDayOf` dışında `86400000` ile gün hesabı yok (`Pending.tsx` bitiş zamanı hariç); Verify'da sunucu 409'u "zaten kaydedildi" olur, ağ hatası yerel kaydı korur.
- Store: 60 sn boşta Home yeniden çizimi 0 (render sayacı), `AsyncStorage.setItem` ≤2 (yazım sayacı); `sync()` aynı pakt verisiyle `app.set` çağırmaz ya da state referansı aynı kalır; arka plana geçişte son durum flush edilir (kayıt kaybı yok).
- Gizlilik: release AAB manifest dökümünde `android:allowBackup="false"` (ya da `dataExtractionRules` AsyncStorage ve belge klasörünü dışlıyor); cihazda yedeklenme dışı doğrulandı; kurulum taslağı 48 saatte ve pakt varsa açılışta silinir; kanonik gizlilik cümlesi TR/EN sözlükte; sürüm notunda yeni telefona geçiş uyarısı.
- Kurulum: arka planda öldürülünce aynı adım ve alanlar gelir (6 haneli kod ve imza adı saklanmaz); `createPact` sonrası, `logout`, `reset`, hesap silme sonrası taslak yok.
- Home/DayDone/Relapse/Exit/Crisis'te "puan", "BOZULDU", "kazandın", "ödül" yok (copy-check; E dilimiyle tamamlanır); Verify'da `Math.random` yok; Kaydet'e basıp uygulamayı öldürünce kontrol korunur.
- Ölçüm: janky ≤ baz, soğuk açılış ≤ baz +%20, AAB ≤ baz +1,5 MB; kriz dokunuş→süre ≤ baz +50 ms; Play erişim etiketleri değişmedi.
- Klinik okuma yazılı; yoksa yalnız çıkarma tipi değişiklikler (iddia/puan/ceza kaldırma) gider, nefes fazı ve adım metinleri ertelenir.

**Kabul ölçütleri (ertelenebilir dilim, 1.1.3 ile)**
- Hareketi azalt açıkken Home, Crisis, Calm oyunları ve geçişler durağan eşdeğerle çalışır; ayar oturum içinde değişince yeniden başlatmadan uyum sağlar; `grep 'let reduce'` boş.
- HoldSign tutma sırasında Setup yeniden çizilmez (render sayacı ≤2; eskisi 25/sn), `onSigned` tam 1 kez, haptik tam 2 çağrı.
- Haptik kapalıyken native çağrı 0; kriz ve oyunlarda 0; 800 ms sınırı testi yeşil. `grep 'useNativeDriver: false' apps/mobile/src` yalnız dev dosyalarında (**`useCountUp` F1-5'te kalktığı için bu madde F1-5 sonrası geçerlidir**).
- Oyunlarda sayaç/parçacık ve `rgba(236,48,19`, `#EC3013`, `#FF5A3D` literal yok; Memory'de kalp/karo yok; Sudoku üretiminde kriz sayacı donmaz; Android geri tuşu 5 durumda doğru.

### F2. 1.1.3 "Net başlangıç" (15,5 gün; F3'ten sonra yürür)

**Amaç:** Görünüm aynı; satış dürüstlüğü, satış sessizliği, 7 adımlı kurulum, şahit işlevleri, sunucu vaat temizliği. **Gönderilebilirlik:** F1'in ertelenebilir dilimiyle birlikte tek başına çıkar (%20 → %100). **Bağımlılık:** F0-4, F1-1, F1-11, F1-12, F1-21. **Setup.tsx dokunuş sırası:** F1-11 → F1-12 → F1-21 (yalnız çağrı noktası) → F2-4 → F5-2; her dokunuştan sonra `docs/ODEME-REGRESYON.md` Setup bölümü koşulur. (Ödeme güvencesi F2-1 olarak buradaydı; F1-21'e taşındı, F2-1 kimliği boş bırakıldı.)

| ID | Görev | Başlıca dosyalar | Gün | Kaynak |
|---|---|---|---|---|
| F2-2 | Paywall ve Paketim: sabit footer, fiyatlı CTA, "N yeni gün / deneme dahil", geçmiş paket seçilemez, nötr başlık, `buildReport` (+snapshot) + "Örnek rapora bak" (ORNEK etiketli), "Krizdeyim" ≥64 dp, "uzman raporu"→"paylaşılabilir özet" (istemci + sunucu), "mücadele paketi"→"{d} günlük paket". **Satış sessizliği (K26):** kalıcı `salesQuietUntil`; yazım yerleri: kriz bitişi/Atlattım +30 dk, Relapse sonucu +24 sa, DayDone'da paket günü 7'nin katıysa +24 sa (lale günü = deneme son günü olsa bile paywall o gün çizilmez); `screenSelect.ts` paywall/tamamlandı'yı `salesQuietUntil` içinde ve meşgul ekranlarda (setup, verify, daydone, relapse, exit, journal, calm, guardian) bastırır, Home'a dönüşte gösterir; "Paketim" her zaman erişilebilir | `Plan.tsx`, `src/report.ts` (+test), `App.tsx`, `src/screenSelect.ts`, `store.tsx`, `Crisis.tsx`, `Relapse.tsx`, `DayDone.tsx`, `apps/api/src/routes.ts`, `apps/api/src/i18n.ts`, `tr.ts`, `en.ts`, `store/MAGAZA-METINLERI.md` | 3,25 | AKI-4, MET-6, REV-8 |
| F2-3 | `moment: null/signed/pack` (kalıcı, `createPact`/`upgrade` içinde `apply()` ile aynı tikte), `Sealed.tsx` (sade): "Soz verildi." / "Paket acildi." | `store.tsx`, `server.tsx`, `App.tsx`, `src/screens/Sealed.tsx` (yeni) | 1,0 | AKI-5 |
| F2-4 | Kurulum 10→7 adım + kapı. Dökümü: adım yeniden kurgusu ve `valid[step]`/`TOTAL`/`step !== 7` ağ testi indeksleri 3,0; imza sonrası akış (mektup, sonuçlar, video, `Sealed` ilişkisi) 1,5; `Crisis.tsx`'te boş neden/mektup koruması 0,5; Yardım (`HelpSheet`, hesapsız) 0,5; **iki ayrı onay (KVKK `setup.consent` + yeni `setup.guardianNotice`, S23)** 0,5; regresyon ve elle kontrol listesi 0,5. Ayrıca `Science` satır içi katlanır (kapalı varsayılan); neden atlanabilir; `hideHabit` varsayılanı S6 yanıtına bağlı (yanıt yoksa bugünkü değer); çıkış kuralı sözleşmede; dev metin sızıntısı kalkar | `Setup.tsx`, `src/components/HelpSheet.tsx` (yeni), `ui.tsx`, `helplines.ts`, `tr.ts`, `en.ts` | 6,5 | AKI-6, MET-3, MET-4, MET-5, REV-11 |
| F2-5 | Şahit: kabulde sahide mail, "Geri" jetonu silmez, jeton ömrü `goal_days+30`, sahidin yardım hatları, 3 hazır mesaj, temiz seri her zaman, çıkış maili `min(2, kabul eden)`, mail adım metni sürüm-nötr | `GuardianApp.tsx`, `apps/api/src/mail.ts`, `routes.ts`, `service.ts`, `i18n.ts`, `apps/api/tests/*` | 2,25 | AKI-7, MET-10 (şahit metni) |
| F2-6 | Sürüm 1.1.3 (F1 ertelenebilir dilim + F2): ödeme regresyonu (lisans test hesabı: başarı, iptal, bekleyen, uygulama ölümü, ağ kesintisi, already owned, ödeme sonrası 409), kapı, kademeli yayın | `app.json` | 1,5 | YAY-8 örüntüsü |
| F2-7 | **Sunucu ve belge vaat temizliği:** `apps/api/src/config.ts:37` `completionDiscountPct: 40` → 0; `mail.ts` `packCompleted` indirim cümlesi (TR L103-105, EN L162-164) ve `pactActive` "Her gün bir hücre." (L79) yeniden yazılır; `service.ts:39,133` indirimi 0 hesaplar (API alanı `nextPackDiscount` kalır); `apps/api/tests/mail.test.ts` güncellenir; `docs/MONETIZATION.md` (tamamlama ödülü satırları: ≈28, 55, 93) ve `store/ODEME-REHBERI.md:72` güncellenir | `apps/api/src/config.ts`, `apps/api/src/mail.ts`, `apps/api/src/service.ts`, `apps/api/tests/mail.test.ts`, `docs/MONETIZATION.md`, `store/ODEME-REHBERI.md` | 1,0 | REV-10 |

**Kabul ölçütleri**
- 360x640 ve 360x800'de paywall açılışında fiyatlı CTA ve "Tek seferlik…" kaydırmasız görünür; süresi geçen paket seçilemez (409 ekrana düşmez); tekrar oynamış kullanıcıda tebrik yok; `buildReport` çıktısı eski metinle aynı; `apps/api` `i18n.test.ts` geçer.
- **Satış sessizliği:** kriz bitişinden 30 dk, tekrar oynamadan 24 sa, lale/7'nin katı günden 24 sa içinde paywall/tamamlandı çizilmez (`screenSelect.test.ts`); kurulum, kontrol, gün tamam, tekrar oynama, çıkış, günlük, Sakinleş sırasında `refreshCompletion` ya da 30 sn sync paywall'ı getirmez, Home'a dönüşte gelir; deneme son 2 günde Home'da uyarı satırı görünür ("uyarısız paywall" yok).
- Kurulum 7 adım + kapı; mektup/sonuçlar/video `Setup.tsx`'te yok; kapıda iki seçenek eşit; Yardım her adımda; iki onay işaretlenmeden imza etkin olmaz; `setup.consent` KVKK metni aynen, şahit bildirimi ayrı dize ve iki metin hukuk onayına sunulmuş; `__DEV__ false`'ta API adresi yok; "Hesabım var", `startingNew`, 7/30/60/90 yolları ve `createPact` yükü eski şemayla aynı; `copy-check` tavanları (kurulum ≤470 TR / ≤620 EN) aşılmaz.
- Ödeme/imza sonrası Home tek kare görünmez; Sealed bir kez gelir; kriz aktifken önce kriz.
- `apps/api` testleri yeşil (kabulde mail, jeton ömrü, çıkış maili sayısı, `completionDiscountPct` 0, `packCompleted` mailinde indirim yok); portal "Geri" davet kodunu yeniden yazdırmaz; `grep -rn "indirim hakkın\|%40" apps/api/src docs store` boş.
- Klasik piksel referansı F2 sonunda **yenilenir** (F2 klasik arayüzü bilerek değiştirir) ve F4'e giriş referansı olur.

### F3. Bahçe zemini (11,0 gün, iç faz; yılbaşı dondurmasında yürür)

**Amaç:** Yeni görünümün altyapısını bayrağın arkasında kurmak; en büyük belirsizlikleri (sprite, native sürücü) erken ölçmek. **Gönderilebilirlik:** Bayrak `klasik` iken AAB F1 çıktısıyla görsel olarak aynıdır; gönderilebilir ama kullanıcıya fayda getirmez; preview profili `bahce`. **Bağımlılık:** F0, F1-2, F1-3. **Sıra:** F3-1'den sonra **F3-6'nın referans çekimi ilk iş** yapılır (F1 sonrası klasik görünüm = referans); "piksel farkı 0" bu referansa göredir.

| ID | Görev | Başlıca dosyalar | Gün | Kaynak |
|---|---|---|---|---|
| F3-1 | `palette.ts` (DAY, NIGHT, CLASSIC) + `theme.ts` (SKIN, SP, HIT, TS, DUR, SHADOW, GRAIN, `CRISIS_THEME`, `pebble`, `clayA`, `scrimA`, `play`); `check-theme.mjs`; `eas.json` (preview=bahce, production=klasik); `.env.example`; `GECIS-ENVANTERI.md` | `src/palette.ts`, `src/theme.ts`, `scripts/check-theme.mjs`, `eas.json`, `apps/mobile/.env.example`, `docs/GECIS-ENVANTERI.md` | 2,25 | TEM-1, YAY-5, YAY-7 |
| F3-2 | Yazı tipi hattı: Fraunces üç özel TTF, Nunito/Caveat alt yol importları, `fonts.ts`, OFL; cmap doğrulaması; boyut ölçümü | `tools/fonts/build-fraunces.py`, `apps/mobile/assets/fonts/*`, `src/fonts.ts`, `package.json` (`+@expo-google-fonts/nunito`, `+caveat`) | 1,0 | TEM-2 |
| F3-3 | Tipografi ilkeleri: `F` haritası, `T` (otomatik Fraunces ≥26), `Kicker`, `Hand`, 13 px tabanı (yalnız bahce) | `theme.ts`, `ui.tsx` | 0,75 | TEM-3 |
| F3-4 | `core.ts`: `stageFor`, `buildLayout`, hash, `dayStates`, `limbProgress`, `reasonTag`; gün tanımı için F1-18'in `packDay.ts`'ini içe aktarır; golden; testler | `src/garden/core.ts`, `core.test.ts`, `golden/*.json` (yeni) | 1,5 | BIT-2, VAR-1 geometri |
| F3-5 | Sprite hattı ve cihaz spike'ı: `tools/garden`, `art/garden/src` (yaprak, lale, sap), `wobble`, `budget`, `contrast`; `sprites.ts`; `GardenBench`/`MotionLab` (yalnız lab derlemesi); reçeteler (a-i): native loop + interpolate, alt-merkez pivot, `scaleX`+`translateX` Wipe, `transformOrigin`, tintColor+opacity, 40 animasyonlu View, `renderToHardwareTextureAndroid`, gren yöntemi; karar kaydı | `tools/garden/*`, `art/garden/*`, `apps/mobile/assets/garden/*`, `src/garden/sprites.ts`, `src/dev/MotionLab.tsx` | 3,0 | BIT-1, VAR-1, HAR-2 |
| F3-6 | Ekran-al hattı: demo durumu tohumu (`lockin.v4` JSON'u + `REVIEW_EMAIL`/`REVIEW_CODE`), `uiautomator` metne göre dokunma, `screencap`, `scan-banned`, regresyon envanteri (17 yüzey x 2 tema + EN/1,3 alt kümesi, piksel farkı); **klasik referans seti F3'ün başında çekilir** | `tools/store-capture/*` (yeni), `.gitignore` | 2,5 | VAR-4, YAY-6 |

**Kabul ölçütleri**
- Bayrak tanımsızken/`klasik`'te F3 başı referans setine göre 0 piksel fark (hat F3'ün başında çalıştığı için F1'in klasik değişiklikleri sayılmaz); preview APK `bahce` paletiyle açılır; production AAB klasik kalır.
- `check-theme.mjs` tuvaldeki Kimlik tablosunu ±0,01 yeniden üretir; yasak çiftler başarısız sayılır; eski 17 anahtar iki temada tanımlı; pebble köşe oranları (TL+BL ≤1) doğrulanır; `palette.ts` içinde `react-native` importu yok; `applyTheme` `c` kimliğini değiştirmez.
- Fraunces üç TTF, Nunito, Caveat Türkçe kümeyi ve ₺'yi kapsar; yeni yazı tipi varlıkları ≤1,0 MB (`expo export --platform android`); `grep "@expo-google-fonts/[a-z]*'" apps/mobile/src` kök import bulmaz.
- `core.ts`: `buildLayout('filiz')` 30 öğe (26 yaprak + 4 lale: gün 7, 14, 21, 28) ve tuvaldeki `plant(14,30,340,400)` ile konum farkı ≤0,5 birim (jitter hariç); golden eşleşir; yeniden kurulum, relapse+check-in, **aksam başlangıcı + sabah kontrolü**, completed, 180 gün senaryoları testte.
- Sprite hattı iki ardışık çalıştırmada bayt bayt aynı; spike seti ≤120 KB, dosya ≤40 KB; Metro soneksiz `require` çözer ve release APK'da `res/drawable-xhdpi` altında; tintColor açık/koyu doğru; pivot/`scaleX` reçeteleri A sınıfında kayma/zıplama olmadan çalışır.
- Spike kapısı: A sınıfında 30 yapraklı statik bitki boşta janky ≤%2; ±3° native sallanma 30 sn <%5; Graphics belleği ≤25 MB (A sınıfı cihaz yoksa uyarı kapısı, 2.3). Geçmezse BIT-12 planı açılır. Karar kaydı: gren yöntemi, @2x yeterli mi.
- Ekran-al: tek komutla 8 sahne TR ve EN ham PNG; `scan-banned` "LockIn", "kazan", "puan", "ceza", "indirim" içeren ekranda sıfırdan farklı çıkar, temiz sette 0 bulgu; gerçek e-posta/kişi adı yok.

### F4. 1.2.0 "Kâğıt ve çay" (27,5 gün)

**Amaç:** Tüm yüzeyler yeni dilde (palet, yazı, şekil); Ana ekran kaydırmasız `PlantLite` ile; ikon, splash, mail. Bespoke görsel işler F5/F6'ya ayrılır. **Gönderilebilirlik:** Production bayrağı `bahce` olur; tek başına tutarlı yeni görünüm. **Bağımlılık:** F1, F2, F3.

| ID | Görev | Başlıca dosyalar | Gün | Kaynak |
|---|---|---|---|---|
| F4-1 | `SplashScreen` bağlama (kapı zaman aşımı ve font yedeği F1-17'de), splash/ilk boyama, varsayılan `'system'`, `themeV` göçü (`dark`→`system`), `useShownTheme`, `app.json` renkleri ve `dark` bloğu | `App.tsx`, `theme.ts`, `src/useShownTheme.ts` (yeni), `store.tsx`, `Profile.tsx`, `app.json` | 1,75 | TEM-4, TEM-9, YAY-11 |
| F4-2 | Yüzey ilkeleri: `Pebble`, `PaperCard`, `Grain`, `Screen`, `Hair`, `Body`, `Back`, `Chip`, `TopChips` | `src/components/paper.tsx` (yeni), `ui.tsx`, `assets/paper/grain.png` | 1,25 | TEM-5 |
| F4-3 | Eylem ilkeleri: ActionBar/HoldBar pebble, basınca gömülme (a11y F1'de yapıldı) | `ui.tsx`, `Journal.tsx`, `Calm.tsx`, `Relapse.tsx`, `Crisis.tsx` | 0,75 | TEM-6 |
| F4-4 | Seçim/girdi/not: `Opt`, `Field`, `NumRow`, `Science` görünümü, `StepProgress`, `Hand`; ok/onay View ile | `ui.tsx` | 1,0 | TEM-7 |
| F4-5 | Sabit renk süpürmesi (izin listesi biter), oyun renkleri token'dan (`play`), `GuardianApp` token/okunabilirlik | `ui.tsx`, `VowRecorder.tsx`, `games/*`, `GuardianApp.tsx` | 2,0 | TEM-8, KRI-8 (renk), AKI-14 (min) |
| F4-6 | `PlantLite` + Ana ekran yeniden yazımı (kaydırmasız): **Krizdeyim tam genişlik ≥84 dp altta sabit (kaydırma alanı dışında, kil), 3 öğeli dock, "Ben" çipi, yazı ölçeği/yükseklik yetmezse sahne+dock `ScrollView` (Krizdeyim sabit), `onLayout` testleri**; durumlar due / done / deneme-bitiyor (`home.trialLeft/trialLastDay`) / completed; `useGardenDay`, `gardenSeen`; `bootGuard` bağlaması (ilk mount işaret yaz, 5 sn sonra sil; işaret/`uiFlags` ile `plantMode`); Profil'e taşıma (Tekrar oynadım, Çıkış talebi, Şahit olarak gir); `useIntro` kalkar | `src/garden/PlantLite.tsx` (yeni), `Home.tsx`, `Profile.tsx`, `store.tsx`, `src/bootGuard.ts`, `tr.ts`, `en.ts` | 5,5 | BIT-7, BIT-9, MET-7, YAY-12 (yedek), REV-1, REV-2, REV-8 |
| F4-7 | DayDone + Verify yeniden kaplama: taze yaprak/lale açılışı (PlantLite; gecikmesiz 800/1000 ms, halka/parıltı yok), 4 çip, eşit Evet/Hayır, dürtü seçici (`adjustable`), `closeAnimDay`; deneme son 2 günde nötr satır; **`dayMessage.ts` hizası: `MILESTONES` (L4) temiz seri yerine paket günü/lale ile eşlenir, `firstSentence(s, max=110)` (L18) kullanıcı metninden alıntıyı görünür kelime ≤12 sınırına uyduracak şekilde katlıya alınır ya da ≤8 kelimeye iner** | `DayDone.tsx`, `Verify.tsx`, `src/dayMessage.ts`, `store.tsx` | 3,25 | BIT-8, HAR-10, AKI-16, REV-8, REV-10 |
| F4-8 | Kriz yeniden kaplama: `BreathBlob`, `useCrisisProgress`, `CrisisClock` yalıtımı, kısa metin TR/EN, `CRISIS_THEME` (onay yoksa `'dark'`, onay varsa `'follow'`), "Hâlâ zorsa aramalar açık." | `Crisis.tsx`, `src/crisis/scene/BreathBlob.tsx`, `useCrisisProgress.ts` (yeni), `style.ts`, `App.tsx`, `tr.ts`, `en.ts` | 2,0 | KRI-6 (a), KRI-7, HAR-11 (nefes/saat) |
| F4-9 | Kâğıt perde: `PaperSlide` (kriz yalnız 200 ms solma) | `primitives.tsx`, `motion.tsx`, `App.tsx`, `Setup.tsx` | 1,0 | HAR-7 |
| F4-10 | İkon, adaptif, monokrom, splash görselleri | `art/garden/src/brand-icon-*.svg`, `tools/garden/build-icons.mjs`, `apps/mobile/assets/*`, `app.json`, `store/play/ikon-512.png` | 1,5 | VAR-3 |
| F4-11 | Mail HTML (Bahçe paleti, düğme, kod üstte, preheader, `locale`) | `apps/api/src/mailHtml.ts`, `mail.ts`, `service.ts`, `apps/api/tests/mail.test.ts`, `apps/api/scripts/mail-preview.ts` (yeni) | 1,5 | VAR-8 |
| F4-12 | Doğrulama: cihaz matrisi (TR/EN x gündüz/gece x yazı 1,0/1,3/2,0 x hareket), gfxinfo, yerleşim düzeltmeleri (44+ görüntü x 2 dil x 2 tema x ölçek x hareket), **yazılı ölçütlü çağrışım testi** (aşağıda) ve düzeltme turu | `screens/*.tsx` (taşma), `palette.ts` (`NIGHT.paper`) | 3,0 | TEM-10, REV-11, REV-12 |
| F4-13 | Yayın: bayrak production→bahce, dahili ≥48 saat, kapalı test (5-8 gönüllü), klinik okuma, %10 → %50 → %100 (bekleme günleri bölüm 9 takviminde, iş günü sayılmaz); Play ikon 512 + öne çıkan görsel o hafta; mail aynı hafta Railway'e | `eas.json`, `app.json`, `store/play/*` | 3,0 | YAY-13 |

**Çağrışım testi ("kumar çuhası/jackpot") yazılı ölçütü (F4-12 ve F9):** 3-5 kişi (en az 2'si kumar/bahsi bırakma deneyimi olan gönüllü, 1 klinik danışman). Gösterilen set: Home, Gün tamam, Kriz (gündüz ve gece) + 8 mağaza karesi. Sorular: (1) "Bu görüntü sana neyi hatırlatıyor?" (serbest, kayda geçer); (2) "Kumar, casino, slot ya da jackpot çağrışımı yaptı mı? Evet/Hayır, hangi unsur?" **GEÇTİ:** çağrışım diyen ≤1 kişi ve klinik danışman engelleyici bulgu yazmadı. **KALDI:** ≥2 kişi aynı unsuru (renk, hardal, yeşil zemin, parıltı) kumarla ilişkilendirdi ya da klinik danışman engelleyici yazdı; o unsur değiştirilir (ör. `NIGHT.paper` alternatifi, hardal alanı küçültme) ve test yalnız o unsurla tekrarlanır. Sonuç `docs/YAYIN-OLCUM.md`'ye yazılır.

**Kabul ölçütleri**
- `GECIS-ENVANTERI.md`'de tüm satırlar "bitti"; F3-6 hattıyla 44+ görüntüde klasik köşe/hairline kalıntısı, kırmızı, siyah ve ızgara yok; `grep` ile `rgba(236,48,19`, `#EC3013`, `#DD2B0F`, `#5E1509` yok; `hovered` tabanlı görsel durum kalmadı.
- Gövde metni ≥4,5:1, arayüz ≥3:1 (`check-theme.mjs`); kil metni kum üstünde yok; Caveat <22 px yok; 13 px altı bilgi metni yok; yazı ölçeği 1,3 ve 2,0'da Home, Crisis, Plan, Setup'ta kırpma/taşma yok; hareketi azalt tüm ekranlarda durağan eşdeğer.
- **Ana ekran:** görünür kelime ≤15 (deneme son 2 günde +≤10); 360x640 ve 390x844'te kaydırmasız; **Krizdeyim `onLayout`: genişlik ≥ ekran−32 dp, yükseklik ≥84 dp (≥ bugünkü), ekranın altında, kaydırma alanının dışında; 360 dp'de dock öğeleri ≥48 dp ve TR etiketler ('Sakinleş', 'Şahitler', 'Günlük') 13 sp ve 1,3x ölçekte kırpılmaz; ölçek 1,5x ve üstünde (veya yükseklik yetmezse) yalnız sahne+dock kaydırılır, Krizdeyim hâlâ görünür** ve tek dokunuş (KRIZ-REGRESYON madde 1, 13); "Tekrar oynadım", "Çıkış talebi", "Şahit olarak gir", Paketim, İmza videosu Profil'den ≤2 dokunuş; gün sayısı ilk karede doğru; periyodik 15 sn yeniden çizim yok; deneme son 2 günde uyarı satırı var; Home ızgarası hiçbir yerde yok.
- **Açılış güvenliği:** işaret (`quitvow.bootFlag.v1`) duruyorsa sonraki açılışta `PlantLite`; sprite yokken/`Image` hatasında Home açılır; font hatasında 3 sn içinde açılır.
- Gün tamam: görünür kelime ≤12; **yaprak 800 ms, 7. gün lale 1000 ms; gecikme, aşma, halka ve parıltı yok**; aynı gün ikinci açılışta dizi oynamaz; gece ateş böceği ≤3 devir, açık temada ışık yok; `dayMessage` kilometre taşları paket günü/lale ile uyumlu.
- Kriz: 390x844'te Kriz.dc.html ile açık/koyu eşleşir; ana ekran ≤30 kelime TR; `CRISIS_THEME='follow'` iken krize girerken tüm ağaç yeniden kurulmaz, `'dark'` iken yeniden kurma süresi ölçülür ve dokunuş→süre ≤ baz +50 ms; "Geçti/Dalga indi" ifadesi hiçbir ekranda yok.
- Sistem temalı soğuk açılışta siyah/koyu parlama yok (ekran kaydı); `theme:'dark'` kayıt `'system'`e, `'light'` aynen taşınır; Profil Gece/Gündüz/Sistem anında çalışır; Setup 3. adımında OS teması değişirse adım ve metin korunur.
- A sınıfında janky ≤ baz çizgi, soğuk açılış ≤ baz +%20, AAB ≤ baz +1,5 MB (A sınıfı cihaz yoksa uyarı kapısı); kriz regresyonu 14/14; ödeme regresyonu temiz; Play erişim talimatı etiketleri değişmedi veya Console'da güncel.
- Çağrışım testi yazılı ölçütle GEÇTİ ya da düzeltme turu tamam; kapalı test ve klinik danışman geri bildirimi işlenmiş; kriz ekranı için engelleyici bulgu yok.

### F5. 1.2.1 "Kurulum ve paket görünümü" (8,5 gün)

**Amaç:** Kurulum ve paywall'a bespoke görsel dil; Filiz/Fidan/Ağaç adları. **Gönderilebilirlik:** Tek başına çıkar (ödeme regresyonu zorunlu). **Bağımlılık:** F4 (sprite yoksa `GardenArt` View yedeği).

| ID | Görev | Başlıca dosyalar | Gün | Kaynak |
|---|---|---|---|---|
| F5-1 | Akış bileşenleri: `GardenArt` (sprite varsa Image, yoksa View), `SeedPacket` (3 kolon, 232 yüksek, seçili 3 px `act`, 360 dp ve 1,3x'te liste yedeği, `radio` rolü), `StepLeaves`, `Stamp` | `src/components/GardenArt.tsx`, `SeedPacket.tsx`, `StepLeaves.tsx` (yeni) | 1,75 | AKI-9 |
| F5-2 | Setup görsel kaplama: kapı + 7 adım yerleşimi, `StepLeaves`, bahçe etiketi olarak neden alanı, imza ekranı (pebble HoldSign görünümü) | `Setup.tsx`, `tr.ts`, `en.ts` | 2,5 | AKI-10 |
| F5-3 | Sealed görsel ("Soz verildi.", "Paket acildi.") | `Sealed.tsx` | 1,0 | AKI-11 |
| F5-4 | Paywall/Paketim görsel kaplama; Filiz/Fidan/Ağaç adları (`packs.tier`), Play Console başlıkları ve mağaza PAKETLER metni aynı gün | `Plan.tsx`, `SeedPacket.tsx`, `tr.ts`, `en.ts`, `store/MAGAZA-METINLERI.md` | 1,75 | AKI-12, MET-6 |
| F5-5 | Yayın 1.2.1 (ödeme regresyonu dahil) | `app.json` | 1,5 | YAY |

**Kabul ölçütleri**
- 360 dp ve yazı ölçeği 1,3'te paket kartında fiyat/ad kırpılmaz (liste düzenine düşer); `radio` rolü TalkBack'te okunur; Play `displayPrice` (örn. `₺349,00`) kırpılmadan görünür; ekranda aynı anda en çok 1 sonsuz animasyon.
- Kapıda "Basla" ve "Davet aldim" aynı boyut/ağırlık; görünür kelime kurulum toplamı ≤175 TR; imza ekranında fiyat + "Tek seferlik…" damgası ≥14 sp, imzadan önce görünür; neden alanı atlanabilir.
- Paket adları TR/EN sözlükte; Play Console başlıkları, mağaza metni ve uygulama aynı adları kullanır; mevcut kullanıcıya Paketim'de bir kez açıklama; satın alma akışı (seçim → CTA → Play → Sealed "Paket açıldı") lisans test hesabıyla uçtan uca çalışır (`docs/ODEME-REGRESYON.md`).
- Kesik damga Android'de (asimetrik radius) düzgün çizilir ya da yedek radius uygulanır.

### F6. 1.2.2 "Günlük, destek ve Sakinleş" (10,0 gün)

**Amaç:** Kalan ekranların bespoke dili, tekrar oynama/çıkış yeniden kurgusu, puan yazımlarının silinmesi. **Gönderilebilirlik:** Tek başına çıkar. **Bağımlılık:** F4.

| ID | Görev | Başlıca dosyalar | Gün | Kaynak |
|---|---|---|---|---|
| F6-1 | Sakinleş menüsü (tohum paketi kartları, Nefes kartı) + oyun kaplaması (renkler F4-5'te) | `Calm.tsx`, `games/*`, `BreathBlob.tsx` | 1,25 | KRI-8 |
| F6-2 | Relapse: "Bir duraklama.", iki eşit seçenek, `LeafCurl` (yaprak silinmez, 900 ms), `HelpRow`, insancıl hata, geri → forma | `Relapse.tsx`, `src/crisis/scene/LeafCurl.tsx` (yeni), `tr.ts`, `en.ts` | 1,0 | KRI-9 |
| F6-3 | Exit: "Iki anahtar. Iki sahit.", "Kaliyorum", 72 saat büyük sayaç, hesap silme ayrı bölümde | `Exit.tsx`, `HelpRow.tsx`, `tr.ts`, `en.ts` | 0,75 | KRI-10 |
| F6-4 | Metin: çıkış, şahitlerim, profil, günlük, analiz, tamamlandı (7.3 örnekleri, `copy-check` tavanları); puan yazımları silinir (`Verify.tsx:23` +5, `Journal`, `Relapse`; `store.points` alanı kalır) | `tr.ts`, `en.ts`, `Verify.tsx`, `Journal.tsx`, `Relapse.tsx` | 1,0 | MET-9, K13 |
| F6-5 | Pending: Sahitlerin ("Anahtar: n", durum metin + ikon), Completed (indirimsiz, "bahçe belgesi", `startingNew` + taslak temizliği) | `Pending.tsx` | 1,5 | AKI-15 |
| F6-6 | Journal + Analysis (kilitli kart: kurşun kalem taslak + ORNEK etiketli önizleme + kendi kayıt sayısı), Profile (kâğıt satırlar, etiket) | `Journal.tsx`, `src/components/Analysis.tsx`, `Profile.tsx` | 2,0 | AKI-17, AKI-18 |
| F6-7 | VowRecorder/VowScreen: izin "Kaydi hazirla" ile, "Simdi degil" eşit; kırmızı yok | `src/components/VowRecorder.tsx`, `Pending.tsx` | 1,0 | AKI-13 |
| F6-8 | Yayın 1.2.2 | `app.json` | 1,5 | YAY |

**Kabul ölçütleri**
- Relapse sonuçta üstü çizili sayı/damga/puan yok; yaprak bir kez 900 ms kıvrılır (hareketi azalt: durağan kıvrık); `HelpRow` kaydırmasız görünür ≥64 dp; sonuç adımında geri forma döner; ham hata yok; `srv.relapse(self, note)` ve `a.addEntry` imzaları değişmedi; metinde utandıran işaret, ceza, puan, "kazandın" yok.
- Exit: "ödül", "yenilenmez", "Vazgeç" ifadeleri yok; durum matrisi (solo / 2 anahtar x talep yok / bekliyor / onaylandı-bekleme / hazır) `a.unlock` ile elle doğrulandı ve `srv.*` çağrıları değişmedi; hesap silme ≥48 dp ve başlat düğmesinden ≥24 dp uzak.
- Calm menüsü ≤20 görünür kelime, kartlar ≥64 dp; oyun dosyalarında kırmızı/siyah literal yok; oyun mantığı diff'te değişmedi.
- `grep "points" apps/mobile/src/screens` Home/DayDone/Verify/Journal/Relapse/Crisis'te yazım bulmaz; eski kayıtlar açılışta hata vermez.
- Completed'da indirim yok, paylaşım metni (`certText`) aynı; kamera/mikrofon izni ilk dokunuşta istenmez.

### F7. 1.3.0 "Büyüyen bitki" (15,75 gün)

**Amaç:** Sprite'lı bitki, kriz kesiti, bitki hareketleri, uzaktan ve yerel geri dönüş. **Gönderilebilirlik:** Tek başına çıkar; `/health` hafif görünüm bayrağı, yerel sağlık işareti ve `PlantLite` yedeğiyle korunur. **Bağımlılık:** F3-5 kapısı geçmiş, F4, klinik onay (kriz hareketi).

| ID | Görev | Başlıca dosyalar | Gün | Kaynak |
|---|---|---|---|---|
| F7-1 | Tam sprite seti: yaprak, kıvrık yaprak, lale, sürgün, tohum/filiz gövdesi, sahne (tepe, toprak, bulut, güneş/ay, etiket, gren), kriz kökleri (**parıltı ve halka sprite'ı yok**) | `art/garden/src/*`, `apps/mobile/assets/garden/*`, `src/garden/sprites.ts` | 3,25 | BIT-3, BIT-4, VAR-2 |
| F7-2 | `Plant` ve `Scene` (StaticPlant + Dynamic ≤6 düğüm, tema paleti, a11y, `variant` `own`/`window`); `PlantLite` hafif mod olarak kalır | `src/garden/Plant.tsx`, `Scene.tsx`, `palette.ts`, `index.ts` (yeni) | 1,5 | BIT-5 |
| F7-3 | Bitki hareket ilkeleri: `BudPulse`, `LeafOpen` (800 ms, gecikmesiz), `TulipOpen` (1000 ms), `Curl`, esinti, `useImageReady`; `haptic.settle` (halka/parıltı yok) | `src/garden/motion.tsx` (yeni), `src/motion/primitives.tsx` | 2,0 | BIT-6, HAR-9 |
| F7-4 | Ana ekran ve Gün tamam'a sprite `Plant` bağlama; 60/90 günlük yedek (filiz gövdesi + küçülen yaprak); gün kapanışı dizisi | `Home.tsx`, `DayDone.tsx` | 0,75 | BIT-8, HAR-10 |
| F7-5 | Kriz kesiti: `CrossSection`, `SwayPlant` (11°; klinik onay yoksa genlik 0, statik), `Roots` (karşı kayma), kök/dalga 30 sn'lik zaman çizelgesi, `QUALITY` bayrakları | `src/crisis/scene/CrossSection.tsx`, `SwayPlant.tsx`, `Roots.tsx` (yeni), `Crisis.tsx` | 2,0 | KRI-6 (b), HAR-11 |
| F7-6 | Düşük donanım ölçümü ve ayar, koyu tema kontrast denetimi, sprite boyut/bellek (release AAB) | `GardenBench.tsx`, `Plant.tsx`, `tools/garden/budget.mjs` | 1,5 | BIT-10, VAR-11 |
| F7-7 | Geri dönüş prova ve katmanları: v1.1.2 etiketinden klasik skin derlemesi provası; `/health` `{ ui: { plant: 'full'/'lite'/'off' } }` (`apps/api/src/app.ts:28`); `billing.ts` kalıcı `uiFlags` + varsayılan `lite` (F1-17'nin tamamlanması); Home sağlık işareti ve `Image onError`/`useImageReady` 1,5 sn aşımı → `PlantLite`; **"sprite yüklenemezse Home yine açılır" ve "ardışık 2 ölümde `off`" testleri** | `docs/GERI-DONUS.md`, `apps/mobile/src/billing.ts`, `src/bootGuard.ts`, `src/garden/Plant.tsx`, `apps/api/src/app.ts`, `apps/api/tests/api.test.ts` | 1,75 | YAY-17, REV-2 |
| F7-8 | Yayın 1.3.0: klinik onay, kapalı test, %10 → %50 → %100 (bekleme günleri bölüm 9 takviminde) | `app.json` | 3,0 | YAY-14 |

**Kabul ölçütleri**
- A sınıfında Ana ekran ve kriz sallanması janky ≤ baz çizgi (≤%5 hedef); Graphics belleği Home sahnesi için ≤40 MB, Home↔Verify x20 sonrası artış ≤5 MB; sprite toplamı ≤0,8 MB (bitki seti ≤600 KB); release AAB farkı ≤ baz +2,0 MB (font + sprite + ikon dahil). A sınıfı gerçek cihaz yoksa bu eşikler uyarı kapısıdır (2.3).
- 30 günlük bitkide `Image` ≤70 (aşılırsa BIT-12) ve Home View ≤110; `StaticPlant` 15 sn'lik yenilemede yeniden çizilmez (render sayacı); 6 durum + lale (açık, tomurcuk, taslak, eğik) çizilir; `rest` tam yaprak, relapse yaprağı silinmez; `resources` içinde `@2x` dışında dosya yok; parıltı/halka sprite'ı pakette yok.
- Sallanma hiçbir koşulda 11°'yi aşmaz (model testi + ekran kaydı), bitki devrilmez; nefes yazısı ile disk 15. dakikada ≤0,5 sn kayık; arka plandan dönünce zarf ve kök uzunluğu `elapsed`'a göre doğru; kriz boyunca haptik 0.
- Aynı gün iki açılışta bitki piksel piksel aynı (rastgelelik yok); hareketi azalt: yaprak/lale açık, nabız/sallanma yok, kök 10 sn'de bir adım.
- Kriz akışı 14/14; "hafif" bayrağında yalnız bugünün tomurcuğu canlı, "off"ta `PlantLite`; sunucu erişilemezse son bilinen değer, hiç yoksa `lite`; sağlık işareti testi yeşil; geri dönüş derlemesi prova edilmiş ve süresi yazılı.
- Klinik danışman kriz hareketini yazılı onaylamış (dalga/"15 dakikada alçalır" iddiası yok; kendiliğinden "geçti" demez); onay yoksa kesit statik bitkiyle çıkar.

### F8. 1.3.1 "Dallı bitki, şahit penceresi ve imza" (7,5 gün)

**Amaç:** 60/90 günlük paketler için dallı bitki; şahit portalı; HoldSign görseli. **Gönderilebilirlik:** Tek başına çıkar. Portal ve imza görseli kesilebilir; dallı bitki (F8-2) kesilmez. **Bağımlılık:** F7.

| ID | Görev | Başlıca dosyalar | Gün | Kaynak |
|---|---|---|---|---|
| F8-1 | Ek sanat: kemer pencere, damla, saksı/tohum paketi üst kenarı, çıkış anahtarları | `art/garden/src/*`, `assets/garden/*` | 1,0 | VAR-2 (kalan) |
| F8-2 | Fidan/Ağaç dalları: limb tabloları, fork, golden (gün n çıktısı n+1'in öneki) | `src/garden/core.ts`, `golden/layout-agac.json`, `Plant.tsx` | 1,0 | BIT-11 |
| F8-3 | HoldSign görünüm: saksı + fidan, halka, imza çizgisi (spike sonucuna göre; yedek dolgu çubuğu) | `src/components/HoldSign.tsx`, `Setup.tsx` | 1,0 | AKI-8 (görünüm) |
| F8-4 | Şahit portalı: kemer pencere, bitki **`variant="window"` (yalnız `/guardian/me`'deki `day` kadar tam yaprak ve 7'nin katı günlerde lale; boşluk, kıvrım, soluk yaprak yok)**, su damlası (`DropFall`, yalnız `/guardian/support` başarılıysa), davet ekranı, çıkış talebi kartı; basılı tutma yok. **`apps/api` dosyaları değişmez**: gün gün geçmiş sunucuya eklenmez, şahide yeni veri gitmez, S23 onay metni değişmez | `GuardianApp.tsx`, `src/components/ArchWindow.tsx`, `DropFall.tsx` (yeni) | 3,0 | AKI-14, HAR-13, REV-7 |
| F8-5 | Yayın 1.3.1 | `app.json` | 1,5 | YAY-18 |

**Kabul ölçütleri**
- Gün 31'de sol dal, gün 61'de sağ dal belirir, önceki günler değişmez; 360x640'ta ağaç yaprakları okunur; `Image` ≤200.
- **Şahit penceresi yalnız `day` ve laleleri çizer; `rest`/`curl` hiçbir koşulda görünmez; `git diff apps/api` boş; `/guardian/me` alanları (`routes.ts:325`) değişmedi.**
- Damla yalnız başarılı destek sonrası düşer ve tekrar etmez; hata düğme yanında gösterilir; hareketi azalt: damla yok, halka statik; ekranda ≤1 sonsuz animasyon.
- Basılı tutma imzası dokunarak eşdeğer ve TalkBack `activate` eylemiyle tamamlanır; paywall ve kriz ekranlarında basılı tutma yok.
- Kriz akışı 14/14; ödeme regresyonu temiz; Play erişim talimatı geçerli.

### F9. Vitrin: mağaza, site (11,75 gün)

**Amaç:** Mağaza, site ve mailin gerçek uygulamayla eşzamanlanması. **Gönderilebilirlik:** Mağaza girişi ve site; uygulama sürümü yok. **Zamanlama kuralı:** 1.3.0 %100 + 3-5 gün sorunsuz sonrası; F8 3 haftadan fazla gecikirse ya da kesilirse F9 beklemeden başlar (kare 04/05 mevcut görünümle çekilir). **Bağımlılık:** F3-6, F7.

| ID | Görev | Başlıca dosyalar | Gün | Kaynak |
|---|---|---|---|---|
| F9-1 | 8 kare TR + EN, öne çıkan görsel (TR/EN), og görseli; tek HTML şablon + Playwright | `tools/store-capture/poster.html`, `compose.mjs`, `check.mjs`, `store/play/telefon/*`, `telefon-en/*`, `one-cikan-gorsel-*.png`, `site/src/img/og-1200x630.png` | 2,5 | VAR-5 |
| F9-2 | Mağaza metni ve rehberler (PAKETLER, ÖNEMLİ, sürüm notu TR/EN ≤500 karakter, görseller tablosu) | `store/MAGAZA-METINLERI.md`, `store/PLAY-CONSOLE-REHBERI.md`, `store/ODEME-REHBERI.md` | 1,0 | VAR-9 |
| F9-3 | Site: tema, satır içi bitki SVG, `build.mjs` ortak parçalar | `site/src/style.css`, `template.html`, `site/build.mjs`, `site/src/img/garden/hero-plant.svg` | 3,0 | VAR-6 |
| F9-4 | Site görselleri (5x2) ve metni + **genişletilmiş vaat taraması:** "hücre", "ödüllendirilir", "Tahmini korunan", "balon patlatma", "indirim", "puan" için `site/src/i18n/*.mjs`, `site/src/blog/*.mjs`, `site/src/legal/tr.mjs`/`en.mjs`/`company.mjs`, `docs/DIL-VE-ALISKANLIK.md`, `docs/MONETIZATION.md` (tamamlama ödülü, taahhüt puanı), `pazarlama/*.md`, `apps/api/src/mail.ts`; paketler bölümü | `site/src/img/tr/*`, `en/*`, `site/src/i18n/tr.mjs`, `en.mjs`, `site/src/blog/*`, `site/src/legal/*`, `docs/*`, `pazarlama/*.md`, `apps/api/src/mail.ts` | 2,75 | VAR-7, MET-10, REV-10 |
| F9-5 | Yayın günü senkronu (Yönetilen yayın), kalite kapıları, A/B deney planı (tek değişken) | `store/MAGAZA-METINLERI.md`, `tools/store-capture/README.md` | 2,5 | YAY-15, VAR-10 |

**Kabul ölçütleri**
- 8 PNG 1080x1920 alfasız (<8 MB); ilk kare başlığında "bahis" ve "Rastgele ödül yok." rozeti; hiçbir karede "LockIn", "kazan", puan/ceza sayısı, kırmızı, geniş altın/hardal dolgu, konfeti, parıltı yok; kare başına ≤15 kelime; 8 karenin yalnız biri koyu.
- 8 karelik şerit F4-12'deki yazılı çağrışım ölçütünden geçti (sonuç yazılı).
- `node site/build.mjs` hatasız; Archivo bağlantısı ve `#0A0A0C` hiçbir çıktıda kalmaz; gövde metni ≥4,5:1; hareketi azalt koruması `scroll-behavior`'ı da kapsar; 360 px'te yatay kaydırma yok; Google Play CTA hero, paketler ve sayfa sonunda.
- Mağaza, site (blog ve legal dahil), `docs/` ve `pazarlama/` metinleri "hücre", "puan kaybın yarıya iner", "half the points", "LockIn", "indirim hakkın", "tamamlama ödülü" aramalarında 0 sonuç; PAKETLER yalnız faturalandırma canlıyken; uygulama sürümü ve mağaza girişi aynı haftaya denk gelmez.

### F10. Temizlik (1,25 gün; isteğe bağlı TEM-12 +0,75; koşullu F10-2 5,0)

**Amaç:** Klasik skin, `Archivo`, eski token adları kalkar. **Gönderilebilirlik:** Tek başına çıkar. **Bağımlılık:** 1.3.0 üretimde ≥2 hafta sorunsuz.

| ID | Görev | Başlıca dosyalar | Gün | Kaynak |
|---|---|---|---|---|
| F10-1 | Eski token takma adları (`mute, glow, subOn, grid, cell, blue, amber, acc2`) ve `CLASSIC` palet/yarıçap tabloları, `EXPO_PUBLIC_SKIN`, `@expo-google-fonts/archivo`, 16 eski sözlük anahtarı (7.2), `key={theme}` yeniden kurma (bağlam abonesine); `check-theme.mjs` izin listesi boş | `palette.ts`, `theme.ts`, `ui.tsx`, `App.tsx`, `package.json`, `eas.json`, `tr.ts`, `en.ts` | 1,25 | TEM-11, YAY-19 |
| F10-2 (koşullu) | **`engel` birleşimi (yalnız kullanıcı "evet" derse):** `engel`→`main` birleştirme; `Profile.tsx` (275 satırlık fark) ve `Home.tsx` ShieldCard'ı Bahçe token'larıyla yeniden kaplama (Home'da 3 öğeli dock ve sabit Krizdeyim düzenine uyum), `Setup/Plan/server.tsx/nav.ts` (`Scr` birliğine `'shield'`; `screenSelect.ts`'e yeri) çakışma çözümü, `Shield.tsx` token'lara, tr/en sözlükleri, `GECIS-ENVANTERI` satırları; Play Console `VpnService` izin beyanı ve Veri güvenliği formu; "yeni native bağımlılık yok" değişmezine kullanıcı istisnası kaydı; ayrı kapalı test | `apps/mobile/modules/shield/*`, `Shield.tsx`, `useShield.ts`, `Profile.tsx`, `Home.tsx`, `Setup.tsx`, `Plan.tsx`, `server.tsx`, `nav.ts`, `tr.ts`, `en.ts`, `app.json` | 5,0 (tahmin; çekirdek toplama girmez) | REV-9 |

**Kabul ölçütleri:** `grep -rEn "c\.(mute|glow|subOn|grid|cell|blue|amber)\b"` boş; `check-theme.mjs` 0; apps/mobile bağımlılıklarında `archivo` yok ve AAB küçülmüş; tema değişimi yeniden kurma olmadan yazılı alanları korur; kullanılmayan token yok. F10-2 yapılırsa: `Scr` birliği tek yerde, Shield ekranı iki temada kontrast kapısından geçer, kriz regresyonu 14/14, Play VPN beyanı onaylı.

---

## 10. Test ve yayın planı

### 10.1 Test

- **Birim (`vitest`, `npm test`):** `purchase.test.ts` (karakterizasyon + `paidNotConfirmed`/`paidNotUsable`/already owned), `payFlow.test.ts`, `packDay.test.ts` (aksam başlangıcı + sabah kontrolü, 23:59→00:01, DST ve saat dilimi vektörleri), `screenSelect.test.ts` (kriz önceliği, meşgul ekran, `salesQuietUntil`), `bootGuard.test.ts`, `crisis/model.test.ts` (breathPhase, zarf ≤11°, rootWindow), `garden/core.test.ts` (golden, dayStates, yeniden kurulum, 24 saat, completed, 180 gün), `hapticsPolicy.test.ts`, `holdMath.test.ts`, `report.test.ts`, `curves.test.ts`; API tarafı mevcut `apps/api/tests` (play, api, mail, i18n, review, solo, streak, retention, proxy): yeni kriz geri çekme, `dry-run`, `completionDiscountPct` 0, `packCompleted` indirimsiz.
- **Store ölçümü:** `perf.ts` render ve yazım sayacı: 60 sn boşta Home/Crisis/Setup render sayısı ve `AsyncStorage.setItem` sayısı baz çizgi ile kıyaslanır.
- **Betik kapıları:** `yayin-kontrol.mjs`, `copy-check.mjs`, `check-theme.mjs`, `budget.mjs`, `contrast.mjs`, `scan-banned.mjs`.
- **Cihaz matrisi (F0-6 protokolü):** düşük (AVD Android 10-11, 2 GB, 720p; mümkünse gerçek ucuz telefon), orta, güncel x TR/EN x gündüz/gece (`adb shell cmd uimode night yes|no|auto`) x yazı ölçeği 1,0/1,3/2,0 (`font_scale`) x hareketi azalt açık/kapalı; Türkçe karakter ("Çağrı Şişman", "İrem", "ığüşöç ₺"); `wm size 720x1280`; TalkBack (kapı→imza, paywall→satın alma, portal gönderimi). **Ek:** `useFonts` hatası ve uçak modu soğuk açılışı; arka planda öldürme/geri dönme.
- **Ödeme (lisans test hesabı, Play iç test kanalı; `docs/ODEME-REGRESYON.md`):** başarı (Setup ve Plan), iptal, bekleyen (purchaseState 2), ödeme penceresi açıkken uygulamayı öldürme → `recoverPurchases`, ödeme sonrası ağ kesintisi, hesap eşleşmemesi, **already owned**, **ödeme sonrası 409** ("hakkın saklandı" metni, hak tüketilmedi); hiçbirinde ikinci ödeme ve hak kaybı olmaz.
- **Kriz regresyonu (`KRIZ-REGRESYON.md`, her AAB için 14 madde):** (1) Home'dan Krizdeyim 1 dokunuş ve konum/etiket aynı; (2) `POST /pacts/current/crisis` ve 5 bildirim durumu; (3) 15 dk sayaç; (4) kilit; (5) Calm'a geçiş ve geri; (6) imza videosu oynatma; (7) `tel:`; (8) ALO 182 / Yeşilay 115 / 112; (9) Atlattım yalnız kullanıcı onayıyla; (10) uçak modu; (11) açık tema giriş/çıkış; (12) paywall'dan Krizdeyim; **(13) Krizdeyim hedefi `onLayout` ile genişlik ≥ ekran−32 dp ve yükseklik ≥84 dp (≥ bugünkü), yazı ölçeği 1,3 ve 2,0'da da görünür ve ekran dışına itilmez; (14) "Yanlışlıkla bastım" (ilk 120 sn): kilit bırakılır, şahide düzeltme gider, 120 sn sonra görünmez.**
- **Performans:** `dumpsys gfxinfo com.quitvow.app framestats`, `dumpsys meminfo`, `top -H`; senaryolar S1 Ana ekran 90 gün + kapanış, S2 Kriz 60 sn, S3 imza x5, S4 Ana-Profil-Ana x10, S5 Balonlar 60 sn; 60 sn, 3 tekrar, ilk atılır, medyan.

### 10.2 Yayın

- **Sıra:** dahili test ≥48 saat (≥3 cihaz, biri düşük donanım) → F4 ve F7 için ek kapalı test (5-8 gönüllü) ve klinik okuma → üretim. F1/F2/F5/F6/F8/F10 için %20 → %100 (3 gün); F4 ve F7 için %10 (2 gün) → %50 (2 gün) → %100. Bekleme günleri bölüm 9'daki yayın takviminde ayrı satırdır; bayram haftasında büyük sürümün üretim açılışı yapılmaz.
- **Durdurma ölçütleri (öneri, Console'dan teyit):** Android vitals çökme/ANR baz çizgi +%50 göreli ya da Play kötü davranış eşiği; kriz ekranına/aramalara ulaşılamadığı yönünde tek rapor; ödeme akışında hak kaybı bildirimi; "kriz düğmesini bulamadım" yorumlarında yığılma; açılış çökme döngüsü bildirimi.
- **EAS:** tasarım yinelemesi Expo Go/dev sunucuyla; her faz için en çok ~3 yapı (preview, production, 1 yedek), toplam ≈12-15 (tahmin; EAS kuyruğu ve aylık kota bilinmiyor). `allowBackup` ve splash değişiklikleri derleme gerektirir.
- **Play beyanları:** `engel` birleşirse (F10-2) `VpnService` izin beyanı ve inceleme hattı yayın takvimine eklenir; bu plandaki sürümlerde VPN yoktur.
- **Başarı ölçümü (izleme eklemeden):** Play Console (mağaza dönüşümü, yükleme/kaldırma, D1/D7/D30, vitals, ön-başlatma erişilebilirlik) + `/admin/stats` (yeni kullanıcı, ≥2 şahitli pakt oranı, deneme→paket, ilk 7 günde ≥3 kontrol, Play siparişi ↔ `purchases.play_order_id` mutabakatı). Sunucuya `app_version` eklenmez (K22): kohortlar sürüm yayın tarihine göre, sürüm kırılımı Play'den okunur. Örneklem küçük, pazarlama ve mevsim karıştırıcıdır.
- **Sayısal hedefler (TASLAK/hipotez; F0-2 baz çizgisi çıktıktan sonra göreli olarak kesinleşir):**

| Gösterge | Taslak hedef | Kaynak |
|---|---|---|
| Kurulum tamamlama (kapıdan pakt kurulumuna) | baz +%15 göreli (1.1.3 → 1.2.1 arası) | `/admin/stats` |
| ≥2 şahitli pakt oranı | baz +5 puan | `/admin/stats` |
| İlk 7 günde ≥3 kontrol | baz +5 puan | `/admin/stats` |
| Deneme→paket | korunur (baz −%10'dan fazla düşmez); artış hedefi değil | `/admin/stats`, Play siparişi |
| D1 / D7 tutundurma | baz +2 / +1 puan (hipotez) | Play Console |
| Çökme / ANR | baz +%50 üstü yok; açılış çökmesi 0 bildirim | Android vitals |
| Kriz ekranına erişim | düşüş alarmıdır (başarı hedefi değil); düşüş nitel kontrolle yorumlanır | `/admin/stats` (`crisis` olayı sayısı, geri çekilenler düşülür) |

- **Mağaza girişi A/B deneyi:** yalnız ayda birkaç yüz ziyarete ulaşınca, tek değişken (ilk kare başlığı), uygulama güncellemesiyle aynı dönemde değil.

---

## 11. Riskler ve geri dönüş

| Risk | Etki | Önlem | Geri dönüş |
|---|---|---|---|
| Sprite sanatı (el çizimi tutarlılığı, kıvrık yaprak 36 dp'de okunurluğu, ink/wash kayması) en büyük belirsizlik | 1.3.0 gecikir (takvim +2-3 hafta) | F3-5 spike'ı kapı; 1.2.0 sprite'sız (`PlantLite`) çıkar; F5'te `GardenArt` View yedeği | `PlantLite` / "hafif mod"; 5 günlük önek parçaları (BIT-12, +1,5 gün) |
| `renderToHardwareTextureAndroid`/`collapsable` Fabric'te beklendiği gibi davranmaz; 60 fps, düşük RAM'de bellek doğrulanmadı | Janky kare, bellek | A sınıfı cihazda F3-5 ve F7-6 ölçümü; bütçe: ≤70 Image, animasyonlu ≤6 | Segment ön-pişirme; `GRAIN=false`; bulut/esinti kapatma; `QUALITY` bayrakları |
| **Açılışta çökme/OOM döngüsü (70 Image'li Home, yeni yazı tipleri, kapı)** | Kullanıcı uygulamaya (ve Krizdeyim'e) hiç ulaşamaz | Kapı 3 sn zaman aşımı, font yedeği, yerel sağlık işareti → `lite`/`off`, `/health` kalıcı önbellek + varsayılan `lite`, F7 "sprite yüklenemezse Home açılır" testi | Play'de yayını durdur; `ui.plant`; klasik skin derlemesi |
| Native animasyon grafiği (iki sinüs x zarf, pivot, `scaleX` telafisi, `transformOrigin`) cihazda yok | Kriz sallanması yanlış | F3-5 reçete spike'ı | Dakikada bir değişen 3 sabit genlik seviyesi; onay yoksa statik |
| Yarım tema | Kâğıt renkli ama sert köşeli görünüm | Skin bayrağı; envanter "bitti" kapısı; palet ve şekil asla ayrı açılmaz | Bayrağı `klasik` yap, yeniden derle |
| Gece paleti "yosun yeşili kumar çuhası/jackpot" çağrışımı | Klinik/marka | F4-12 yazılı çağrışım ölçütü ve F9 gözden geçirmesi; çuha çok doygun, bu palet düşük doygunluk (HSL ≈%33); 7/8 mağaza karesi açık | `NIGHT.paper` tek değer değişikliği |
| **Ödül anı ve satış anı (lale günü = deneme son günü; paywall meşgul ekranı keser)** | Kumar benzeri "ödül sonrası satış"; güven kaybı | Gecikme/asma/halka/parıltı yok; `salesQuietUntil`; meşgul ekran ertelemesi; deneme uyarısı Home'da | Süreleri uzat; paywall'ı yalnız Paketim'e al |
| Klinik: nefes "tut" evresi, nabız devir sınırı, kriz metni, kriz teması, satış sessizliği süreleri | Panik anında zorlanma | Klinik onay kapısı (F0-9 adı/tarihi, F1, F4, F7); sabitler tek yerde (`BREATH`, `ENVELOPE_STOPS`, `CRISIS_THEME`); onaysızken muhafazakâr varsayılanlar (`hold=0`, `'dark'`, statik kesit) | `hold=0`; nabzı statik halka; `CRISIS_THEME='dark'` |
| **Krizdeyim erişimi (küçülme, dock'a sıkışma, yanlışlıkla basma)** | Panik anında hedef kaçar; yanlış basan 15 dk çıkamaz ve şahide anında e-posta gider | Krizdeyim tam genişlik ≥84 dp sabit; `onLayout` kabulü (regresyon 13); "yanlışlıkla bastım" geri çekme ucu F1-20'de Home değişmeden önce; kilit girişte söylenir | Dock'u tek satıra indir; geri çekme penceresini uzat |
| **Satın alma kodu kırılganlığı (already owned, çağrı noktası yan etkisi, ödeme sonrası 409)** | Para alınıp pakt kurulmaz; hak kaybı, itibar | Karakterizasyon testleri (F0-4) → `withPack` içi kurtarma + `payFlow.ts` + `dry-run` + "hakkın saklandı" (F1-21); `Setup`/`Plan` çağrı noktası listesi | Play'de yayını durdur; `recoverPurchases` ile hak geri verilir; destek/iade |
| **Store yazma fırtınası (her 30 sn tüm state yazımı ve yeniden çizim)** | Düşük donanımda jank, pil, yeni alanlarla büyür | F1-16 sığ eşitlik + debounce + seçici; render/yazım sayacı kabulü | Debounce süresini uzat; alan bölme |
| **Gün tanımı kayması (24 sa vs takvim günü)** | Yaprak durumu ve `done` ayrışır; aksam başlayanda yanlış `rest` | K23 tek `packDay.ts`, test vektörleri; sunucu tamamlama anı değişmez | Eski 24 sa kuralına dön (tek dosya) |
| **Gizlilik vaadi (yedekleme)** | "Yalnızca telefonunda" iddiası yanlış çıkar | `allowBackup:false` + doğrulama (F1-19); ölçülebilir cümle; taslak TTL | Cümleyi "yedeklenebilir" olarak düzelt; neden/mektubu taslağa yazma |
| **Şahit penceresi ifşası** | Şahide kaçırılan/tekrar oynanan gün görünür (utandırma) | Pencere yalnız `day` + lale; `/guardian/me` değişmez; `rest/curl` paylaşılan yüzeyde yok | Pencereyi kes (F8 kesilebilir) |
| Ortak dosya çakışmaları (`App.tsx`, `ui.tsx`, `motion.tsx`, `tr.ts`/`en.ts`, `Setup.tsx`) ve satır sonu karmaşası | Birleştirme acısı | F0-1 normalize; küçük commit'ler; Setup dokunuş sırası (F2 başlığı) | — |
| **`engel` dalı (VPN/DNS filtresi, Kotlin modülü, `BIND_VPN_SERVICE`) `Profile/Home/Setup/Plan/server/nav` ile çakışır** | Birleşince her AAB VPN servisi taşır; "yeni native bağımlılık yok" değişmezi bozulur; Play VPN beyanı gerekir; token'sız ekran | K27: donuk dal, F0-8 maliyet kaydı, F10-2 (koşullu 5,0 gün); `Shield.tsx` birleşirken token'larla yazılır | `engel` hiç birleşmez; ayrı depoda yaşar |
| Satır içi metin kısaltması anlam/güven kaybı; etki analitiksiz kör | Dönüşüm düşer | Katlanır kutu açılabilir; kaynak dürüst; Play + sunucu kohortları (taslak hedefler 10.2) | Katlı metni açık varsayılan yap |
| Vaat–davranış uyumsuzluğu (puan, indirim, "istediğin an çekilebilir") | Politika ret / güven | `copy-check` yasak sözcük; F2-7 sunucu/mail/belge; F9-4 blog/legal/docs/pazarlama taraması | — |
| Paket adı değişimi (Filiz/Fidan/Ağaç) mevcut kullanıcıyı karıştırır; Play başlıkları uyuşmaz | Tutarsız ödeme penceresi | F5-4'te aynı gün Console + mağaza + uygulama; Paketim'de bir kez açıklama | Eski adlara dön (sözlük) |
| Splash/ikon/pencere zemini (gece klavye parlaması, expo-system-ui yok) | İlk izlenim | F4-12'de cihaz doğrulaması | Karar kaydı + risk kabulü |
| **Takvim: çekirdek 146,65 gün; tatiller; 1.1.3'ün 22 Aralık sınırına sığmaması** | Gecikme; kriz/ödeme düzeltmeleri Ocak'a kayar | Kritik dilim 1.1.2 olarak önce çıkar (≈7-10 Aralık); F3 dondurmada; tatiller ve bekleme günleri takvim satırı; x1,3 sütunu | Kapsam kes (aşağıdaki sıra) |
| Dondurma penceresi (yılbaşı dürtü yoğunluğu, tahmin) | 1.1.x ve 1.2.0 | Kritik dilim pencereden önce %100; pencerede yalnız iç faz | Ertele |

**Kapsam kesme sırası (en önce kesilen):** F1 ertelenebilir dilim parçaları (F1-10, F1-4, F1-5, F1-13 parçaları → 1.1.3'e kayar) → F8 portal/imza görseli → F6 cilası (F6-5, F6-6) → F9 site (F9-3, F9-4) → F5 (SeedPacket görselleri) → F7-5 kriz kesiti (kriz F4-8 diskli sürümle kalır). **Kesilmez:** F0, F1 kritik dilimi (K), F2-2/F2-4/F2-7, F4, F7-1..4 ve F7-7.

**Geri dönüş katmanları:** (1) Play'de yayını durdur (eski sürüm geri alınmaz; yeni `versionCode` ile yeniden yükle); (2) `EXPO_PUBLIC_SKIN=klasik` ile yeniden derle (prova F7-7); (3) `/health` `ui.plant` = `lite`/`off` (kalıcı önbellekli, oturum ortasında değişmez); (4) yerel sağlık işareti: ardışık açılış ölümünde `lite`/`off`; (5) `GRAIN`, `QUALITY` bayrakları; (6) `v1.1.2` ve `v1.1.3` etiketleri (görünümü aynı güvenli sürümler); (7) sunucu tarafı (mail, `completionDiscountPct`) Railway'den anında geri alınır.

---

## 12. Açık sorular (kullanıcıya)

Cevap gelmezse uygulanacak varsayılan sağdadır. **Onay gerektiren riskli seçeneklerde varsayılan muhafazakârdır** (S6, S7, S9, S12).

| # | Soru | Varsayılan |
|---|---|---|
| S1 | Puan arayüzden ve vaatlerden kalkıyor; `store.points` ve +5/+10/+3/−25/−50 yazımları silinsin mi, gizli iç sayaç mı kalsın? | UI 1.1.2'de, yazımlar 1.2.2'de silinir; alan kalır |
| S2 | Para tahmini (`home.saved`, `done.money`) Ana ekran ve Gün tamam'dan çıkıyor; Profil ve Kurulum 2'deki "Aylık tahmin" alanı kalsın mı? | Alan kalır, kısa notla |
| S3 | Tamamlama indirimi: Play promosyon koduyla gerçekten uygulanacak mı? | Vaat kalkar; `completionDiscountPct` 0; `nextPackDiscount` API alanı kalır (F2-7) |
| S4 | "Şimdi değil" sonrası günlük kontrol/ilerleme paywall arkasında mı kalsın? (Klinik yargıç reddediyor; değiştirmek için sunucuda tamamlanmış pakt için serbest kontrol ucu gerekir.) | Bu planda dokunulmaz; paywall durumu dürüstçe yazar |
| S5 | Şahit kabulden sonra ayrılabilsin mi (yeni `POST /guardian/leave`) yoksa davet/site metinleri gerçeğe mi çekilsin? | Metinler gerçeğe çekilir ("Kabulden önce reddedebilirsin") |
| S6 | `hideHabit` varsayılanı "gizli" (neyi bıraktığımı gösterme) kabul mü? | **Yanıt gelene dek bugünkü varsayılan (`store.tsx` `hideHabit: false`) korunur**; "gizli" kullanıcı onayıyla |
| S7 | Kriz nefesinde "tut" evresi kalsın mı (4-4-6) yoksa 4 al / 6 ver mi? Klinik danışman kim, ne zaman onaylayacak? | **Onay yoksa 4 al / 6 ver (`hold=0`)**; danışman adı ve tarih F0-9 kapısında; onay gelirse 4-4-6 tek satır |
| S8 | Bugünün tomurcuğu için 6 devir/3,6 sn sınırı yeterli mi, yoksa tamamen statik halka mı? | 6 devir |
| S9 | Kriz teması: kullanıcının temasını izlesin mi (`'follow'`) yoksa sabit gece mi (`'dark'`)? | **Yazılı klinik onay yoksa `'dark'`**; onay gelirse `'follow'` (1.2.0'dan); 1.1.x mevcut davranış |
| S10 | "Krizdeyim" etiketi panik anında tanınırlık için "Zor bir an" ile denensin mi? | "Krizdeyim" korunur |
| S11 | Satış sessizliği süreleri (kriz sonrası 30 dk, tekrar oynama/lale günü sonrası 24 sa) klinik danışmanla doğrulansın mı? | 30 dk ve 24 sa uygulanır; danışman süreleri değiştirebilir; "Şimdi değil" sonrası 3 gün sessizlik bu planda yok |
| S12 | "Yanlışlıkla bastım" düzeltme akışı v1'e alınsın mı? | **Evet, F1-20'de (kritik dilim)**: yalnız ilk 120 sn, sunucuda geri çekme kaydı + şahide düzeltme maili, olay silinmez |
| S13 | Haptik varsayılan açık mı (tick, settle, imza 2 çağrı)? | Açık, Profil'de kapatılır |
| S14 | Uygulama içi "Hareketi azalt" anahtarı (sistem ayarına ek) istenen davranış mı? | Var (F1-2) |
| S15 | Ana ekranda neden etiketi ("kızım için") omuz üstünden görülebilir; varsayılan görünür mü, Profil'de kapatılabilir mi? | Görünür; Profil'de kapatma yok |
| S16 | 180 günlük paket satışta olacak mı? | Hayır (mobil 7/30/60/90) |
| S17 | Fidan/Ağaç dal düzeni (gövde + sol dal + sağ dal) tasarımcı tarafından onaylı mı? | Bu plandaki yorum; F8-2'de ayarlanır |
| S18 | A sınıfı (2 GB RAM, 720p) gerçek Android cihaz var mı? | Yoksa AVD + Play ön-başlatma raporu; eşikler **uyarı kapısı**, sürüm notuna "düşük donanım doğrulanmadı" yazılır |
| S19 | Kaçırılan gün ve tutulan yüksek dürtülü gün nasıl çizilsin? | **`rest` tam yaprak + yalnız kendi ekranında ince kurşun nokta; soluk yaprak yok**; `curl` yalnız kendi ekranında; şahit penceresi ve paylaşılan yüzeylerde ikisi de görünmez; yüksek dürtülü gün işaret almaz |
| S20 | İkon yönü (kemer + filiz, hardal tomurcuk) onaylı mı; kilit çağrışımı sürerse yedek yalnız saksıda filiz | Kemer + filiz |
| S21 | Mağaza ilk kare başlığı "Bahsi bırak. Her gün bir yaprak." mı kalsın; EN seti kapsamda mı? | Bu başlık; EN seti dahil (+0,75 gün) |
| S22 | Fraunces SOFT=100 özel TTF'yi kim üretir (fonttools, Python 3.14 ve brotli makinede kurulu)? Site Google Fonts mu kalsın, self-host mu? | Geliştirici üretir; site Google Fonts (self-host sonraki adım) |
| S23 | KVKK onayı ve şahit bildirimi iki ayrı onaya bölünsün mü (hukuk kararı)? Bugünkü `setup.consent` tek dizede ikisini taşıyor. | Bölünür: `setup.consent` KVKK metni aynen, yeni `setup.guardianNotice`; iki metin hukuka sunulur |
| S24 | İçeriksiz anonim adım sayacı (AKI-21) ve günlük yerel hatırlatma (AKI-20 derin bağlantı) gizlilik politikasına eklenerek yapılsın mı? | Yapılmaz (koşullu) |
| S25 | `engel` dalı (VPN/DNS) hangi sırayla birleşecek; takvimi nedir? | **Donuk; F10-2'de (koşullu, 5,0 gün) birleşir**; "şimdi birleştir" derseniz F0'a 3-5 gün eklenir; Play VPN beyanı ve "yeni native bağımlılık yok" istisnası gerekir |
| S26 | Netlify ve Railway hangi dalı yayınlıyor? (blog, `netlify.toml`, `mailHtml.ts` yalnız `odeme`'de.) | F0-1'de panelden doğrulanır |
| S27 | Kayıtlı `theme:'dark'` kullanıcılarının `'system'`e taşınması kabul mü? | Kabul; sürüm notunda tek cümle |
| S28 | Sunucudan check-in günlerini geri getirme (BIT-13, +1 gün) bu sürüme alınsın mı? | Alınmaz; `historyFloor` yeterli |
| S29 | Dondurma penceresi 23 Aralık - 3 Ocak onaylı mı? | Onaylı; F3 (iç faz) pencerede yürür |
| S30 | `setup.guardiansSrc` için gerçek, doğrulanmış atıf var mı? | Satır gizli kalır |
| S31 | `android.allowBackup:false` kabul mü? Yeni telefona geçişte yerel neden/mektup/imza videosu taşınmaz (hesapla girişte pakt geri gelir, yerel notlar yeniden yazılır). | Kabul; sürüm notunda tek cümle |

---

## 13. İlk hafta için somut yapılacaklar (26-30 Ekim 2026; 3,5 iş günü)

28 Ekim öğleden sonra ve 29 Ekim Perşembe Cumhuriyet Bayramı tatili: hafta Pazartesi, Salı, Çarşamba (yarım gün) ve Cuma'dan oluşur. F0'ın kalanı 2-11 Kasım'a sarkar (F0 toplam 10,75 gün, 11 Kasım).

**Pazartesi 26 Ekim (F0-1, F0-8, F0-9 başlangıcı)**
1. `git status` temiz doğrulaması; kökte `.gitattributes` (`* text=auto eol=lf`, `*.bat text eol=crlf`), `git add --renormalize .`, tek "Satır sonlarını normalleştir" commit'i; ayrı çalışma kopyasında `engel`'e `git merge -X renormalize` denemesi; `App.tsx` ve `Profile.tsx` farkının küçüldüğünü doğrula.
2. `git diff --stat odeme..engel -- apps/mobile` çıktısını `docs/GECIS-ENVANTERI.md`'ye yaz (F0-8); `engel` donuk kararını kayda geçir.
3. Netlify ve Railway panellerinde üretim dalını oku; sonucu tek paragrafla yaz (S26). 1.1.1'in Play durumunu kontrol et; onaylandıysa `odeme`→`main` ff-only ve `v1.1.1` etiketi.
4. Kullanıcıdan karar iste: S18 (cihaz), **S7/S9 için klinik danışman adı ve görüşme tarihi (F0-9)**, S1/S3/S4/S6, S12, S20, S25, S31.

**Salı 27 Ekim (F0-2)**
5. A sınıfı AVD'yi kur (Android 10-11, 2 GB, 720p) ve gerçek cihaz varsa kaydını yaz; `eas.json`'a `perf` profili (preview'dan türet, `EXPO_PUBLIC_PERF=1`); `apps/mobile/src/motion/perf.ts` (rAF farkları, kriz `markTap/markShown`, **render ve `AsyncStorage.setItem` sayacı**) ve `scripts/olcum/` adb betiği iskeleti.

**Çarşamba 28 Ekim, yarım gün**
6. 1.1.1'den `eas build --profile perf` başlat (kuyrukta beklerken `perf.ts` ve betiği tamamla).

**Perşembe 29 Ekim: tatil, çalışma yok.**

**Cuma 30 Ekim (F0-2 ölçümleri)**
7. S1-S5 senaryoları (Ana ekran 90 gün, Kriz 60 sn, imza x5, Ana-Profil-Ana x10, Balonlar 60 sn); kriz dokunuş→süre en az 20 tekrar; 60 sn boşta Home/Crisis/Setup render ve disk yazımı sayıları; 26 "önce" ekran görüntüsü; Play Console ve `/admin/stats` anlık görüntüsü; hepsini `docs/YAYIN-OLCUM.md`'e. Ölçüm tamamlanamazsa Pazartesi 2 Kasım sabahı biter.
8. Hafta kapısı (15 dk): baz çizgi tablosu ne kadar dolu, açık kararlar (S18, klinik danışman, S25) kime sorulmuş; 2 Kasım için F0-3 (kapı betikleri, `vitest`) dalı açıldı mı.

**Sonraki hafta (2-6 Kasım, F0-3, F0-4, F0-5 başlangıcı):** `yayin-kontrol.mjs` ve `copy-check.mjs` (kurulum 920/1165 kalibrasyonu, 4 ölü anahtar), `vitest` devDependency ve betikler; `purchase.test.ts` karakterizasyonu (`purchase.ts` değişmez) ve `docs/ODEME-REGRESYON.md` çağrı noktası listesi; `screenSelect.ts` çıkarımı ve kriz önceliği + meşgul-ekran testleri; `docs/KRIZ-REGRESYON.md` 14 madde taslağı; F3-5 spike'ına hazırlık için `tools/garden` iskeleti 1.1.1 Play beklemeleri sırasında.

**İlk hafta sonu çıktısı:** `main` temiz ve etiketli (ya da Play onayı bekleniyor kaydı); `docs/YAYIN-OLCUM.md` baz çizgi (kısmen Pazartesi'ye sarkabilir); `engel` kararı ve klinik danışman kaydı yazılı; kullanıcı kararları (S18 başta) alınmış veya muhafazakâr varsayılanlarla kayıtlı.
