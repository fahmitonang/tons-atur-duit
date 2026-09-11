"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { 
  LogOut, 
  Key, 
  Mail, 
  ShieldCheck, 
  Wallet, 
  Target, 
  Calendar
} from "lucide-react";
import toast from "react-hot-toast";
import { updatePaydayCutoff, getUserSettings } from "./actions";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Payday Cutoff State
  const [cutoffDay, setCutoffDay] = useState(1);
  const [savingCutoff, setSavingCutoff] = useState(false);

  useEffect(() => {
    getUserSettings().then(user => {
      if (user?.paydayCutoffDay) {
        setCutoffDay(user.paydayCutoffDay);
      }
    }).catch(() => {});
  }, []);

  const handleCutoffChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value);
    setCutoffDay(val);
    setSavingCutoff(true);
    try {
      await updatePaydayCutoff(val);
      toast.success(
        val === 1 
          ? "Siklus keuangan diatur mengikuti kalender normal (tgl 1)"
          : `Siklus keuangan berhasil diatur: Tgl ${val} s/d Tgl ${val - 1} bulan berikutnya`
      );
    } catch {
      toast.error("Gagal menyimpan tanggal gajian");
    } finally {
      setSavingCutoff(false);
    }
  };

  // Compute User Initials
  const userName = session?.user?.name || "User";
  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profil Pengguna</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Pengaturan akun & preferensi aplikasi</p>
      </div>
      
      {/* User Info Card with Avatar */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center text-xl font-extrabold shadow-md shadow-blue-500/20 shrink-0">
          {initials}
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">
              {session?.user?.name || 'Pengguna'}
            </h2>
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {session?.user?.username && (
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                @{session.user.username}
              </span>
            )}
            {session?.user?.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 shrink-0" />
                {session.user.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Siklus Keuangan / Payday Cut-off Card */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Tanggal Mulai Siklus Gajian</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Tentukan tanggal Anda menerima gaji tiap bulan (misal tanggal 25) agar perhitungan budget bulanan dan grafik laporan otomatis disesuaikan dari tanggal terima gaji hingga tanggal 24 bulan berikutnya.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <select
            value={cutoffDay}
            onChange={handleCutoffChange}
            disabled={savingCutoff}
            className="px-3.5 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
          >
            <option value={1}>Tanggal 1 (Awal Bulan Kalender)</option>
            {Array.from({ length: 27 }, (_, i) => i + 2).map(d => (
              <option key={d} value={d}>
                Tanggal {d} (Siklus: Tgl {d} s/d {d - 1})
              </option>
            ))}
          </select>
          {savingCutoff && <span className="text-xs text-blue-600 font-semibold animate-pulse">Menyimpan...</span>}
        </div>
      </div>

      {/* Theme Switcher Card */}
      <ThemeSwitcher />

      {/* Financial Navigation Cards */}
      <div className="space-y-2.5">
        <Link
          href="/wallets"
          className="flex items-center justify-between w-full px-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
        >
          <div className="flex items-center gap-2.5">
            <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Kelola Dompet & Rekening
          </div>
          <span className="text-xs text-gray-400">Atur saldo & transfer</span>
        </Link>

        <Link
          href="/savings"
          className="flex items-center justify-between w-full px-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
        >
          <div className="flex items-center gap-2.5">
            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Celengan & Target Impian
          </div>
          <span className="text-xs text-gray-400">Dana darurat & tabungan</span>
        </Link>
      </div>

      {/* Security Actions */}
      <div className="space-y-2.5">
        <button 
          onClick={() => setShowChangePassword(true)}
          className="flex items-center justify-between w-full px-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
        >
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Ubah Password
          </div>
          <span className="text-xs text-gray-400">Ganti kata sandi</span>
        </button>

        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center justify-between w-full px-4 py-3.5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 rounded-xl shadow-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm"
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="w-4 h-4" />
            Keluar (Logout)
          </div>
          <span className="text-xs text-red-400">Akhiri sesi</span>
        </button>
      </div>

      {/* Version & App Branding */}
      <div className="text-center pt-4 pb-2 text-gray-400 dark:text-gray-500 space-y-1">
        <p className="text-xs font-bold tracking-wider uppercase">ATUR DUIT</p>
        <p className="text-[11px]">Versi 1.1.0 • Financial Intelligence Edition</p>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && <LogoutConfirmModal onClose={() => setShowLogoutConfirm(false)} />}
    </div>
  );
}
