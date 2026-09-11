"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sun, Moon, User } from "lucide-react";

type TopBarProps = {
  user?: {
    name?: string | null;
    username?: string | null;
    image?: string | null;
  } | null;
};

export default function TopBar({ user }: TopBarProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const displayName = user?.name || user?.username || "Pengguna";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Brand & Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
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
          <span className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            Atur Duit
          </span>
        </Link>

        {/* Right Actions: Compact Dark Mode Toggle & Profile Avatar */}
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

          {/* Profile Avatar Shortcut */}
          <Link
            href="/profile"
            className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs hover:opacity-90 active:scale-95 transition-all"
            title={`Profil (${displayName})`}
            aria-label="Profil Pengguna"
          >
            {user?.image ? (
              <Image
                src={user.image}
                alt={displayName}
                width={32}
                height={32}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : initial ? (
              <span>{initial}</span>
            ) : (
              <User className="w-4 h-4" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
