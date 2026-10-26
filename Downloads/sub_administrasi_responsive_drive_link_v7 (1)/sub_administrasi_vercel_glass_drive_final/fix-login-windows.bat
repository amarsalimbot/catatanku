@echo off
setlocal
cd /d "%~dp0"
echo Memperbaiki konfigurasi login...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\fix-login-env.ps1"
if %ERRORLEVEL% NEQ 0 (
  echo Gagal memperbaiki login env.
  exit /b %ERRORLEVEL%
)
echo.
echo Selesai. Tutup server lama, lalu jalankan:
echo npm run dev
echo.
pause
