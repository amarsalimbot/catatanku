@echo off
setlocal

echo Membersihkan cache npm...
npm cache clean --force

echo Menghapus node_modules dan package-lock lama jika ada...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json

if not exist .env.local (
  copy .env.example .env.local >nul
  echo .env.local dibuat dari .env.example
)

echo Memakai registry publik npm...
npm config set registry https://registry.npmjs.org/

echo Install dependency...
npm install --registry=https://registry.npmjs.org/ --no-audit --no-fund

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Install gagal. Coba update Node.js ke versi LTS terbaru lalu jalankan ulang file ini.
  exit /b %ERRORLEVEL%
)

echo.
echo Selesai. Jalankan: npm run dev
echo Jika login tetap salah, jalankan: fix-login-windows.bat
endlocal
