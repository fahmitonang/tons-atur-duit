import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import WalletsClient from "./WalletsClient";

export default async function WalletsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Check if user has at least one account, if not create default "Tunai"
  let accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: { transactions: true }
      }
    },
    orderBy: { createdAt: "asc" }
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
        },
        include: {
          _count: {
            select: { transactions: true }
          }
        }
      });
      accounts = [defaultAcc];
    } catch {
      accounts = await prisma.account.findMany({
        where: { userId: session.user.id },
        include: {
          _count: {
            select: { transactions: true }
          }
        },
        orderBy: { createdAt: "asc" }
      });
    }
  }

  // Get recent transfers
  const recentTransfers = await prisma.transfer.findMany({
    where: { userId: session.user.id },
    include: {
      fromAccount: { select: { id: true, name: true, type: true } },
      toAccount: { select: { id: true, name: true, type: true } }
    },
    orderBy: { date: "desc" },
    take: 20
  });

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dompet & Akun</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Kelola saldo kas, rekening bank, e-wallet, dan transfer dana
        </p>
      </div>

      <WalletsClient 
        initialAccounts={accounts} 
        recentTransfers={recentTransfers} 
      />
    </div>
  );
}

