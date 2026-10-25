# store-capture: Play mağaza ekran görüntüleri

Gerçek uygulamayı web'de (Chrome, 360x640 @3x = 1080x1920) çeker; `compose.mjs` Türkçe başlıklı Bahçe temalı posteri basar.
Çıktı: `store/play/telefon/01…08-*.png` (1080x1920, alfasız PNG). Kare metinleri `captions.json`'da.

> **Yayın zamanı:** bu kareler yeni Bahçe temasını gösterir. Play Console'a yeni tema (1.2.0) canlıya çıkınca yükle; eski temalı sürüm yayındayken yükleme (mağaza görseli uygulamayı yansıtmalı). Eski set `store/play/telefon-eski/`.

## Önkoşul
1. `npm install` (bu klasörde; Chrome sistemde kurulu olmalı, tarayıcı indirilmez).
2. Expo web: `apps/mobile` içinde `npx expo start --web --port 8099`.
3. Yerel API (demo, bellek içi veritabanı; gerçek veritabanına bağlanmaz): `apps/api` içinde
   `DATABASE_URL="" RESEND_API_KEY="" SMTP_URL="" GOOGLE_SERVICE_ACCOUNT_JSON="" GOOGLE_SERVICE_ACCOUNT_FILE="" PORT=4000 npm start > <günlük dosyası> 2>&1`
   Giriş ve davet kodları API'nin konsol günlüğünden okunur; günlük yolu `API_LOG` ortam değişkeniyle verilir (varsayılan `C:/Users/eyupd/AppData/Local/Temp/api-dev2.log`).

## Kullanım
```
npm run capture   # setup-flow -> guardian -> frames: ham kareler raw/ içine (raw/ git'e girmez)
npm run compose   # poster: store/play/telefon/*.png   (örn. node compose.mjs 3 5 yalnız 3. ve 5. kare)
npm run check     # kabul ölçütleri: boyut, alfa, <=15 kelime, yasaklı sözcükler, 1 koyu kare
```
Çekim, `/health` cevabını "canlı faturalama" olarak yeniden yazar (demo notu çıkmasın); pakt gününü yalnızca çekim bağlamında geriye alır. Uygulama koduna dokunmaz.
