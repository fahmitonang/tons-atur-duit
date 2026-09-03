"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  addCategory, 
  deleteCategory, 
  setMonthlyBudget, 
  deleteMonthlyBudget,
  copyBudgetFromPreviousMonth 
} from "./actions";
import toast from "react-hot-toast";
import { 
  PlusCircle, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Sliders, 
  Tag, 
  Sparkles, 
  AlertTriangle, 
  Copy, 
  ArrowDownLeft, 
  ArrowUpRight,
  TrendingDown
} from "lucide-react";

type MonthlyBudgetItem = {
  id?: string;
  month: number;
  year: number;
  limit: number;
};

type CategoryWithBudget = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  monthlyBudgets: MonthlyBudgetItem[];
};

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function SettingsForm({ 
  initialCategories,
  currentMonth: initialMonth,
  currentYear: initialYear
}: { 
  initialCategories: CategoryWithBudget[],
  currentMonth: number,
  currentYear: number
}) {
  const [activeTab, setActiveTab] = useState<"BUDGET" | "CATEGORIES">("BUDGET");
  const [categories, setCategories] = useState<CategoryWithBudget[]>(initialCategories);
  
  // Sync state when server props change (Bug #4 fix)
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  // Selected Month & Year for budget planning
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);

  // New Category State
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [addingCategory, setAddingCategory] = useState(false);

  // Budget Inputs & Loaders
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [budgetLoading, setBudgetLoading] = useState<Record<string, boolean>>({});
  const [copyingBudget, setCopyingBudget] = useState(false);

  // Category Delete Confirmation
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [isDeletingCat, setIsDeletingCat] = useState(false);

  const router = useRouter();

  // Navigation between months
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // Add Category Handler
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setAddingCategory(true);
    try {
      await addCategory(newCatName.trim(), newCatType);
      
      const newCat: CategoryWithBudget = {
        id: `temp-${Date.now()}`,
        name: newCatName.trim(),
        type: newCatType,
        monthlyBudgets: []
      };

      setCategories(prev => [...prev, newCat]);
      setNewCatName("");
      toast.success(`Kategori "${newCat.name}" berhasil ditambahkan`);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menambahkan kategori");
    } finally {
      setAddingCategory(false);
    }
  };

  // Delete Category Handler
  const handleConfirmDeleteCategory = async () => {
    if (!deletingCatId) return;
    setIsDeletingCat(true);
    try {
      await deleteCategory(deletingCatId);
      setCategories(prev => prev.filter(c => c.id !== deletingCatId));
      toast.success("Kategori berhasil dihapus");
      setDeletingCatId(null);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus kategori");
    } finally {
      setIsDeletingCat(false);
    }
  };

  // Set Budget Handler
  const handleSetBudget = async (categoryId: string) => {
    const limitStr = budgetInputs[categoryId];
    if (!limitStr) return;
    const limit = parseFloat(limitStr);
    if (isNaN(limit) || limit <= 0) {
      toast.error("Masukkan nominal budget yang valid");
      return;
    }
    
    setBudgetLoading(prev => ({ ...prev, [categoryId]: true }));
    try {
      await setMonthlyBudget(categoryId, limit, selectedMonth, selectedYear);
      setBudgetInputs(prev => ({ ...prev, [categoryId]: "" }));
      
      // Update local state for selected month/year
      setCategories(prev => prev.map(c => {
        if (c.id !== categoryId) return c;
        const otherBudgets = c.monthlyBudgets.filter(b => !(b.month === selectedMonth && b.year === selectedYear));
        return {
          ...c,
          monthlyBudgets: [...otherBudgets, { month: selectedMonth, year: selectedYear, limit }]
        };
      }));

      toast.success("Budget berhasil disimpan");
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengatur budget");
    } finally {
      setBudgetLoading(prev => ({ ...prev, [categoryId]: false }));
    }
  };

  // Reset / Remove Budget Handler
  const handleDeleteBudget = async (categoryId: string) => {
    setBudgetLoading(prev => ({ ...prev, [categoryId]: true }));
    try {
      await deleteMonthlyBudget(categoryId, selectedMonth, selectedYear);
      setCategories(prev => prev.map(c => {
        if (c.id !== categoryId) return c;
        return {
          ...c,
          monthlyBudgets: c.monthlyBudgets.filter(b => !(b.month === selectedMonth && b.year === selectedYear))
        };
      }));
      toast.success("Budget kategori berhasil di-reset");
    } catch (e: any) {
      toast.error(e?.message || "Gagal mereset budget");
    } finally {
      setBudgetLoading(prev => ({ ...prev, [categoryId]: false }));
    }
  };

  // Copy Budget from Previous Month Handler
  const handleCopyFromPreviousMonth = async () => {
    const prevMonthName = selectedMonth === 1 ? MONTH_NAMES[11] : MONTH_NAMES[selectedMonth - 2];
    const prevYearVal = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

    if (!confirm(`Salin seluruh budget dari ${prevMonthName} ${prevYearVal} ke ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}?`)) {
      return;
    }

    setCopyingBudget(true);
    try {
      const res = await copyBudgetFromPreviousMonth(selectedMonth, selectedYear);
      toast.success(`Berhasil menyalin ${res.copiedCount} budget dari bulan sebelumnya!`);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyalin budget");
    } finally {
      setCopyingBudget(false);
    }
  };

  const expenseCategories = categories.filter(c => c.type === "EXPENSE");
  const incomeCategories = categories.filter(c => c.type === "INCOME");

  const totalMonthlyBudget = expenseCategories.reduce((sum, cat) => {
    const budget = cat.monthlyBudgets.find(b => b.month === selectedMonth && b.year === selectedYear);
    return sum + (budget?.limit || 0);
  }, 0);

  // Total days in selected month for daily pacing
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const totalDailyPacing = totalMonthlyBudget > 0 ? Math.round(totalMonthlyBudget / daysInSelectedMonth) : 0;

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  });

  return (
    <div className="space-y-5">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab("BUDGET")}
          className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "BUDGET"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Budget Bulanan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("CATEGORIES")}
          className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "CATEGORIES"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Tag className="w-4 h-4" />
          Kelola Kategori
        </button>
      </div>

      {activeTab === "BUDGET" ? (
        /* TAB 1: BUDGET BULANAN */
        <div className="space-y-4">
          {/* Month Selector Card */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 transition-colors"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Periode Budget</p>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center justify-center gap-1.5 mt-0.5">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </h2>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 transition-colors"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action: Salin Budget Bulan Lalu */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-center">
              <button
                type="button"
                onClick={handleCopyFromPreviousMonth}
                disabled={copyingBudget}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-3.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/50 transition-colors disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                {copyingBudget ? "Menyalin..." : "Salin Budget dari Bulan Lalu"}
              </button>
            </div>
          </div>

          {/* Total Budget Summary Header with Daily Pacing */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 rounded-2xl text-white shadow-sm space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-medium text-blue-100">Total Alokasi Budget Bulan Ini</p>
                <p className="text-2xl font-black mt-0.5">
                  {formatter.format(totalMonthlyBudget)}
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-white/20 text-white rounded-lg">
                {expenseCategories.length} Kategori
              </span>
            </div>

            {totalMonthlyBudget > 0 && (
              <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs text-blue-100">
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Rata-rata jatah aman per hari:
                </span>
                <strong className="text-white font-bold">{formatter.format(totalDailyPacing)} / hari</strong>
              </div>
            )}
          </div>

          {/* Category Budget Cards */}
          <div className="space-y-3">
            {expenseCategories.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center space-y-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Belum ada kategori pengeluaran</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Buka tab &quot;Kelola Kategori&quot; untuk menambahkan kategori pengeluaran terlebih dahulu.
                </p>
              </div>
            ) : (
              expenseCategories.map(cat => {
                const currentBudget = cat.monthlyBudgets.find(b => b.month === selectedMonth && b.year === selectedYear);
                const currentLimit = currentBudget?.limit || 0;
                const isBudgetLoading = budgetLoading[cat.id] ?? false;
                const inputValue = budgetInputs[cat.id] ?? "";
                const inputNum = parseFloat(inputValue) || 0;
                const dailyCategoryPacing = currentLimit > 0 ? Math.round(currentLimit / daysInSelectedMonth) : 0;

                return (
                  <div key={cat.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{cat.name}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Limit saat ini: <strong className="text-gray-700 dark:text-gray-300">{currentLimit > 0 ? formatter.format(currentLimit) : "Belum diatur"}</strong>
                        </p>
                        {currentLimit > 0 && (
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                            Jatah belanja aman: {formatter.format(dailyCategoryPacing)} / hari
                          </p>
                        )}
                      </div>

                      {currentLimit > 0 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteBudget(cat.id)}
                          disabled={isBudgetLoading}
                          className="text-[11px] text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold transition-colors"
                        >
                          Hapus Limit
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                            Rp
                          </span>
                          <input 
                            type="number"
                            min="1"
                            step="1"
                            placeholder={currentLimit > 0 ? currentLimit.toString() : "Masukkan limit budget"}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                            value={inputValue}
                            onChange={(e) => setBudgetInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleSetBudget(cat.id)}
                          disabled={isBudgetLoading || !inputValue || inputNum <= 0}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 transition-all"
                        >
                          {isBudgetLoading ? "..." : "Simpan"}
                        </button>
                      </div>

                      {inputNum > 0 && (
                        <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 pl-1">
                          <Sparkles className="w-3 h-3" />
                          Set ke: {formatter.format(inputNum)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: KELOLA KATEGORI */
        <div className="space-y-4">
          {/* Add Category Form */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Tambah Kategori Baru
            </h3>

            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                  Nama Kategori
                </label>
                <input 
                  type="text" 
                  placeholder="Contoh: Transportasi, Kopi, Investasi..." 
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                  Jenis Kategori
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCatType("EXPENSE")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all border ${
                      newCatType === "EXPENSE"
                        ? "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatType("INCOME")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all border ${
                      newCatType === "INCOME"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    Pemasukan
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={addingCategory || !newCatName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-md disabled:opacity-50 transition-colors"
              >
                {addingCategory ? "Menyimpan..." : "Tambah Kategori"}
              </button>
            </form>
          </div>

          {/* List of Existing Categories */}
          <div className="space-y-4">
            {/* Pengeluaran Categories */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Kategori Pengeluaran ({expenseCategories.length})
                </h4>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {expenseCategories.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Belum ada kategori pengeluaran</p>
                ) : (
                  expenseCategories.map(cat => (
                    <div key={cat.id} className="py-2.5 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{cat.name}</span>
                      <button
                        type="button"
                        onClick={() => setDeletingCatId(cat.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pemasukan Categories */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  Kategori Pemasukan ({incomeCategories.length})
                </h4>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {incomeCategories.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Belum ada kategori pemasukan</p>
                ) : (
                  incomeCategories.map(cat => (
                    <div key={cat.id} className="py-2.5 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{cat.name}</span>
                      <button
                        type="button"
                        onClick={() => setDeletingCatId(cat.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deletingCatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 text-center">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Hapus Kategori Ini?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Semua data transaksi dan budget yang terkait dengan kategori ini juga akan terhapus.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                disabled={isDeletingCat}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm disabled:opacity-50 transition-colors"
              >
                {isDeletingCat ? "Menghapus..." : "Ya, Hapus"}
              </button>
              <button
                type="button"
                onClick={() => setDeletingCatId(null)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
