"use client";

import { AlertTriangle, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

type LogoutConfirmModalProps = {
  onClose: () => void;
};

export default function LogoutConfirmModal({ onClose }: LogoutConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut({ redirect: false });
      window.location.href = "/login";
    } catch {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 text-center animate-in zoom-in-95 duration-150">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 id="logout-title" className="text-base font-bold text-gray-900 dark:text-white">
            Keluar dari Akun?
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Anda perlu memasukkan username dan kata sandi kembali untuk masuk ke aplikasi.
          </p>
        </div>
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>{loading ? "Keluar..." : "Ya, Keluar"}</span>
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
      </div>
    </div>
  );
}
