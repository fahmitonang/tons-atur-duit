"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import toast from "react-hot-toast";
import { 
  createSavingsGoal, 
  updateSavingsGoal, 
  deleteSavingsGoal, 
  depositToGoal, 
  withdrawFromGoal 
} from "./actions";
import { 
  Target, 
  PlusCircle, 
  Sparkles, 
  Trash2, 
  X, 
  Calendar, 
  CheckCircle2, 
  ArrowDownRight, 
  ArrowUpRight, 
  Wallet,
  PartyPopper
} from "lucide-react";

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number;
};

type SavingsGoalLog = {
  id: string;
  amount: number;
  note: string | null;
  date: Date | string;
  account?: { name: string } | null;
};

type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | string | null;
  color: string;
  logs?: SavingsGoalLog[];
};

export default function SavingsClient({
  initialGoals,
  accounts
}: {
  initialGoals: SavingsGoal[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [goals, setGoals] = useState<SavingsGoal[]>(initialGoals);
  const [accountList, setAccountList] = useState<Account[]>(accounts);

  useEffect(() => {
    setGoals(initialGoals);
  }, [initialGoals]);

  useEffect(() => {
    setAccountList(accounts);
  }, [accounts]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<SavingsGoal | null>(null);

  // Add Form State
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [creating, setCreating] = useState(false);

  // Deposit/Withdraw Form State
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || "");
  const [actionAmount, setActionAmount] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  });

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalPercentage = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(targetAmount);
    if (!name.trim() || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Mohon lengkapi nama dan target nominal yang valid");
      return;
    }

    setCreating(true);
    try {
      const dateObj = targetDate ? new Date(targetDate) : null;
      const created = await createSavingsGoal(name.trim(), amountNum, dateObj, color);
      setGoals(prev => [...prev, created]);
      setName("");
      setTargetAmount("");
      setTargetDate("");
      setShowAddModal(false);
      toast.success(`Celengan "${created.name}" berhasil dibuat!`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal membuat target tabungan");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string, currentAmount: number) => {
    let msg = `Hapus celengan "${name}"?`;
    if (currentAmount > 0) {
      msg += ` Saldo terkumpul sebesar ${formatter.format(currentAmount)} akan otomatis dikembalikan ke dompet utama Anda.`;
    }
    if (!confirm(msg)) return;

    try {
      await deleteSavingsGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
      toast.success("Celengan berhasil dihapus");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus celengan");
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoal) return;
    const amountNum = parseFloat(actionAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Nominal setor harus lebih dari 0");
      return;
    }

    setSubmittingAction(true);
    try {
      await depositToGoal(depositGoal.id, selectedAccountId, amountNum, actionNote);
      setGoals(prev => prev.map(g => {
        if (g.id === depositGoal.id) {
          return { ...g, currentAmount: g.currentAmount + amountNum };
        }
        return g;
      }));
      setAccountList(prev => prev.map(a => {
        if (a.id === selectedAccountId) {
          return { ...a, balance: a.balance - amountNum };
        }
        return a;
      }));
      setDepositGoal(null);
      setActionAmount("");
      setActionNote("");
      toast.success(`Berhasil setor ${formatter.format(amountNum)} ke ${depositGoal.name}!`);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyetor dana");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawGoal) return;
    const amountNum = parseFloat(actionAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Nominal tarik harus lebih dari 0");
      return;
    }

    setSubmittingAction(true);
    try {
      await withdrawFromGoal(withdrawGoal.id, selectedAccountId, amountNum, actionNote);
      setGoals(prev => prev.map(g => {
        if (g.id === withdrawGoal.id) {
          return { ...g, currentAmount: g.currentAmount - amountNum };
        }
        return g;
      }));
      setAccountList(prev => prev.map(a => {
        if (a.id === selectedAccountId) {
          return { ...a, balance: a.balance + amountNum };
        }
        return a;
      }));
      setWithdrawGoal(null);
      setActionAmount("");
      setActionNote("");
      toast.success(`Berhasil menarik ${formatter.format(amountNum)} dari ${withdrawGoal.name}!`);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menarik dana");
    } finally {
      setSubmittingAction(false);
    }
  };

  const COLOR_OPTIONS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

  return (
    <div className="space-y-5">
      {/* Hero Card: Total Tabungan Terkumpul */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-emerald-100 flex items-center gap-1.5 mb-1">
              <Target className="w-4 h-4" />
              Total Celengan & Tabungan Impian
            </p>
            <h2 className="text-3xl font-black tracking-tight">
              {formatter.format(totalSaved)}
            </h2>
            <p className="text-xs text-emerald-100 mt-1">
              {totalTarget > 0 ? `Terkumpul ${totalPercentage}% dari target total ${formatter.format(totalTarget)}` : "Belum ada target aktif"}
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-white text-emerald-700 hover:bg-emerald-50 active:scale-95 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Target Baru
          </button>
        </div>

        {/* Global Progress Bar */}
        {totalTarget > 0 && (
          <div className="mt-4 pt-3 border-t border-white/20">
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-700" 
                style={{ width: `${Math.min(totalPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* List of Goals */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Daftar Celengan Impian ({goals.length})</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">Kelola simpanan masa depan</span>
        </div>

        {goals.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Belum Ada Target Celengan</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                Buat celengan untuk rencana beli barang impian, dana darurat, atau liburan Anda.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Buat Target Celengan Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {goals.map(g => {
              const rawPct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
              const pct = Math.round(rawPct);
              const isCompleted = g.currentAmount >= g.targetAmount;
              const remaining = Math.max(0, g.targetAmount - g.currentAmount);

              return (
                <div 
                  key={g.id}
                  className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          {g.name}
                          {isCompleted && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <PartyPopper className="w-3 h-3" />
                              Tercapai!
                            </span>
                          )}
                        </h4>
                        {g.targetDate && (
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            Target: {format(new Date(g.targetDate), "dd MMM yyyy", { locale: idLocale })}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(g.id, g.name, g.currentAmount)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                      title="Hapus Celengan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Amounts & Percentage */}
                  <div className="flex justify-between items-baseline text-xs">
                    <div>
                      <span className="text-[11px] text-gray-400">Terkumpul: </span>
                      <strong className="text-sm font-black text-gray-900 dark:text-white">
                        {formatter.format(g.currentAmount)}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-gray-400">Target: </span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {formatter.format(g.targetAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-700" 
                        style={{ 
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: g.color 
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Progres: {pct}%</span>
                      <span>{isCompleted ? "Sudah lunas 🎉" : `Kurang ${formatter.format(remaining)}`}</span>
                    </div>
                  </div>

                  {/* Deposit & Withdraw Buttons */}
                  <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                    <button
                      onClick={() => { setDepositGoal(g); setActionAmount(""); }}
                      className="flex-1 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      Setor Tabungan
                    </button>

                    {g.currentAmount > 0 && (
                      <button
                        onClick={() => { setWithdrawGoal(g); setActionAmount(""); }}
                        className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Tarik Saldo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Tambah Celengan Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Tambah Celengan Impian</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Target / Celengan
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Dana Darurat, Beli Laptop, Liburan Bali"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Nominal (Rp)
                </label>
                <input 
                  type="number" 
                  required
                  min="1"
                  step="1"
                  placeholder="10000000"
                  value={targetAmount}
                  onChange={e => setTargetAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Tanggal Selesai (Opsional)
                </label>
                <input 
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Pilihan Warna Kartu
                </label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : 'opacity-70'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm disabled:opacity-50 transition-colors"
                >
                  {creating ? "Membuat..." : "Simpan Celengan"}
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

      {/* Modal: Setor ke Celengan */}
      {depositGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                Setor ke: {depositGoal.name}
              </h3>
              <button onClick={() => setDepositGoal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Ambil dari Dompet
                </label>
                <select
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {accountList.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({formatter.format(a.balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nominal Setor (Rp)
                </label>
                <input 
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="0"
                  value={actionAmount}
                  onChange={e => setActionAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Catatan (Opsional)
                </label>
                <input 
                  type="text"
                  placeholder="Contoh: Sisa uang belanja minggu ini"
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm disabled:opacity-50 transition-colors"
                >
                  {submittingAction ? "Menyetor..." : "Konfirmasi Setor"}
                </button>
                <button
                  type="button"
                  onClick={() => setDepositGoal(null)}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tarik dari Celengan */}
      {withdrawGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                Tarik dari: {withdrawGoal.name}
              </h3>
              <button onClick={() => setWithdrawGoal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Kirim ke Dompet
                </label>
                <select
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  {accountList.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({formatter.format(a.balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nominal Tarik (Rp) (Maks: {formatter.format(withdrawGoal.currentAmount)})
                </label>
                <input 
                  type="number"
                  required
                  min="1"
                  max={withdrawGoal.currentAmount}
                  step="1"
                  placeholder="0"
                  value={actionAmount}
                  onChange={e => setActionAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Catatan (Opsional)
                </label>
                <input 
                  type="text"
                  placeholder="Contoh: Butuh darurat untuk servis motor"
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm disabled:opacity-50 transition-colors"
                >
                  {submittingAction ? "Menarik..." : "Konfirmasi Tarik"}
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawGoal(null)}
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

