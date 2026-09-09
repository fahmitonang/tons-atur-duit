import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import TransactionForm from "./TransactionForm";
import { redirect } from "next/navigation";
import { getBillingPeriod } from "@/lib/period";

export default async function TransactionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  // Fetch user settings (paydayCutoffDay)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { paydayCutoffDay: true }
  });

  const cutoffDay = user?.paydayCutoffDay || 1;
  const currentDate = new Date();
  const { startDate, endDate } = getBillingPeriod(currentDate, cutoffDay);
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Categories
  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' }
  });

  // Accounts
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

  // Monthly Budgets
  const budgets = await prisma.monthlyBudget.findMany({
    where: {
      year: currentYear,
      month: currentMonth,
      category: { userId: session.user.id }
    }
  });

  // Current Month Transactions for spent calculations
  const monthTransactions = await prisma.transaction.findMany({
    where: {
      category: { userId: session.user.id },
      date: { gte: startDate, lte: endDate }
    },
    select: { categoryId: true, amount: true }
  });

  const budgetMap: Record<string, { limit: number; currentSpent: number }> = {};
  for (const b of budgets) {
    const spent = monthTransactions
      .filter(t => t.categoryId === b.categoryId)
      .reduce((sum, t) => sum + t.amount, 0);
    budgetMap[b.categoryId] = { limit: b.limit, currentSpent: spent };
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Catat Transaksi</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Pencatatan pemasukan, pengeluaran & monitoring budget langsung
        </p>
      </div>

      <TransactionForm 
        categories={categories} 
        accounts={accounts}
        budgetMap={budgetMap}
      />
    </div>
  );
}
