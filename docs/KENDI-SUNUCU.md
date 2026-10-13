# API'yi kendi sunucunda çalıştırma

API sürekli açık duran bir Node.js sürecidir. Arka planda zamanlanmış işler çalıştırır: şahit sinyal kontrolü 15 dakikada bir, haftalık iyi haber maili saatte bir kontrol edilir. Bu yüzden "istek gelince uyanan" paylaşımlı hosting (cPanel'in Node.js uygulaması gibi) **uygun değildir**. SSH ile girilen bir Linux sunucu (VPS) gerekir.

Veritabanı Supabase'de kalır; sunucuda veri tutulmaz. İmza videoları zaten kullanıcının telefonunda durur.

## Gereksinimler

- Ubuntu 22.04/24.04 (ya da benzeri), SSH erişimi
- Node.js 22+
- Boş RAM: ~150 MB, disk: ~300 MB (node_modules dahil)
- 80/443 portları (HTTPS için) ve dışarıya SMTP (Resend: 465)

## 1) DNS

Alan adı panelinde: `api.quitvow.com.tr` → **A kaydı** → sunucunun IP'si.

## 2) Ayrı kullanıcı (diğer sitelerden yalıtım)

Sunucuda başka siteler (firma rehberleri vb.) varsa API'yi ayrı bir Linux kullanıcısıyla çalıştır. Biri ele geçirilirse diğerinin `.env` dosyasını okuyamaz.

```bash
sudo adduser --system --group --home /opt/quitvow quitvow
```

## 3) Node.js ve kod

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo -u quitvow git clone https://github.com/nocodeainocode-hue/crispy-dollop.git /opt/quitvow/app
cd /opt/quitvow/app/apps/api
sudo -u quitvow npm ci          # --omit=dev KULLANMA: başlatıcı (tsx) geliştirme bağımlılığında
```

## 4) Ortam değişkenleri

```bash
sudo -u quitvow cp .env.example .env
sudo -u quitvow nano .env       # DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD, SMTP_URL, MAIL_FROM, CORS_ORIGINS…
sudo chmod 600 .env
```

`JWT_SECRET` için: `openssl rand -hex 32`. `TRUST_PROXY=1` kalmalı (önünde nginx/Caddy var).

## 5) Sürekli çalışsın: systemd

`/etc/systemd/system/quitvow-api.service`:

```ini
[Unit]
Description=QuitVow API
After=network-online.target

[Service]
User=quitvow
WorkingDirectory=/opt/quitvow/app/apps/api
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
MemoryMax=400M
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/quitvow
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now quitvow-api
sudo journalctl -u quitvow-api -f     # loglar
curl http://127.0.0.1:4000/health     # {"ok":true,"db":"pg",...}
```

## 6) HTTPS: ters vekil

API yalnızca `127.0.0.1:4000`'de dinler. Dışarıya HTTPS ile açan bir ters vekil gerekir.

**Sunucuda zaten nginx varsa** (diğer siteler için), yeni bir site ekle: `/etc/nginx/sites-available/api.quitvow.com.tr`

```nginx
server {
  server_name api.quitvow.com.tr;
  client_max_body_size 1m;
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api.quitvow.com.tr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.quitvow.com.tr      # ücretsiz sertifika, kendiliğinden yenilenir
```

**Sunucu boşsa** Caddy daha kolaydır (sertifikayı kendisi alır):

```
api.quitvow.com.tr {
  reverse_proxy 127.0.0.1:4000
}
```

## 7) Güvenlik duvarı

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable
```

4000 portunu dışarıya **açma**.

## 8) Güncelleme

```bash
cd /opt/quitvow/app && sudo -u quitvow git pull
cd apps/api && sudo -u quitvow npm ci
sudo systemctl restart quitvow-api
```

## 9) Mobil uygulamayı bağlama

Üretim derlemesinde `EXPO_PUBLIC_API_URL=https://api.quitvow.com.tr`.

## Kontrol listesi

- [ ] `https://api.quitvow.com.tr/health` → `"db":"pg"`
- [ ] Giriş kodu maili geliyor (SMTP)
- [ ] `journalctl` içinde hata yok
- [ ] `.env` izinleri 600, sahibi `quitvow`
