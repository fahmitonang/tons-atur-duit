"use client";

import { useState } from "react";
import { addTransaction } from "./actions";
import { toJakartaYMD, parseDateInputToNoonUTC } from "@/lib/dateUtils";
import toast from "react-hot-toast";
import Link from "next/link";
import { 
  Calendar, 
  Tag, 
  Banknote, 
  FileText, 
  PlusCircle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Settings, 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  QrCode,
  CreditCard,
  ArrowRightLeft,
  Smartphone,
  Layers
} from "lucide-react";
import { PAYMENT_METHODS, PaymentMethodType } from "@/lib/paymentMethod";

type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};

type Account = {
  id: string;
  name: string;
  type: "CASH" | "BANK" | "EWALLET";
  balance: number;
};

type BudgetInfo = {
  limit: number;
  currentSpent: number;
};

export default function TransactionForm({ 
  categories, 
  accounts = [], 
  budgetMap = {} 
}: { 
  categories: Category[];
  accounts?: Account[];
  budgetMap?: Record<string, BudgetInfo>;
}) {
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(() => {
    const acc = accounts[0];
    if (acc?.type === "BANK") return "TRANSFER";
    if (acc?.type === "EWALLET") return "QRIS";
    return "CASH";
  });
  // Store raw digits string (e.g. "1500000")
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => toJakartaYMD(new Date()));
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAccountChange = (newAccId: string) => {
    setAccountId(newAccId);
    const selectedAcc = accounts.find(a => a.id === newAccId);
    if (selectedAcc) {
      if (selectedAcc.type === "CASH") {
        setPaymentMethod("CASH");
      } else if (selectedAcc.type === "BANK") {
        if (paymentMethod === "CASH") setPaymentMethod("TRANSFER");
      } else if (selectedAcc.type === "EWALLET") {
        if (paymentMethod === "CASH") setPaymentMethod("QRIS");
      }
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);

  // Format digits with Indonesian thousand separator dots (e.g., "1.500.000")
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    // Remove leading zeros
    const normalized = digitsOnly.replace(/^0+/, "");
    setAmount(normalized);
  };

  const handleQuickAmount = (val: number) => {
    const current = parseInt(amount || "0", 10) || 0;
    setAmount((current + val).toString());
  };

  const parsedAmount = parseInt(amount || "0", 10) || 0;
  const formattedInputDisplay = parsedAmount > 0 
    ? new Intl.NumberFormat("id-ID").format(parsedAmount) 
    : "";

  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  // Real-time Budget Calculation
  const categoryBudget = (type === "EXPENSE" && categoryId) ? budgetMap[categoryId] : null;
  const limit = categoryBudget?.limit || 0;
  const currentSpent = categoryBudget?.currentSpent || 0;
  const afterSpent = currentSpent + parsedAmount;
  const isOverbudget = categoryBudget && afterSpent > limit;
  const overAmount = afterSpent - limit;
  const remainingAfter = limit - afterSpent;
  const percentageAfter = limit > 0 ? Math.round((afterSpent / limit) * 100) : 0;
  const isApproachingLimit = !isOverbudget && categoryBudget && percentageAfter >= 80;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount || !date) return;
    
    if (parsedAmount <= 0) {
      toast.error("Nominal transaksi harus lebih dari 0");
      return;
    }

    setLoading(true);
    try {
      const targetDate = parseDateInputToNoonUTC(date);

      const res = await addTransaction(
        categoryId, 
        parsedAmount, 
        targetDate,
        description.trim(),
        accountId || undefined,
        paymentMethod
      );

      if (res && !res.success) {
        toast.error(res.error || "Gagal mencatat transaksi");
        return;
      }

      setAmount("");
      setDescription("");
      toast.success("Transaksi berhasil dicatat!");
    } catch (error: any) {
      toast.error(error?.message || "Gagal mencatat transaksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-700/80 space-y-4">
      {/* Type Selector (Pengeluaran vs Pemasukan) */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 dark:bg-gray-700/60 rounded-2xl">
        <button
          type="button"
          onClick={() => { setType("EXPENSE"); setCategoryId(""); }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
            type === "EXPENSE" 
              ? "bg-rose-500 text-white shadow-sm shadow-rose-500/25" 
              : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => { setType("INCOME"); setCategoryId(""); }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
            type === "INCOME" 
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/25" 
              : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          Pemasukan
        </button>
      </div>

      {filteredCategories.length === 0 ? (
        /* Empty Category State with direct action */
        <div className="p-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-center space-y-3">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
            Belum ada kategori {type === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300/80">
            Anda perlu menambahkan minimal 1 kategori sebelum dapat mencatat transaksi.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Tambah Kategori di Pengaturan
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. HERO NOMINAL INPUT (Auto-Formatted with thousand separators) */}
          <div className={`p-4 rounded-2xl border transition-colors ${
            type === "EXPENSE"
              ? "bg-rose-50/40 dark:bg-gray-900/50 border-rose-100 dark:border-gray-700 focus-within:border-rose-400 dark:focus-within:border-rose-500"
              : "bg-emerald-50/40 dark:bg-gray-900/50 border-emerald-100 dark:border-gray-700 focus-within:border-emerald-400 dark:focus-within:border-emerald-500"
          }`}>
            <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" />
                Nominal {type === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
              </span>
              {parsedAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className="text-rose-500 hover:underline font-semibold normal-case tracking-normal cursor-pointer"
                >
                  Reset
                </button>
              )}
            </label>

            <div className="relative flex items-baseline gap-2">
              <span className={`text-xl font-black ${
                type === "EXPENSE" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              }`}>
                Rp
              </span>
              <input 
                type="text"
                inputMode="numeric"
                required
                placeholder="0"
                className="w-full bg-transparent text-gray-900 dark:text-white text-2xl sm:text-3xl font-black tabular-nums focus:outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
                value={formattedInputDisplay}
                onChange={handleAmountChange}
              />
            </div>

            {/* Quick Amount Shortcut Chips */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-3 mt-2 border-t border-gray-200/60 dark:border-gray-700/60">
              {[10000, 20000, 50000, 100000, 250000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 cursor-pointer shadow-2xs"
                >
                  +{val >= 1000 ? `${val / 1000}rb` : val}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Kategori Dropdown & Tanggal Transaksi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Kategori Select (Dropdown as preferred) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  Pilih Kategori
                </label>
                <Link href="/settings" className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  + Kategori
                </Link>
              </div>
              <select 
                required
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
              >
                <option value="" disabled>-- Pilih Kategori --</option>
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Tanggal Input */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Tanggal Transaksi
              </label>
              <input 
                type="date"
                required
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* REAL-TIME BUDGET WARNING BANNER */}
          {categoryBudget && limit > 0 && (
            <div className={`p-3.5 rounded-2xl border text-xs space-y-1 transition-all ${
              isOverbudget 
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200"
                : isApproachingLimit
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200"
                : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200"
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                {isOverbudget ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Peringatan: Overbudget!</span>
                  </>
                ) : isApproachingLimit ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Mendekati Batas Budget ({percentageAfter}%)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Budget Terkendali ({percentageAfter}%)</span>
                  </>
                )}
              </div>

              <p className="text-[11px] leading-relaxed tabular-nums">
                {parsedAmount === 0 ? (
                  currentSpent > limit ? (
                    <>
                      Kategori ini sudah melebihi budget sebesar <strong>{formatter.format(currentSpent - limit)}</strong> (Limit: {formatter.format(limit)}, terpakai: {formatter.format(currentSpent)}).
                    </>
                  ) : (
                    <>
                      Sisa budget saat ini: <strong>{formatter.format(limit - currentSpent)}</strong> dari total alokasi {formatter.format(limit)}.
                    </>
                  )
                ) : (
                  isOverbudget ? (
                    <>
                      Transaksi ini akan membuat pengeluaran melebihi budget sebesar <strong>{formatter.format(overAmount)}</strong>. (Limit: {formatter.format(limit)}, sudah terpakai: {formatter.format(currentSpent)}).
                    </>
                  ) : (
                    <>
                      Sisa budget setelah transaksi ini: <strong>{formatter.format(remainingAfter)}</strong> dari total budget {formatter.format(limit)}.
                    </>
                  )
                )}
              </p>
            </div>
          )}

          {/* 3. Dompet / Sumber Dana Selector */}
          {accounts.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <Wallet className="w-3.5 h-3.5 text-gray-400" />
                  {type === "EXPENSE" ? "Sumber Dana / Dompet" : "Masuk ke Dompet"}
                </label>
                <Link href="/wallets" className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  + Kelola Dompet
                </Link>
              </div>
              <select
                value={accountId}
                onChange={e => handleAccountChange(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type === "CASH" ? "Tunai" : acc.type === "BANK" ? "Bank" : "E-Wallet"}) • Saldo: {formatter.format(acc.balance)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 4. Metode Pembayaran */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <CreditCard className="w-3.5 h-3.5 text-gray-400" />
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`px-2 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/60 dark:border-blue-500 dark:text-blue-300 shadow-2xs font-bold ring-1 ring-blue-500"
                        : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium"
                    }`}
                  >
                    {method.id === "QRIS" && <QrCode className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                    {method.id === "CASH" && <Banknote className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    {method.id === "TRANSFER" && <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                    {(method.id === "DEBIT_CARD" || method.id === "CREDIT_CARD") && <CreditCard className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                    {method.id === "EWALLET" && <Smartphone className="w-3.5 h-3.5 text-teal-500 shrink-0" />}
                    {method.id === "OTHER" && <Layers className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                    <span className="truncate">{method.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Keterangan */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              Keterangan / Catatan (Opsional)
            </label>
            <textarea 
              rows={2}
              placeholder="Contoh: Makan siang nasi padang, bensin pertalite..."
              className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={loading || !categoryId || parsedAmount <= 0}
            className={`w-full py-3.5 rounded-2xl text-white font-bold active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              type === "EXPENSE"
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            {loading ? "Menyimpan Transaksi..." : `Simpan ${type === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}`}
          </button>
        </form>
      )}
    </div>
  );
}
