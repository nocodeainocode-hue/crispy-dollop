@echo off
REM QuitVow admin paneli: bilgisayarda açılır, CANLI sunucuya (api.quitvow.com.tr) bağlanır.
REM Railway > Variables > CORS_ORIGINS içinde http://localhost:5173 olmalı.
start "" http://localhost:5173
cd /d %~dp0apps\web && npm run dev:canli
