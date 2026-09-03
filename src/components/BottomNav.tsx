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
    { name: "Transaksi", href: "/transaction", icon: Plus, isAction: true },
    { name: "Pengaturan", href: "/settings", icon: Settings },
    { name: "Profil", href: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 transition-colors pb-[env(safe-area-inset-bottom,0px)] shadow-lg">
      <div className="grid h-16 max-w-lg grid-cols-5 mx-auto font-medium px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          
          if (item.isAction) {
            return (
              <div key={item.name} className="flex items-center justify-center -mt-5">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-12 h-12 rounded-full shadow-lg transition-transform active:scale-95 ${
                    isActive 
                      ? "bg-blue-700 text-white ring-4 ring-blue-100 dark:ring-blue-900/40" 
                      : "bg-blue-600 hover:bg-blue-700 text-white ring-4 ring-white dark:ring-gray-800"
                  }`}
                  aria-label="Catat Transaksi"
                >
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </Link>
              </div>
            );
          }

          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`inline-flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors ${
                isActive 
                  ? "text-blue-600 dark:text-blue-400 font-semibold" 
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <Icon 
                className={`w-5 h-5 mb-1 transition-transform ${
                  isActive ? "scale-110" : ""
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
