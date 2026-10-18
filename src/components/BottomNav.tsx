"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Plus, 
  ListOrdered, 
  Settings, 
  User 
} from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Laporan", href: "/dashboard", icon: Home },
    { name: "Riwayat", href: "/history", icon: ListOrdered },
    { name: "Catat", href: "/transaction", icon: Plus, isAction: true },
    { name: "Pengaturan", href: "/settings", icon: Settings },
    { name: "Profil", href: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-800 transition-colors pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
      <div className="grid h-16 max-w-lg grid-cols-5 mx-auto font-medium px-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          
          if (item.isAction) {
            return (
              <div key={item.name} className="flex flex-col items-center justify-center -mt-4">
                <Link
                  href={item.href}
                  className={`flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg transition-all active:scale-95 ${
                    isActive 
                      ? "bg-gradient-to-tr from-blue-700 to-indigo-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50 shadow-blue-500/30" 
                      : "bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white ring-4 ring-white dark:ring-gray-900 shadow-blue-500/25"
                  }`}
                  aria-label="Catat Transaksi"
                >
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </Link>
                <span className={`text-[10px] mt-0.5 font-bold tracking-tight ${
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                }`}>
                  {item.name}
                </span>
              </div>
            );
          }

          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`relative inline-flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                isActive 
                  ? "text-blue-600 dark:text-blue-400 font-bold" 
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {/* Active top indicator pill */}
              {isActive && (
                <span className="absolute top-0 w-7 h-1 rounded-b-full bg-blue-600 dark:bg-blue-400 transition-all" />
              )}
              <Icon 
                className={`w-5 h-5 mb-1 transition-transform duration-200 ${
                  isActive ? "scale-110 stroke-[2.25]" : "stroke-[1.75]"
                }`} 
              />
              <span className="text-[11px] leading-tight tracking-tight text-center truncate max-w-full">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
