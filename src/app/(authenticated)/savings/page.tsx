import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import SavingsClient from "./SavingsClient";

export default async function SavingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: session.user.id },
    include: {
      logs: {
        include: {
          account: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" }
  });

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Celengan Impian</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Kelola target tabungan, dana darurat, dan impian masa depan
        </p>
      </div>

      <SavingsClient initialGoals={goals} accounts={accounts} />
    </div>
  );
}

