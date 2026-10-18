"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Wallet, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  ArrowRight 
} from "lucide-react";

type WalletAccount = {
  id: string;
  name: string;
  type: "CASH" | "BANK" | "EWALLET";
  balance: number;
};

type DashboardHeroCardProps = {
  totalWalletBalance: number;
  accounts: WalletAccount[];
  netBalance: number;
  totalIncome: number;
  totalExpense: number;
  incomeCount: number;
  expenseCount: number;
  prevTotalExpense: number;
  momDiff: number;
  momPct: number | null;
};

const STORAGE_KEY = "atur_duit_hide_balance";

export default function DashboardHeroCard({
  totalWalletBalance,
  accounts,
  netBalance,
  totalIncome,
  totalExpense,
  incomeCount,
  expenseCount,
  prevTotalExpense,
  momDiff,
  momPct,
}: DashboardHeroCardProps) {
  const [hideBalance, setHideBalance] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "true") setHideBalance(true);
    } catch {}
  }, []);

  const togglePrivacy = () => {
    setHideBalance((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

  const formatMoney = (val: number) => {
    if (mounted && hideBalance) return "Rp ••••••••";
    return formatter.format(val);
  };

  return (
    <div className="space-y-3">
      {/* Main Unified Hero Card */}
      <div
        className={`relative overflow-hidden p-5 rounded-3xl border shadow-md transition-all ${
          netBalance >= 0
            ? "bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white border-blue-500/40 shadow-blue-500/10"
            : "bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 text-white border-rose-500/40 shadow-rose-500/10"
        }`}
      >
        {/* Subtle decorative circles */}
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-black/10 blur-xl pointer-events-none" />

        <div className="relative space-y-4">
          {/* Top Row: Label + Privacy Toggle + Status Badge */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-100 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Arus Kas Bersih Periode Ini
              </span>
              <button
                type="button"
                onClick={togglePrivacy}
                className="p-1 rounded-lg bg-white/15 hover:bg-white/25 text-white/90 transition-colors cursor-pointer"
                title={hideBalance ? "Tampilkan Nominal" : "Sembunyikan Nominal"}
                aria-label={hideBalance ? "Tampilkan Nominal" : "Sembunyikan Nominal"}
              >
                {mounted && hideBalance ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold tracking-wide ${
                netBalance > 0
                  ? "bg-emerald-400/20 text-emerald-100 border border-emerald-300/30"
                  : netBalance < 0
                  ? "bg-red-400/20 text-red-100 border border-red-300/30"
                  : "bg-white/20 text-white"
              }`}
            >
              {netBalance > 0 ? "Surplus" : netBalance < 0 ? "Defisit" : "Seimbang"}
            </span>
          </div>

          {/* Center Row: Hero Net Balance */}
          <div>
            <h2 className="text-3xl font-black tracking-tight tabular-nums leading-none">
              {formatMoney(netBalance)}
            </h2>

            {/* Month-over-Month Comparison Indicator */}
            {prevTotalExpense > 0 && momPct !== null && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] bg-black/15 px-2.5 py-1 rounded-xl text-blue-50">
                <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                <span>Vs periode lalu:</span>
                <span
                  className={`font-bold ${
                    momDiff < 0
                      ? "text-emerald-300"
                      : momDiff > 0
                      ? "text-rose-200"
                      : "text-white"
                  }`}
                >
                  {momDiff < 0
                    ? `Hemat ${momPct}% (${formatMoney(Math.abs(momDiff))})`
                    : momDiff > 0
                    ? `Naik ${momPct}% (${formatMoney(momDiff)})`
                    : "Sama persis"}
                </span>
              </div>
            )}
          </div>

          {/* Integrated Income & Expense Glassmorphic Sub-cards */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Income Box */}
            <div className="bg-white/12 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-blue-100">Pemasukan</span>
                <div className="w-5 h-5 rounded-lg bg-emerald-400/25 flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-emerald-300" />
                </div>
              </div>
              <p className="text-sm font-extrabold text-white tabular-nums truncate">
                {formatMoney(totalIncome)}
              </p>
              <p className="text-[10px] text-blue-100/75 mt-0.5">{incomeCount} transaksi</p>
            </div>

            {/* Expense Box */}
            <div className="bg-white/12 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-blue-100">Pengeluaran</span>
                <div className="w-5 h-5 rounded-lg bg-rose-400/25 flex items-center justify-center">
                  <TrendingDown className="w-3 h-3 text-rose-300" />
                </div>
              </div>
              <p className="text-sm font-extrabold text-white tabular-nums truncate">
                {formatMoney(totalExpense)}
              </p>
              <p className="text-[10px] text-blue-100/75 mt-0.5">{expenseCount} transaksi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Multi-Wallet Strip */}
      <div className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-xs space-y-2.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Total Saldo Dompet:
              </span>
              <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                {formatMoney(totalWalletBalance)}
              </span>
            </div>
          </div>
          <Link
            href="/wallets"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Kelola ({accounts.length})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Horizontal scrollable wallet pills without ugly scrollbar */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar text-xs">
          {accounts.map((acc) => (
            <Link
              key={acc.id}
              href="/wallets"
              className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50/60 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-600/50 flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <span className="font-semibold text-gray-700 dark:text-gray-300">{acc.name}:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {formatMoney(acc.balance)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
