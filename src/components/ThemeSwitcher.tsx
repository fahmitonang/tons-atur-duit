"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tampilan (Tema)</h2>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setTheme("light")}
          className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
            theme === "light"
              ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
              : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          }`}
        >
          <Sun className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">Terang</span>
        </button>
        
        <button
          onClick={() => setTheme("dark")}
          className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
            theme === "dark"
              ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
              : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          }`}
        >
          <Moon className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">Gelap</span>
        </button>

        <button
          onClick={() => setTheme("system")}
          className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
            theme === "system"
              ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
              : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          }`}
        >
          <Monitor className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">Sistem</span>
        </button>
      </div>
    </div>
  );
}

