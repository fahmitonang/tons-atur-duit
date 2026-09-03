"use client";

import { useState } from "react";
import { addTransaction } from "./actions";
import { format } from "date-fns";
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
  Sparkles, 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

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
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  const parsedAmount = parseFloat(amount) || 0;
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const formattedPreview = formatter.format(parsedAmount);

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
      const [year, month, day] = date.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);

      await addTransaction(
        categoryId, 
        parsedAmount, 
        localDate,
        description.trim(),
        accountId || undefined
      );

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
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-5">
      {/* Type Selector (Pemasukan vs Pengeluaran) */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
        <button
          type="button"
          onClick={() => { setType("EXPENSE"); setCategoryId(""); }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-lg transition-all ${
            type === "EXPENSE" 
              ? "bg-rose-500 text-white shadow-sm" 
              : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => { setType("INCOME"); setCategoryId(""); }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-lg transition-all ${
            type === "INCOME" 
              ? "bg-emerald-600 text-white shadow-sm" 
              : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          Pemasukan
        </button>
      </div>

      {filteredCategories.length === 0 ? (
        /* Empty Category State with direct action */
        <div className="p-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-center space-y-3">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Belum ada kategori {type === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300/80">
            Anda perlu menambahkan minimal 1 kategori sebelum dapat mencatat transaksi.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Tambah Kategori di Pengaturan
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tanggal Input */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Tanggal Transaksi
            </label>
            <input 
              type="date"
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Dompet / Sumber Dana Selector */}
          {accounts.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <Wallet className="w-3.5 h-3.5 text-gray-400" />
                  {type === "EXPENSE" ? "Sumber Dana / Dompet" : "Masuk ke Dompet"}
                </label>
                <Link href="/wallets" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
                  + Kelola Dompet
                </Link>
              </div>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type === "CASH" ? "Tunai" : acc.type === "BANK" ? "Bank" : "E-Wallet"}) • Saldo: {formatter.format(acc.balance)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Kategori Select */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                Pilih Kategori
              </label>
              <Link href="/settings" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
                + Kelola Kategori
              </Link>
            </div>
            <select 
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              <option value="" disabled>-- Pilih Kategori --</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Jumlah Input & Live Preview */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <Banknote className="w-3.5 h-3.5 text-gray-400" />
              Nominal (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                Rp
              </span>
              <input 
                type="number"
                required
                min="1"
                step="1"
                placeholder="0"
                className="w-full pl-11 pr-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-base font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            {/* Live Currency Preview Badge */}
            {parsedAmount > 0 && (
              <p className="mt-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Terbilang: {formattedPreview}
              </p>
            )}

            {/* Quick Amount Shortcut Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[10000, 20000, 50000, 100000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
                >
                  +{val >= 1000 ? `${val / 1000}rb` : val}
                </button>
              ))}
              {parsedAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* REAL-TIME BUDGET WARNING BANNER */}
          {categoryBudget && limit > 0 && (
            <div className={`p-3.5 rounded-xl border text-xs space-y-1 transition-all ${
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

              <p className="text-[11px] leading-relaxed">
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

          {/* Keterangan */}
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
            className="w-full py-3.5 rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            {loading ? "Menyimpan Transaksi..." : `Simpan ${type === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}`}
          </button>
        </form>
      )}
    </div>
  );
}
