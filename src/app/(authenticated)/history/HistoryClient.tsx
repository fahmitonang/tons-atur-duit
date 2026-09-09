"use client";

import { useState, useMemo, useEffect } from "react";
import { updateTransaction, deleteTransaction } from "./actions";
import toast from "react-hot-toast";
import { 
  Edit3, 
  Trash2, 
  X, 
  Filter, 
  Calendar, 
  Tag, 
  Banknote, 
  FileText, 
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Download,
  Wallet,
  CreditCard
} from "lucide-react";
import { PAYMENT_METHODS, getPaymentMethodLabel } from "@/lib/paymentMethod";
import { 
  toJakartaYMD, 
  getJakartaDateParts, 
  formatDateHeader, 
  parseDateInputToNoonUTC 
} from "@/lib/dateUtils";

type Transaction = {
  id: string;
  date: Date | string;
  amount: number;
  description: string | null;
  paymentMethod?: string;
  category: { id: string; name: string; type: "INCOME" | "EXPENSE" };
  account?: { id: string; name: string } | null;
};

type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};

type Account = {
  id: string;
  name: string;
};

export default function HistoryClient({ 
  initialTransactions, 
  categories,
  accounts = []
}: { 
  initialTransactions: Transaction[],
  categories: Category[],
  accounts?: Account[]
}) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state when server props change (Bug #4 fix)
  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  // Edit Modal State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState<{
    categoryId: string;
    accountId: string;
    paymentMethod: string;
    amount: string;
    date: string;
    description: string;
  }>({
    categoryId: "",
    accountId: "",
    paymentMethod: "CASH",
    amount: "",
    date: "",
    description: ""
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation Modal State
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Trigger Edit Modal
  const handleOpenEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setEditForm({
      categoryId: t.category.id,
      accountId: t.account?.id || (accounts[0]?.id || ""),
      paymentMethod: t.paymentMethod || "CASH",
      amount: t.amount.toString(),
      date: toJakartaYMD(t.date),
      description: t.description || ""
    });
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const parsed = parseFloat(editForm.amount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Nominal tidak valid");
      return;
    }

    setSavingEdit(true);
    try {
      const targetDate = parseDateInputToNoonUTC(editForm.date);

      const res = await updateTransaction(
        editingTransaction.id,
        editForm.categoryId,
        parsed,
        targetDate,
        editForm.description.trim(),
        editForm.accountId || undefined,
        editForm.paymentMethod
      );

      if (res && !res.success) {
        toast.error(res.error || "Gagal memperbarui transaksi");
        return;
      }

      const updatedCategory = categories.find(c => c.id === editForm.categoryId) || editingTransaction.category;
      const updatedAccount = accounts.find(a => a.id === editForm.accountId) || editingTransaction.account;

      setTransactions(prev => prev.map(t => {
        if (t.id === editingTransaction.id) {
          return {
            ...t,
            categoryId: editForm.categoryId,
            category: updatedCategory,
            account: updatedAccount,
            paymentMethod: editForm.paymentMethod,
            amount: parsed,
            date: targetDate,
            description: editForm.description.trim() || null
          };
        }
        return t;
      }));

      setEditingTransaction(null);
      toast.success("Transaksi berhasil diperbarui");
    } catch (e: any) {
      toast.error(e?.message || "Gagal memperbarui transaksi");
    } finally {
      setSavingEdit(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingTransaction) return;
    setIsDeleting(true);
    try {
      const res = await deleteTransaction(deletingTransaction.id);
      if (res && !res.success) {
        toast.error(res.error || "Gagal menghapus transaksi");
        return;
      }
      setTransactions(prev => prev.filter(t => t.id !== deletingTransaction.id));
      setDeletingTransaction(null);
      toast.success("Transaksi berhasil dihapus & saldo disesuaikan");
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus transaksi");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and Search
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== "ALL" && t.category.type !== filterType) return false;
      if (selectedCategory !== "ALL" && t.category.id !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchCategory = t.category.name.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query);
        const matchAccount = t.account?.name?.toLowerCase().includes(query);
        const matchMethod = t.paymentMethod ? getPaymentMethodLabel(t.paymentMethod).toLowerCase().includes(query) : false;
        if (!matchCategory && !matchDesc && !matchAccount && !matchMethod) return false;
      }
      return true;
    });
  }, [transactions, filterType, selectedCategory, searchQuery]);

  // Group by Local Date
  const groupedTransactions = useMemo(() => {
    const map = new Map<string, { date: Date; items: Transaction[]; totalIn: number; totalOut: number }>();

    filteredTransactions.forEach(t => {
      const key = toJakartaYMD(t.date);
      const { year, month, day } = getJakartaDateParts(t.date);
      const groupDate = new Date(year, month - 1, day);

      if (!map.has(key)) {
        map.set(key, { date: groupDate, items: [], totalIn: 0, totalOut: 0 });
      }

      const group = map.get(key)!;
      group.items.push(t);
      if (t.category.type === "INCOME") {
        group.totalIn += t.amount;
      } else {
        group.totalOut += t.amount;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredTransactions]);

  const formatter = new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  });

  return (
    <div className="space-y-4">
      {/* Type Filter Buttons */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {(["ALL", "EXPENSE", "INCOME"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`py-2 text-xs rounded-lg font-bold transition-all ${
              filterType === f 
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {f === "ALL" ? "Semua" : f === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
          </button>
        ))}
      </div>

      {/* Search, Category Filter & Export Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        {/* Search */}
        <div className="relative sm:col-span-6">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari transaksi, dompet, catatan..."
            className="w-full pl-9 pr-3.5 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Dropdown */}
        <div className="relative sm:col-span-4">
          <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            className="w-full pl-9 pr-3.5 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.type === "INCOME" ? "Pemasukan" : "Pengeluaran"})</option>
            ))}
          </select>
        </div>

        {/* Export Button */}
        <div className="sm:col-span-2">
          <a
            href="/api/export/csv"
            download
            className="w-full py-2 px-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
            title="Unduh Riwayat ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>CSV</span>
          </a>
        </div>
      </div>

      {/* Grouped Transaction List */}
      <div className="space-y-4 pb-8">
        {groupedTransactions.map(group => (
          <div key={toJakartaYMD(group.date)} className="space-y-2">
            {/* Date Header with Daily Subtotal */}
            <div className="flex justify-between items-center px-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {formatDateHeader(group.date)}
              </span>
              <div className="flex gap-2 text-[11px] font-medium">
                {group.totalIn > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{formatter.format(group.totalIn)}
                  </span>
                )}
                {group.totalOut > 0 && (
                  <span className="text-rose-600 dark:text-rose-400">
                    -{formatter.format(group.totalOut)}
                  </span>
                )}
              </div>
            </div>

            {/* Transaction Cards in Group */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60">
              {group.items.map(t => (
                <div key={t.id} className="p-3.5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      t.category.type === "INCOME" 
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" 
                        : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                    }`}>
                      {t.category.type === "INCOME" ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                          {t.category.name}
                        </p>
                        {t.account && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            {t.account.name}
                          </span>
                        )}
                        {t.paymentMethod && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-900/40">
                            {getPaymentMethodLabel(t.paymentMethod)}
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <p className={`text-sm font-bold text-right ${
                      t.category.type === "INCOME" 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-rose-600 dark:text-rose-400"
                    }`}>
                      {t.category.type === "INCOME" ? "+" : "-"}{formatter.format(t.amount)}
                    </p>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 border-l border-gray-100 dark:border-gray-700 pl-2">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Edit Transaksi"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingTransaction(t)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            Tidak ada transaksi yang cocok dengan filter atau pencarian.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Edit Transaksi</h3>
              <button 
                onClick={() => setEditingTransaction(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Date */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Tanggal
                </label>
                <input 
                  type="date"
                  required
                  value={editForm.date}
                  onChange={e => setEditForm({...editForm, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Wallet / Account */}
              {accounts.length > 0 && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    <Wallet className="w-3.5 h-3.5 text-gray-400" />
                    Dompet / Sumber Dana
                  </label>
                  <select
                    value={editForm.accountId}
                    onChange={e => setEditForm({...editForm, accountId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                  Metode Pembayaran
                </label>
                <select
                  value={editForm.paymentMethod}
                  onChange={e => setEditForm({...editForm, paymentMethod: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  Kategori
                </label>
                <select
                  required
                  value={editForm.categoryId}
                  onChange={e => setEditForm({...editForm, categoryId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === "INCOME" ? "Pemasukan" : "Pengeluaran"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  <Banknote className="w-3.5 h-3.5 text-gray-400" />
                  Nominal (Rp)
                </label>
                <input 
                  type="number" 
                  min="1"
                  step="1"
                  required
                  value={editForm.amount}
                  onChange={e => setEditForm({...editForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  Catatan / Keterangan
                </label>
                <input 
                  type="text" 
                  value={editForm.description}
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Keterangan transaksi"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  disabled={savingEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm disabled:opacity-50 transition-colors"
                >
                  {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingTransaction(null)}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 text-center">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Hapus Transaksi?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Data transaksi ini akan dihapus permanen dan saldo dompet akan dikembalikan otomatis.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm disabled:opacity-50 transition-colors"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
              <button
                type="button"
                onClick={() => setDeletingTransaction(null)}
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
