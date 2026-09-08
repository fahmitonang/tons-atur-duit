@echo off
title TON's Budget Tracker
color 0A

echo ===================================================
echo           TON'S BUDGET TRACKER (Windows)
echo ===================================================
echo.

:: Pindah ke direktori script
cd /d "%~dp0"

:: 1. Cek keberadaan file .env
if not exist ".env" (
    echo [!] File .env tidak ditemukan!
    if exist ".env.production.example" (
        echo [*] Membuat .env dari .env.production.example...
        copy .env.production.example .env
        echo [!] Silakan sesuaikan DATABASE_URL di file .env jika perlu.
    ) else (
        echo [X] Silakan buat file .env terlebih dahulu.
        pause
        exit /b 1
    )
)

:: 2. Cek node_modules
if not exist "node_modules\" (
    echo [*] Folder node_modules belum ada. Menjalankan npm install...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [X] Gagal menjalankan npm install!
        pause
        exit /b 1
    )
)

:: 3. Generate Prisma Client
echo [*] Memperbarui Prisma Client...
call npx prisma generate
if %ERRORLEVEL% neq 0 (
    echo [!] Peringatan: Gagal generate Prisma Client. Memeriksa koneksi/konfigurasi...
)

echo.
echo ===================================================
echo   Aplikasi akan dijalankan di http://localhost:3000
echo   Tekan Ctrl+C di terminal ini untuk mematikan app.
echo ===================================================
echo.

:: Buka browser secara otomatis di background setelah jeda 3 detik
start "" cmd /c "timeout /t 3 >nul && start http://localhost:3000"

:: Jalankan server Next.js development
call npm run dev

pause
