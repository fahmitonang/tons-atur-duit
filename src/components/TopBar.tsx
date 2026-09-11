"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Sun, 
  Moon, 
  User, 
  Key, 
  LogOut, 
  ChevronDown 
} from "lucide-react";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";

type TopBarProps = {
  user?: {
    name?: string | null;
    username?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
};

// Map current route to page title dynamically
function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "Laporan";
  if (pathname === "/history" || pathname.startsWith("/history/")) return "Riwayat";
  if (pathname === "/transaction" || pathname.startsWith("/transaction/")) return "Transaksi";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "Pengaturan";
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return "Profil Saya";
  if (pathname === "/wallets" || pathname.startsWith("/wallets/")) return "Kelola Dompet";
  if (pathname === "/savings" || pathname.startsWith("/savings/")) return "Celengan Impian";
  return "Atur Duit";
}

export default function TopBar({ user }: TopBarProps) {
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const displayName = user?.name || user?.username || "Pengguna";
  const initial = displayName.charAt(0).toUpperCase();
  const pageTitle = getPageTitle(pathname);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Dynamic Page Title & Brand Icon */}
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2.5 group select-none"
            title="Kembali ke Dashboard / Laporan"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-gray-800 flex items-center justify-center p-1.5 border border-blue-100 dark:border-gray-700 shadow-2xs group-hover:scale-105 transition-transform">
              <Image
                src="/icon.png"
                alt="Logo Atur Duit"
                width={24}
                height={24}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {pageTitle}
              </span>
            </div>
          </Link>

          {/* Right Actions: Compact Dark Mode Toggle & Profile Dropdown */}
          <div className="flex items-center gap-2">
            {/* Dark / Light Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-all active:scale-95 border border-gray-200/60 dark:border-gray-700/60 cursor-pointer"
              title={isDark ? "Mode Terang" : "Mode Gelap"}
            >
              {mounted ? (
                isDark ? (
                  <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 scale-100" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500 transition-transform rotate-0 scale-100" />
                )
              ) : (
                <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-700 animate-pulse" />
              )}
            </button>

            {/* Profile Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                className="flex items-center gap-1 p-0.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                title={`Menu Profil (${displayName})`}
                aria-label="Buka menu profil"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs overflow-hidden">
                  {user?.image ? (
                    <Image
                      src={user.image}
                      alt={displayName}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : initial ? (
                    <span>{initial}</span>
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <ChevronDown 
                  className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                    isMenuOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
                  }`} 
                />
              </button>

              {/* Dropdown Popover */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User brief header */}
                  <div className="px-3.5 py-2 border-b border-gray-100 dark:border-gray-700/60 mb-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {displayName}
                    </p>
                    {user?.email && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {user.email}
                      </p>
                    )}
                  </div>

                  {/* 1. Profil saya */}
                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                  >
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Profil saya</span>
                  </Link>

                  {/* 2. Ganti Password */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowChangePassword(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors text-left cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Ganti Password</span>
                  </button>

                  <div className="my-1 border-t border-gray-100 dark:border-gray-700/60" />

                  {/* 3. Log Out */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <LogoutConfirmModal onClose={() => setShowLogoutConfirm(false)} />
      )}
    </>
  );
}
