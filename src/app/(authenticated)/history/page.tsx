import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import HistoryClient from "./HistoryClient";
import { redirect } from "next/navigation";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const transactions = await prisma.transaction.findMany({
    where: {
      category: {
        userId: session.user.id
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

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' }
  });

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' }
  });

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Riwayat Transaksi</h1>
      <HistoryClient 
        initialTransactions={transactions} 
        categories={categories} 
        accounts={accounts}
      />
    </div>
  );
}
