"use client";

import { useState } from "react";
import { X, Eye, EyeOff, KeyRound } from "lucide-react";
import toast from "react-hot-toast";

type ChangePasswordModalProps = {
  onClose: () => void;
};

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Password baru dan konfirmasi tidak cocok");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password baru minimal 8 karakter");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal mengubah password");
      }

      toast.success("Password berhasil diubah!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengubah password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 id="change-password-title" className="text-base font-bold text-gray-900 dark:text-white">
              Ganti Password
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Password Saat Ini
            </label>
            <div className="relative">
              <input 
                type={showPasswords ? "text" : "password"} 
                required
                placeholder="Masukkan password saat ini"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Password Baru
            </label>
            <div className="relative">
              <input 
                type={showPasswords ? "text" : "password"} 
                required
                minLength={8}
                placeholder="Minimal 8 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <input 
                type={showPasswords ? "text" : "password"} 
                required
                minLength={8}
                placeholder="Ketik ulang password baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors" 
              />
            </div>
          </div>

          {/* Toggle Show/Hide Passwords */}
          <button
            type="button"
            onClick={() => setShowPasswords((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            {showPasswords ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Sembunyikan karakter</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Tampilkan karakter</span>
              </>
            )}
          </button>

          <div className="flex gap-2.5 pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? "Menyimpan..." : "Simpan Password"}
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
