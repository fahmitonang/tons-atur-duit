import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertTriangle, 
  PlusCircle, 
  Settings, 
  ArrowRight, 
  CheckCircle2, 
  Calendar, 
  Flame, 
  Target, 
  PieChart as PieIcon,
  BarChart3,
  Percent,
  Sparkles
} from "lucide-react";
import ExpenseDonutChart from "@/components/ExpenseDonutChart";
import DailyTrendChart from "@/components/DailyTrendChart";
import { getBillingPeriod } from "@/lib/period";
import { getPaymentMethodLabel } from "@/lib/paymentMethod";
import { toJakartaYMD, formatDisplayDate } from "@/lib/dateUtils";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) redirect('/login');

  // Fetch user settings (paydayCutoffDay)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { paydayCutoffDay: true }
  });

  const cutoffDay = user?.paydayCutoffDay || 1;
  const currentDate = new Date();
  const { 
    startDate, 
    endDate, 
    prevStartDate, 
    prevEndDate, 
    daysRemaining 
  } = getBillingPeriod(currentDate, cutoffDay);

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Get user accounts
  let accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' }
  });

  if (accounts.length === 0) {
    try {
      const defaultAcc = await prisma.account.upsert({
        where: {
          name_userId: {
            name: "Tunai",
            userId: session.user.id
          }
        },
        update: {},
        create: {
          name: "Tunai",
          type: "CASH",
          balance: 0,
          userId: session.user.id
        }
      });
      accounts = [defaultAcc];
    } catch {
      accounts = await prisma.account.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'asc' }
      });
    }
  }

  const totalWalletBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Get transactions for active billing period
  const transactions = await prisma.transaction.findMany({
    where: {
      category: {
        userId: session.user.id
      },
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      category: true,
      account: true
    },
    orderBy: {
      date: 'desc'
    }
  });

  // Get previous period transactions for Month-over-Month (MoM) comparison
  const prevTransactions = await prisma.transaction.findMany({
    where: {
      category: {
        userId: session.user.id,
        type: "EXPENSE"
      },
      date: {
        gte: prevStartDate,
        lte: prevEndDate
      }
    },
    select: { amount: true }
  });

  const prevTotalExpense = prevTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Calculate current totals
  const incomeTransactions = transactions.filter(t => t.category.type === "INCOME");
  const expenseTransactions = transactions.filter(t => t.category.type === "EXPENSE");

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Month-over-Month comparison logic
  let momDiff = totalExpense - prevTotalExpense;
  let momPct: number | null = null;
  if (prevTotalExpense > 0) {
    momPct = Math.round((Math.abs(momDiff) / prevTotalExpense) * 100);
  }

  // Build daily data for Daily Spending Trend Chart
  const dailyDataMap = new Map<string, number>();
  const startYMD = toJakartaYMD(startDate);
  const endYMD = toJakartaYMD(endDate);
  const [sY, sM, sD] = startYMD.split('-').map(Number);
  const [eY, eM, eD] = endYMD.split('-').map(Number);
  const loopDate = new Date(sY, sM - 1, sD);
  const finishDate = new Date(eY, eM - 1, eD);

  while (loopDate <= finishDate) {
    const key = format(loopDate, "yyyy-MM-dd");
    dailyDataMap.set(key, 0);
    loopDate.setDate(loopDate.getDate() + 1);
  }

  expenseTransactions.forEach(t => {
    const key = toJakartaYMD(t.date);
    if (dailyDataMap.has(key)) {
      dailyDataMap.set(key, (dailyDataMap.get(key) || 0) + t.amount);
    }
  });

  const dailyTrendData = Array.from(dailyDataMap.entries()).map(([dateStr, amount]) => {
    const [y, m, dNum] = dateStr.split('-').map(Number);
    const d = new Date(y, m - 1, dNum);
    return {
      date: d,
      dayLabel: dNum.toString(),
      amount
    };
  });

  // Group expenses for Donut Chart
  const categoryExpenseMap: Record<string, { id: string; name: string; amount: number }> = {};
  expenseTransactions.forEach(t => {
    if (!categoryExpenseMap[t.categoryId]) {
      categoryExpenseMap[t.categoryId] = {
        id: t.categoryId,
        name: t.category.name,
        amount: 0
      };
    }
    categoryExpenseMap[t.categoryId].amount += t.amount;
  });
  const expenseBreakdown = Object.values(categoryExpenseMap).sort((a, b) => b.amount - a.amount);

  // Get budgets with category order
  const budgets = await prisma.monthlyBudget.findMany({
    where: {
      year: currentYear,
      month: currentMonth,
      category: {
        userId: session.user.id
      }
    },
    include: {
      category: true
    },
    orderBy: {
      category: {
        name: 'asc'
      }
    }
  });

  // Calculate overall budget statistics
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalBudgetSpent = budgets.reduce((sum, budget) => {
    const spent = expenseTransactions
      .filter(t => t.categoryId === budget.categoryId)
      .reduce((s, t) => s + t.amount, 0);
    return sum + spent;
  }, 0);

  const remainingOverallBudget = totalBudgetLimit - totalBudgetSpent;
  const isOverallOverbudget = totalBudgetLimit > 0 && totalBudgetSpent > totalBudgetLimit;
  const recommendedDaily = totalBudgetLimit > 0 
    ? Math.max(0, Math.round(remainingOverallBudget / daysRemaining)) 
    : 0;

  // Fetch Savings Goals
  const savingsGoals = await prisma.savingsGoal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 3
  });

  const totalSavedAllGoals = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  });

  // Period Display Label
  const periodLabel = cutoffDay === 1
    ? formatDisplayDate(currentDate, "MMMM yyyy")
    : `${formatDisplayDate(startDate, "d MMM")} - ${formatDisplayDate(endDate, "d MMM yyyy")}`;

  // Recent 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="p-4 space-y-5">
      {/* Header with Custom Billing Period Label */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laporan</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Ringkasan keuangan & kontrol budget</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            {periodLabel}
          </span>
          {cutoffDay > 1 && (
            <p className="text-[10px] text-gray-400 mt-0.5">Siklus gaji: Tgl {cutoffDay}</p>
          )}
        </div>
      </div>

      {/* Dompet / Multi-Wallet Summary Widget */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Saldo Dompet</p>
              <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                {formatter.format(totalWalletBalance)}
              </p>
            </div>
          </div>
          <Link 
            href="/wallets"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Kelola ({accounts.length})
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Quick wallet chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          {accounts.map(acc => (
            <div key={acc.id} className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700 flex items-center gap-1.5 shrink-0">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{acc.name}:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{formatter.format(acc.balance)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Card: Sisa Saldo Periode Ini with Month-over-Month Comparison */}
      <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${
        netBalance >= 0 
          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-500' 
          : 'bg-gradient-to-br from-rose-600 to-red-700 text-white border-rose-500'
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-blue-100 flex items-center gap-1.5 mb-1">
              <Wallet className="w-4 h-4" />
              Arus Kas Bersih Periode Ini
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight">
              {formatter.format(netBalance)}
            </h2>
            <p className="text-xs text-blue-100/90 mt-1">
              Pemasukan {formatter.format(totalIncome)} - Pengeluaran {formatter.format(totalExpense)}
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            netBalance > 0 
              ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-300/30' 
              : netBalance < 0 
              ? 'bg-red-400/20 text-red-100 border border-red-300/30' 
              : 'bg-white/20 text-white'
          }`}>
            {netBalance > 0 ? 'Surplus' : netBalance < 0 ? 'Defisit' : 'Seimbang'}
          </span>
        </div>

        {/* Month-over-Month Comparison Indicator */}
        {prevTotalExpense > 0 && momPct !== null && (
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-blue-100">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Dibandingkan periode lalu:
            </span>
            <span className={`font-bold px-2 py-0.5 rounded-lg ${
              momDiff < 0 
                ? 'bg-emerald-400/20 text-emerald-200' 
                : momDiff > 0 
                ? 'bg-rose-400/25 text-rose-100' 
                : 'bg-white/20'
            }`}>
              {momDiff < 0 ? `Hemat ${momPct}% (${formatter.format(Math.abs(momDiff))})` : momDiff > 0 ? `Naik ${momPct}% (${formatter.format(momDiff)})` : 'Sama persis'}
            </span>
          </div>
        )}
      </div>

      {/* Daily Budget Pacing Card */}
      {totalBudgetLimit > 0 && (
        <div className={`p-4 rounded-2xl border transition-all ${
          isOverallOverbudget
            ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200"
            : "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-200"
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              Kontrol Belanja Harian (Burn Rate)
            </span>
            <span className="text-[11px] font-semibold opacity-75">
              Tersisa {daysRemaining} hari
            </span>
          </div>

          <div className="flex justify-between items-baseline">
            <div>
              <p className="text-xs opacity-80">Jatah aman belanja harian:</p>
              <h3 className="text-xl font-black mt-0.5">
                {isOverallOverbudget ? "Rp 0 / hari (Budget Habis)" : `${formatter.format(recommendedDaily)} / hari`}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-[11px] opacity-80">Sisa budget total:</p>
              <p className="text-sm font-bold">
                {formatter.format(remainingOverallBudget)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Target Tabungan / Celengan Impian Widget */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Celengan & Tabungan Impian</p>
              <p className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                {formatter.format(totalSavedAllGoals)}
              </p>
            </div>
          </div>
          <Link 
            href="/savings"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Lihat Semua ({savingsGoals.length})
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {savingsGoals.length > 0 ? (
          <div className="space-y-2 pt-1">
            {savingsGoals.map(g => {
              const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
              return (
                <div key={g.id} className="text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-gray-800 dark:text-gray-200">
                    <span>{g.name}</span>
                    <span>{formatter.format(g.currentAmount)} / {formatter.format(g.targetAmount)} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: g.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
            Belum ada celengan impian.{" "}
            <Link href="/savings" className="text-emerald-600 font-bold underline">
              Buat target baru
            </Link>
          </div>
        )}
      </div>

      {/* Income & Expense Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Income Card */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Pemasukan</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300 leading-tight">
            {formatter.format(totalIncome)}
          </p>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-1">
            {incomeTransactions.length} transaksi
          </p>
        </div>

        {/* Expense Card */}
        <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Pengeluaran</span>
            <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-lg font-bold text-rose-800 dark:text-rose-300 leading-tight">
            {formatter.format(totalExpense)}
          </p>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/70 mt-1">
            {expenseTransactions.length} transaksi
          </p>
        </div>
      </div>

      {/* Daily Spending Trend Chart Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-2">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Tren Pengeluaran Harian
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">{periodLabel}</span>
        </div>

        <DailyTrendChart dailyData={dailyTrendData} periodLabel={periodLabel} />
      </div>

      {/* Visualisasi Donut Chart: Komposisi Pengeluaran */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <PieIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Komposisi Pengeluaran
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">Periode aktif</span>
        </div>

        <ExpenseDonutChart items={expenseBreakdown} />
      </div>

      {/* Monthly Budget Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Status Budget Bulan Ini</h2>
            {budgets.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total terpakai {formatter.format(totalBudgetSpent)} dari {formatter.format(totalBudgetLimit)}
              </p>
            )}
          </div>
          <Link 
            href="/settings" 
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5" />
            Kelola
          </Link>
        </div>

        <div className="p-4 space-y-4">
          {budgets.length === 0 ? (
            <div className="text-center py-6 px-4 space-y-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Belum ada budget yang diatur</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Tentukan limit pengeluaran per kategori untuk memonitor keuangan Anda.
                </p>
              </div>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Atur Budget Sekarang
              </Link>
            </div>
          ) : (
            budgets.map(budget => {
              const spent = expenseTransactions
                .filter(t => t.categoryId === budget.categoryId)
                .reduce((sum, t) => sum + t.amount, 0);

              const rawPercentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
              const displayPercentage = Math.round(rawPercentage);
              const barWidth = Math.min(Math.max(rawPercentage, 0), 100);
              const isOver = spent > budget.limit;
              const isWarning = !isOver && rawPercentage >= 80;
              const sisa = budget.limit - spent;

              return (
                <div key={budget.id} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {budget.category.name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOver 
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' 
                          : isWarning 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }`}>
                        {displayPercentage}%
                      </span>
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {formatter.format(spent)} / {formatter.format(budget.limit)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver 
                          ? 'bg-rose-500' 
                          : isWarning 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  {/* Remaining / Over Indicator */}
                  <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span>
                      {isOver ? (
                        <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Melebihi budget {formatter.format(Math.abs(sisa))}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Sisa budget {formatter.format(sisa)}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recent Transactions Widget */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Transaksi Terakhir</h2>
          <Link 
            href="/history" 
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
          >
            Lihat Semua
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-6 px-4 space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Belum ada transaksi di periode ini.</p>
              <Link
                href="/transaction"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Catat Transaksi Sekarang
              </Link>
            </div>
          ) : (
            recentTransactions.map(t => (
              <div key={t.id} className="p-3.5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                      {t.category.name}
                    </p>
                    {t.account && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded">
                        {t.account.name}
                      </span>
                    )}
                    {t.paymentMethod && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-900/40">
                        {getPaymentMethodLabel(t.paymentMethod)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatDisplayDate(t.date, "dd MMM yyyy")}
                    {t.description ? ` • ${t.description}` : ''}
                  </p>
                </div>
                <p className={`text-sm font-bold ${
                  t.category.type === "INCOME" 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-rose-600 dark:text-rose-400"
                }`}>
                  {t.category.type === "INCOME" ? "+" : "-"}{formatter.format(t.amount)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
