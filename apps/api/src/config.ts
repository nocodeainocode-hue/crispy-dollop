const prod = process.env.NODE_ENV === 'production';
const need = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`${k} zorunlu (production)`); return v; };

export const config = {
  prod,
  port: Number(process.env.PORT ?? 4000),
  // Önünde kaç ters vekil (nginx/Caddy/Railway) var: hız sınırı gerçek istemci IP'sini görsün diye. Üretimde varsayılan 1.
  trustProxy: Number(process.env.TRUST_PROXY ?? (prod ? 1 : 0)),
  // Veritabanı: DATABASE_URL varsa Supabase/Postgres; yoksa gömülü Postgres (PGlite) → ./data/pglite
  databaseUrl: process.env.DATABASE_URL,
  pgliteDir: process.env.PGLITE_DIR ?? './data/pglite',
  // Production'da zorunlu. Dev'de sabit: API yeniden başlayınca açık oturumlar düşmesin (yalnızca yerel geliştirme için)
  jwtSecret: prod ? need('JWT_SECRET') : process.env.JWT_SECRET ?? 'quitvow-dev-secret-yalnizca-yerel-gelistirme',
  webUrl: process.env.WEB_URL ?? 'http://localhost:5173',
  appUrl: process.env.APP_URL ?? 'https://play.google.com/store/apps/details?id=com.quitvow.app',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:8081,http://localhost:8099').split(','),
  resendApiKey: process.env.RESEND_API_KEY, // varsa mailler Resend HTTPS API ile gider (SMTP'den önce gelir)
  smtpUrl: process.env.SMTP_URL, // örn. smtps://user:pass@smtp.example.com — yoksa mailler yalnızca outbox'a yazılır
  mailFrom: process.env.MAIL_FROM ?? 'QuitVow <no-reply@quitvow.local>',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@quitvow.local',
  adminPassword: process.env.ADMIN_PASSWORD, // yoksa ilk açılışta rastgele üretilip loglanır
  // Sabit kurallar
  // Satın alma: Google Play doğrulaması bağlanana kadar üretim DIŞINDA paket otomatik "demo" olarak verilir; üretimde varsayılan kapalı.
  demoPurchases: process.env.DEMO_PURCHASES ? process.env.DEMO_PURCHASES === 'true' : !prod,
  // Google Play doğrulaması: servis hesabı JSON dosyası (yol) veya içeriği. Yoksa /purchases/play kapalıdır (501).
  googlePackage: process.env.GOOGLE_PLAY_PACKAGE ?? 'com.quitvow.app',
  googleServiceAccountFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  requiredKeys: 2,
  unlockWaitMs: 72 * 3600 * 1000,
  // Kabul etmiş vasi yoksa (vasisiz başlayan ya da davetler henüz kabul edilmedi) anahtarın yerini daha uzun bekleme tutar
  soloUnlockWaitMs: 7 * 24 * 3600 * 1000,
  // Paketi sonuna kadar götürene (arada tekrar oynamış olsa bile) bir sonraki pakette indirim
  completionDiscountPct: 40,
};
export type Config = typeof config;
