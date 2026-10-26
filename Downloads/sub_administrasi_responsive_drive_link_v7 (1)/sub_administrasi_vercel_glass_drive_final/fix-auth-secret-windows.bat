@echo off
setlocal
cd /d "%~dp0"
echo Membuat AUTH_SECRET valid di .env.local ...
node scripts\fix-auth-secret.js
if errorlevel 1 (
  echo Gagal membuat AUTH_SECRET. Pastikan Node.js sudah terinstall.
  pause
  exit /b 1
)
echo.
echo Selesai. Jalankan: npm run dev
echo.
pause
