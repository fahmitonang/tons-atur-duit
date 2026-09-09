# Atur Duit 💰

Aplikasi web modern untuk pencatatan keuangan pribadi, kontrol anggaran (*budgeting*), multi-dompet (*multi-wallet*), dan pelacakan target tabungan (*savings goals*).

---

## ✨ Fitur Utama

- **Dashboard Keuangan Komprehensif**: Ringkasan saldo total, total pemasukan, total pengeluaran, dan sisa budget bulanan.
- **Multi-Dompet (Accounts)**: Kelola berbagai akun/dompet seperti Tunai (Cash), Rekening Bank, dan E-Wallet dengan pelacakan saldo otomatis.
- **Transfer Antar-Dompet**: Catat perpindahan dana antar-akun dengan penyesuaian saldo instan.
- **Budgeting Bulanan**: Atur batas anggaran per kategori pengeluaran dan pantau pemakaian secara *real-time*.
- **Siklus Gajian (Payday Cutoff)**: Pengaturan tanggal awal periode keuangan bulanan sesuai siklus gajian pribadi (misal tanggal 25 atau tanggal 1).
- **Target Tabungan (Savings Goals)**: Buat pos impian tabungan dengan pencatatan setor/tarik dan visualisasi persentase progres.
- **Riwayat Transaksi & Filter Interaktif**: Filter berdasarkan rentang tanggal, kategori, dan dompet.
- **Ekspor Data CSV**: Unduh laporan transaksi keuangan kapan saja ke format CSV.
- **Proteksi Anti-Bot & Keamanan Registrasi**: Dilengkapi verifikasi Captcha matematika mandiri (tanpa dependensi eksternal), proteksi *honeypot*, dan opsi sakelar pendaftaran publik (`ALLOW_REGISTRATION=false`).
- **Mode Gelap / Terang (Dark / Light Mode)**: Tampilan nyaman di mata dengan dukungan tema otomatis.
- **PWA & Mobile-First Ready**: Navigasi responsif dengan *bottom navigation bar* yang nyaman digunakan di smartphone.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, Standalone Output)
- **Bahasa**: TypeScript, React 19
- **Database & ORM**: MariaDB / MySQL dengan Prisma ORM v6.4.1
- **Autentikasi**: NextAuth.js (Credentials Provider dengan enkripsi Bcrypt)
- **Styling**: Tailwind CSS v4 & Lucide React Icons
- **Deployment**: Podman / Docker Multi-Stage Build

---

## 🚀 Panduan Menjalankan

### 1. Di Komputer Lokal (Windows)
Cukup jalankan file batch:
```cmd
start.bat
```
Script akan otomatis memeriksa konfigurasi `.env`, menyiapkan dependensi, memperbarui Prisma Client, dan membuka `http://localhost:3000` di browser Anda.

### 2. Di Server (Podman / Docker Compose)
```bash
# Clone repository
git clone https://github.com/fahmitonang/tons-budget-tracker.git budget_tracker
cd budget_tracker

# Siapkan file konfigurasi environment
cp .env.production.example .env
nano .env

# Build dan jalankan container
sudo podman-compose up -d --build
```
