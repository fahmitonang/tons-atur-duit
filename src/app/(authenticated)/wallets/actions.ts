'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseDateInputToNoonUTC, toJakartaYMD } from "@/lib/dateUtils";

export async function createAccount(name: string, type: "CASH" | "BANK" | "EWALLET", startingBalance: number = 0) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (!name || !name.trim()) return { success: false, error: "Nama dompet/akun wajib diisi" };

  const existing = await prisma.account.findFirst({
    where: { name: name.trim(), userId: session.user.id }
  });

  if (existing) return { success: false, error: "Dompet dengan nama tersebut sudah ada" };

  const account = await prisma.account.create({
    data: {
      name: name.trim(),
      type,
      balance: isNaN(startingBalance) ? 0 : startingBalance,
      userId: session.user.id
    }
  });

  revalidatePath("/wallets");
  revalidatePath("/dashboard");
  revalidatePath("/transaction");

  return { success: true, account };
}

export async function updateAccount(
  id: string, 
  name: string, 
  type: "CASH" | "BANK" | "EWALLET",
  balance?: number
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (!name || !name.trim()) return { success: false, error: "Nama dompet/akun wajib diisi" };

  const account = await prisma.account.findFirst({
    where: { id, userId: session.user.id }
  });

  if (!account) return { success: false, error: "Dompet tidak ditemukan" };

  const duplicate = await prisma.account.findFirst({
    where: { 
      name: name.trim(), 
      userId: session.user.id,
      NOT: { id }
    }
  });

  if (duplicate) {
    return { success: false, error: `Dompet dengan nama "${name.trim()}" sudah ada` };
  }

  const newBalance = (balance !== undefined && !isNaN(balance)) ? balance : account.balance;

  const updated = await prisma.account.update({
    where: { id },
    data: { 
      name: name.trim(), 
      type,
      balance: newBalance
    }
  });

  revalidatePath("/wallets");
  revalidatePath("/dashboard");
  revalidatePath("/transaction");

  return { success: true, account: updated };
}

export async function deleteAccount(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const account = await prisma.account.findFirst({
    where: { id, userId: session.user.id },
    include: { _count: { select: { transactions: true } } }
  });

  if (!account) return { success: false, error: "Dompet tidak ditemukan" };

  const totalAccounts = await prisma.account.count({
    where: { userId: session.user.id }
  });

  if (totalAccounts <= 1) {
    return { success: false, error: "Anda harus memiliki minimal 1 dompet/akun aktif" };
  }

  // Prevent accidental destruction of money tracking
  if (Math.abs(account.balance) > 0.01) {
    const formatter = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    });
    return {
      success: false,
      error: `Dompet "${account.name}" masih memiliki saldo sebesar ${formatter.format(account.balance)}. Silakan edit saldo menjadi 0 terlebih dahulu atau transfer ke dompet lain.`
    };
  }

  await prisma.account.delete({
    where: { id }
  });

  revalidatePath("/wallets");
  revalidatePath("/dashboard");
  revalidatePath("/transaction");

  return { success: true };
}

export async function transferFunds(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description: string,
  date: Date | string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (fromAccountId === toAccountId) {
    return { success: false, error: "Dompet pengirim dan penerima tidak boleh sama" };
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return { success: false, error: "Nominal transfer harus lebih dari 0" };
  }

  const targetDate = typeof date === "string"
    ? parseDateInputToNoonUTC(date)
    : parseDateInputToNoonUTC(toJakartaYMD(date));

  try {
    // All reads + balance check + writes inside interactive $transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const fromAccount = await tx.account.findFirst({
        where: { id: fromAccountId, userId: session.user.id }
      });

      const toAccount = await tx.account.findFirst({
        where: { id: toAccountId, userId: session.user.id }
      });

      if (!fromAccount || !toAccount) {
        throw new Error("Akun dompet tidak valid");
      }

      // Check sufficient balance (atomically within the transaction)
      if (fromAccount.balance < amount) {
        const formatter = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0
        });
        throw new Error(
          `Saldo tidak mencukupi. Saldo dompet "${fromAccount.name}" saat ini ${formatter.format(fromAccount.balance)}, tidak mencukupi untuk transfer ${formatter.format(amount)}.`
        );
      }

      // Deduct from source account
      const updatedFrom = await tx.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount } }
      });

      // Add to target account
      const updatedTo = await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: amount } }
      });

      // Record transfer log
      const transferRecord = await tx.transfer.create({
        data: {
          fromAccountId,
          toAccountId,
          amount,
          description: description?.trim() || null,
          date: targetDate,
          userId: session.user.id
        },
        include: {
          fromAccount: { select: { id: true, name: true, type: true } },
          toAccount: { select: { id: true, name: true, type: true } }
        }
      });

      return { updatedFrom, updatedTo, transferRecord };
    });

    revalidatePath("/wallets");
    revalidatePath("/dashboard");

    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err?.message || "Gagal memproses transfer" };
  }
}

