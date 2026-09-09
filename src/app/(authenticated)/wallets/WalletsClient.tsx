"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  createAccount, 
  updateAccount,
  deleteAccount, 
  transferFunds 
} from "./actions";
import { 
  Wallet, 
  PlusCircle, 
  ArrowRightLeft, 
  Landmark, 
  Banknote, 
  Smartphone, 
  Trash2, 
  Edit3,
  X, 
  Calendar, 
  FileText, 
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Sparkles
} from "lucide-react";
import { toJakartaYMD, parseDateInputToNoonUTC, formatDisplayDate } from "@/lib/dateUtils";

type Account = {
  id: string;
  name: string;
  type: "CASH" | "BANK" | "EWALLET";
  balance: number;
  _count?: { transactions: number };
};

type TransferItem = {
  id: string;
  date: Date | string;
  amount: number;
  description: string | null;
  fromAccount: { id: string; name: string; type: string };
  toAccount: { id: string; name: string; type: string };
};

export default function WalletsClient({ 
  initialAccounts, 
  recentTransfers = [] 
}: { 
  initialAccounts: Account[];
  recentTransfers?: TransferItem[];
}) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [transfers, setTransfers] = useState<TransferItem[]>(recentTransfers);
  const router = useRouter();

  // Sync state when server props change (Bug #4 fix)
  useEffect(() => {
    setAccounts(initialAccounts);
    setTransfers(recentTransfers);
  }, [initialAccounts, recentTransfers]);

  // Modal State: Tambah Dompet
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<"CASH" | "BANK" | "EWALLET">("BANK");
  const [startingBalance, setStartingBalance] = useState("");
  const [addingAccount, setAddingAccount] = useState(false);

  // Modal State: Edit Dompet & Saldo
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editAccountName, setEditAccountName] = useState("");
  const [editAccountType, setEditAccountType] = useState<"CASH" | "BANK" | "EWALLET">("BANK");
  const [editAccountBalance, setEditAccountBalance] = useState("");
  const [savingEditAccount, setSavingEditAccount] = useState(false);

  // Modal State: Hapus Dompet
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Modal State: Transfer Dana
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Form: Transfer
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || "");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState(() => toJakartaYMD(new Date()));
  const [transferNotes, setTransferNotes] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Total balance
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  });

  const getAccountIcon = (type: "CASH" | "BANK" | "EWALLET") => {
    switch (type) {
      case "BANK":
        return <Landmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "EWALLET":
        return <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case "CASH":
      default:
        return <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;

    setAddingAccount(true);
    try {
      const initBal = parseFloat(startingBalance) || 0;
      const res = await createAccount(newAccountName.trim(), newAccountType, initBal);
      
      if (!res.success) {
        toast.error(res.error || "Gagal membuat dompet");
        return;
      }

      if (res.account) {
        setAccounts(prev => [...prev, res.account as Account]);
      }
      setNewAccountName("");
      setStartingBalance("");
      setShowAddModal(false);
      toast.success(`Dompet "${res.account?.name || newAccountName}" berhasil dibuat!`);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal membuat dompet");
    } finally {
      setAddingAccount(false);
    }
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setEditAccountName(acc.name);
    setEditAccountType(acc.type);
    setEditAccountBalance(acc.balance.toString());
  };

  const handleEditAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editAccountName.trim()) return;

    setSavingEditAccount(true);
    try {
      const bal = parseFloat(editAccountBalance);
      const res = await updateAccount(
        editingAccount.id,
        editAccountName.trim(),
        editAccountType,
        isNaN(bal) ? 0 : bal
      );

      if (!res.success) {
        toast.error(res.error || "Gagal memperbarui dompet");
        return;
      }

      if (res.account) {
        setAccounts(prev => prev.map(a => a.id === editingAccount.id ? { ...a, ...res.account } : a));
      }
      setEditingAccount(null);
      toast.success("Dompet & saldo berhasil diperbarui!");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui dompet");
    } finally {
      setSavingEditAccount(false);
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`Hapus dompet "${name}"? Pastikan saldo sudah 0 atau dipindahkan.`)) return;

    try {
      const res = await deleteAccount(id);
      if (!res.success) {
        toast.error(res.error || "Gagal menghapus dompet");
        return;
      }
      setAccounts(prev => prev.filter(a => a.id !== id));
      toast.success("Dompet berhasil dihapus");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus dompet");
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(transferAmount);

    if (!fromAccountId || !toAccountId || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Mohon lengkapi data transfer dengan benar");
      return;
    }

    if (fromAccountId === toAccountId) {
      toast.error("Dompet pengirim dan penerima tidak boleh sama");
      return;
    }

    setTransferring(true);
    try {
      const targetDate = parseDateInputToNoonUTC(transferDate);

      const res = await transferFunds(fromAccountId, toAccountId, amountNum, transferNotes, targetDate);
      if (!res.success) {
        toast.error(res.error || "Gagal memproses transfer");
        return;
      }

      // Update local accounts balance
      setAccounts(prev => prev.map(acc => {
        if (acc.id === fromAccountId) return { ...acc, balance: acc.balance - amountNum };
        if (acc.id === toAccountId) return { ...acc, balance: acc.balance + amountNum };
        return acc;
      }));

      const fromAcc = accounts.find(a => a.id === fromAccountId);
      const toAcc = accounts.find(a => a.id === toAccountId);

      // Add to transfer history
      if (fromAcc && toAcc) {
        setTransfers(prev => [{
          id: `t-${Date.now()}`,
          date: targetDate,
          amount: amountNum,
          description: transferNotes,
          fromAccount: fromAcc,
          toAccount: toAcc
        }, ...prev]);
      }

      setTransferAmount("");
      setTransferNotes("");
      setShowTransferModal(false);
      toast.success("Transfer antar dompet berhasil!");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal memproses transfer");
    } finally {
      setTransferring(false);
    }
  };

  const parsedTransferAmount = parseFloat(transferAmount) || 0;

  return (
    <div className="space-y-5">
      {/* Hero Card: Total Saldo Semua Dompet */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-700 via-blue-600 to-blue-500 text-white shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-blue-100 flex items-center gap-1.5 mb-1">
              <Wallet className="w-4 h-4" />
              Total Saldo Semua Dompet
            </p>
            <h2 className="text-3xl font-black tracking-tight">
              {formatter.format(totalBalance)}
            </h2>
            <p className="text-xs text-blue-100 mt-1">
              Tersebar di {accounts.length} akun dompet
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowTransferModal(true)}
              disabled={accounts.length < 2}
              className="px-3.5 py-2 bg-white/20 hover:bg-white/30 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Transfer
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Tambah
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Wallets */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Daftar Dompet ({accounts.length})</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">Pilih untuk mengelola</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {accounts.map(acc => (
            <div 
              key={acc.id} 
              className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-750 flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-700">
                  {getAccountIcon(acc.type)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{acc.name}</h4>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {acc.type === "CASH" ? "Tunai" : acc.type === "BANK" ? "Bank" : "E-Wallet"}
                    </span>
                  </div>
                  <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                    {formatter.format(acc.balance)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(acc)}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                  title="Edit Dompet & Saldo"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                {accounts.length > 1 && (
                  <button
                    onClick={() => handleDeleteAccount(acc.id, acc.name)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                    title="Hapus Dompet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transfers Log */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Riwayat Transfer Antar Dompet
          </h3>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {transfers.length === 0 ? (
            <div className="text-center py-6 px-4 text-xs text-gray-500 dark:text-gray-400">
              Belum ada riwayat transfer antar dompet.
            </div>
          ) : (
            transfers.map(tr => (
              <div key={tr.id} className="p-3.5 flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
                    <span>{tr.fromAccount.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    <span>{tr.toAccount.name}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatDisplayDate(tr.date, "dd MMM yyyy")}
                    {tr.description ? ` • ${tr.description}` : ''}
                  </p>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatter.format(tr.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: Tambah Dompet */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Tambah Dompet Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAccountSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Dompet / Akun
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: BCA, GoPay, Dompet Saku"
                  value={newAccountName}
                  onChange={e => setNewAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tipe Akun
                </label>
                <select 
                  value={newAccountType}
                  onChange={e => setNewAccountType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="CASH">Tunai (Cash / Dompet Fisik)</option>
                  <option value="BANK">Rekening Bank (BCA, Mandiri, BRI, dll)</option>
                  <option value="EWALLET">E-Wallet (GoPay, OVO, ShopeePay, DANA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Saldo Awal (Rp)
                </label>
                <input 
                  type="number" 
                  placeholder="0"
                  min="0"
                  value={startingBalance}
                  onChange={e => setStartingBalance(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={addingAccount}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm disabled:opacity-50 transition-colors"
                >
                  {addingAccount ? "Menyimpan..." : "Simpan Dompet"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transfer Antar Dompet */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Transfer Antar Dompet
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Dari Dompet (Sumber)
                </label>
                <select 
                  value={fromAccountId}
                  onChange={e => setFromAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({formatter.format(a.balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Ke Dompet (Tujuan)
                </label>
                <select 
                  value={toAccountId}
                  onChange={e => setToAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id} disabled={a.id === fromAccountId}>
                      {a.name} ({formatter.format(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nominal Transfer (Rp)
                </label>
                <input 
                  type="number" 
                  required
                  min="1"
                  step="1"
                  placeholder="0"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {parsedTransferAmount > 0 && (
                  <p className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {formatter.format(parsedTransferAmount)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal
                </label>
                <input 
                  type="date" 
                  required
                  value={transferDate}
                  onChange={e => setTransferDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Catatan (Opsional)
                </label>
                <input 
                  type="text" 
                  placeholder="Contoh: Tarik tunai ATM, Top up GoPay"
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={transferring || parsedTransferAmount <= 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm disabled:opacity-50 transition-colors"
                >
                  {transferring ? "Mentransfer..." : "Kirim Transfer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Dompet & Saldo */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Edit Dompet & Nominal
              </h3>
              <button onClick={() => setEditingAccount(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditAccountSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Dompet / Rekening
                </label>
                <input 
                  type="text" 
                  required
                  value={editAccountName}
                  onChange={e => setEditAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Jenis Akun
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["CASH", "BANK", "EWALLET"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditAccountType(t)}
                      className={`py-2 px-2 text-xs font-semibold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        editAccountType === t 
                          ? "bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 shadow-2xs font-bold" 
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750"
                      }`}
                    >
                      {getAccountIcon(t)}
                      {t === "CASH" ? "Tunai" : t === "BANK" ? "Bank" : "E-Wallet"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Saldo / Nominal Saat Ini (Rp)
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                    Koreksi nominal
                  </span>
                </div>
                <input 
                  type="number" 
                  step="any"
                  required
                  value={editAccountBalance}
                  onChange={e => setEditAccountBalance(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Ubah angka ini jika ada salah ketik saldo awal atau penyesuaian selisih uang fisik.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingEditAccount || !editAccountName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm disabled:opacity-50 transition-colors"
                >
                  {savingEditAccount ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

