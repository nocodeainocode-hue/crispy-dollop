@echo off
REM QuitVow: tek tikla gelistirme ortami (API + admin paneli + mobil/Expo)
start "QuitVow API" cmd /k "cd /d %~dp0apps\api && set ADMIN_PASSWORD=dev-admin-pass&& npm start"
start "QuitVow Admin" cmd /k "cd /d %~dp0apps\web && npm run dev"
start "QuitVow Mobil (QR burada)" cmd /k "cd /d %~dp0apps\mobile && npx expo start --lan"
echo.
echo API:   http://localhost:4000
echo Admin: http://localhost:5173   (admin@quitvow.local / dev-admin-pass)
echo Mobil: "QuitVow Mobil" penceresindeki QR kodunu Expo Go ile okut.
timeout /t 5 >nul
