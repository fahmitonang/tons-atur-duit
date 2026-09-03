'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createSavingsGoal(
  name: string,
  targetAmount: number,
  targetDate?: Date | null,
  color: string = "#3b82f6"
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!name || !name.trim()) throw new Error("Nama celengan wajib diisi");
  if (!targetAmount || isNaN(targetAmount) || targetAmount <= 0) {
    throw new Error("Target nominal harus lebih dari 0");
  }

  const goal = await prisma.savingsGoal.create({
    data: {
      name: name.trim(),
      targetAmount,
      targetDate: targetDate || null,
      color,
      userId: session.user.id
    }
  });

  revalidatePath("/savings");
  revalidatePath("/dashboard");

  return goal;
}

export async function updateSavingsGoal(
  id: string,
  name: string,
  targetAmount: number,
  targetDate?: Date | null,
  color: string = "#3b82f6"
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!name || !name.trim()) throw new Error("Nama celengan wajib diisi");
  if (!targetAmount || isNaN(targetAmount) || targetAmount <= 0) {
    throw new Error("Target nominal harus lebih dari 0");
  }

  const goal = await prisma.savingsGoal.findFirst({
    where: { id, userId: session.user.id }
  });

  if (!goal) throw new Error("Target tabungan tidak ditemukan");

  const updated = await prisma.savingsGoal.update({
    where: { id },
    data: {
      name: name.trim(),
      targetAmount,
      targetDate: targetDate || null,
      color
    }
  });

  revalidatePath("/savings");
  revalidatePath("/dashboard");

  return updated;
}

export async function deleteSavingsGoal(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const goal = await prisma.savingsGoal.findFirst({
    where: { id, userId: session.user.id }
  });

  if (!goal) throw new Error("Target tabungan tidak ditemukan");

  await prisma.$transaction(async (tx) => {
    // If goal has funds, refund back to user's first account so funds aren't lost
    if (goal.currentAmount > 0) {
      const primaryAcc = await tx.account.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" }
      });

      if (primaryAcc) {
        await tx.account.update({
          where: { id: primaryAcc.id },
          data: { balance: { increment: goal.currentAmount } }
        });
      }
    }

    await tx.savingsGoal.delete({
      where: { id }
    });
  });

  revalidatePath("/savings");
  revalidatePath("/dashboard");
  revalidatePath("/wallets");
}

export async function depositToGoal(
  goalId: string,
  accountId: string,
  amount: number,
  note?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!amount || isNaN(amount) || amount <= 0) {
    throw new Error("Nominal setor harus lebih dari 0");
  }

  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId: session.user.id }
  });
  if (!goal) throw new Error("Target tabungan tidak ditemukan");

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: session.user.id }
  });
  if (!account) throw new Error("Dompet sumber tidak valid");

  if (account.balance < amount) {
    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
    throw new Error(`Saldo dompet ${account.name} (${formatter.format(account.balance)}) tidak mencukupi untuk setor ${formatter.format(amount)}`);
  }

  await prisma.$transaction([
    // Deduct from wallet
    prisma.account.update({
      where: { id: accountId },
      data: { balance: { decrement: amount } }
    }),
    // Increment goal currentAmount
    prisma.savingsGoal.update({
      where: { id: goalId },
      data: { currentAmount: { increment: amount } }
    }),
    // Create log
    prisma.savingsGoalLog.create({
      data: {
        goalId,
        accountId,
        amount,
        note: note?.trim() || "Setoran tabungan",
        date: new Date()
      }
    })
  ]);

  revalidatePath("/savings");
  revalidatePath("/dashboard");
  revalidatePath("/wallets");
}

export async function withdrawFromGoal(
  goalId: string,
  accountId: string,
  amount: number,
  note?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!amount || isNaN(amount) || amount <= 0) {
    throw new Error("Nominal penarikan harus lebih dari 0");
  }

  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId: session.user.id }
  });
  if (!goal) throw new Error("Target tabungan tidak ditemukan");

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: session.user.id }
  });
  if (!account) throw new Error("Dompet tujuan tidak valid");

  if (goal.currentAmount < amount) {
    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
    throw new Error(`Saldo celengan (${formatter.format(goal.currentAmount)}) tidak mencukupi untuk ditarik ${formatter.format(amount)}`);
  }

  await prisma.$transaction([
    // Deduct from goal
    prisma.savingsGoal.update({
      where: { id: goalId },
      data: { currentAmount: { decrement: amount } }
    }),
    // Increment wallet
    prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: amount } }
    }),
    // Create log
    prisma.savingsGoalLog.create({
      data: {
        goalId,
        accountId,
        amount: -amount,
        note: note?.trim() || "Penarikan tabungan",
        date: new Date()
      }
    })
  ]);

  revalidatePath("/savings");
  revalidatePath("/dashboard");
  revalidatePath("/wallets");
}

