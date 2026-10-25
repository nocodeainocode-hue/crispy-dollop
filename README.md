# QuitVow

Kumarı bırakmak isteyenler için taahhüt uygulaması: vasiler (iki anahtar), imza videosu, mücadele paketleri (7/30/60/90 gün), kriz modu.

| Klasör | İçerik |
|---|---|
| `apps/mobile` | Expo (React Native) uygulaması: kullanıcı modu + Vasi modu. **Android öncelikli.** |
| `apps/api` | Node + TypeScript + Express + Postgres (Supabase; yerelde gömülü Postgres/PGlite). Testler: `npm test` |
| `apps/web` | Yalnızca **admin paneli** (React + Vite). |
| `docs/MONETIZATION.md` | Gelir modeli taslağı |

## Çalıştırma

**Tek tık:** `baslat.bat` (API + admin paneli + Expo'yu üç pencerede açar). Aşağıdaki adımlar elle yapmak içindir.

```bash
# 1) API (http://localhost:4000)
cd apps/api && npm install && ADMIN_PASSWORD=bir-sifre npm start
# 2) Admin paneli (http://localhost:5173/)
cd apps/web && npm install && npm run dev
# 3) Mobil
cd apps/mobile && npm install && npx expo start
```

- **Android telefon (Expo Go):** `apps/mobile/.env` içine `EXPO_PUBLIC_API_URL=http://<bilgisayarın-LAN-IP'si>:4000` yaz. Emülatörde varsayılan `10.0.2.2:4000` çalışır. Video kaydı **gerçek cihaz** ister.
- **E-posta:** `SMTP_URL` yoksa mailler gönderilmez, yalnızca admin panelindeki "E-posta kutusu"nda görünür (geliştirme modu). Giriş kodu ve vasi davet kodları orada okunur.
- Üretimde `JWT_SECRET`, `ADMIN_PASSWORD`, `SMTP_URL`, `APP_URL`, `CORS_ORIGINS` ve `ffprobe` (video süresini doğrulamak için) gerekir.
- Web'de mobil uygulama sınırlıdır (kamera yok); geliştirme testi için video dosyası seçme yedeği vardır.

## v2'ye bırakılanlar
- ~~Android bahis engeli~~ **1.3.0 ile geldi:** `apps/mobile/modules/shield` (Kotlin, telefon içi VPN ile DNS filtresi; ön plan servisi). Kural ve liste `apps/api/shield` (`node scripts/shield-list.mjs` ile yenilenir). Expo Go'da modül yoktur, uygulama engelsiz çalışır (`shield: unknown`); gerçek deneme için geliştirme derlemesi: `npm run android:dev`. Play Console `VpnService` beyanı: `store/PLAY-VPN-BEYANI.md`.
- Push bildirimleri (şimdilik e-posta).
- Paket satışı (Google Play Billing) ve tamamlama ödülü: henüz yok; şu an paketler ücretsiz/demo. Para tutma (eski "Söz Kasası") fikri kaldırıldı.
- Google Play yayını, sürüm imzalama.

## Supabase'e bağlanma

API iki modda çalışır; `GET /health` hangisinde olduğunu gösterir:

| Mod | Ne zaman | `/health` |
|---|---|---|
| Yerel (varsayılan) | `DATABASE_URL` boş | `"db":"pglite"` |
| Supabase | `DATABASE_URL` dolu | `"db":"pg"` |

1. Supabase panelinde **Connect → Session pooler** bağlantı adresini kopyala (IPv4 uyumlu; "Direct connection" çoğu ev ağında çalışmaz).
2. `apps/api/.env` dosyasında `DATABASE_URL=` satırına yapıştır, `[YOUR-PASSWORD]` yerine veritabanı şifreni yaz.
3. API'yi yeniden başlat. Tablolar otomatik oluşur (`AUTO_MIGRATE=false` ile kapatılır). İmza videoları sunucuya hiç yüklenmez, yalnızca kullanıcının telefonunda durur; Supabase Storage ve `service_role` anahtarı gerekmez.

Güvenlik notları:
- Tablolarda **RLS açık ve politika yok**: `anon`/`authenticated` anahtarlarıyla hiçbir veriye erişilemez. Veriye yalnızca bu API (doğrudan Postgres bağlantısı) erişir. Mobil uygulama ve web **anon anahtarını kullanmaz**.
- Veritabanı şifresi **yalnızca sunucuda**, `.env` içinde durur. Sohbete, koda ya da mobil uygulamaya koyma.
- Bağlantı TLS ile yapılır; sertifika doğrulaması varsayılan olarak kapalıdır (pooler zinciri nedeniyle). Daha sıkı olması için Supabase CA sertifikasını `DATABASE_CA` ortam değişkenine ver.
