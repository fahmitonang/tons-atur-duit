'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createAccount(name: string, type: "CASH" | "BANK" | "EWALLET", startingBalance: number = 0) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!name || !name.trim()) throw new Error("Nama dompet/akun wajib diisi");

  const existing = await prisma.account.findFirst({
    where: { name: name.trim(), userId: session.user.id }
  });

  if (existing) throw new Error("Dompet dengan nama tersebut sudah ada");

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

  return account;
}

export async function updateAccount(id: string, name: string, type: "CASH" | "BANK" | "EWALLET") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!name || !name.trim()) throw new Error("Nama dompet/akun wajib diisi");

  const account = await prisma.account.findFirst({
    where: { id, userId: session.user.id }
  });

  if (!account) throw new Error("Dompet tidak ditemukan");

  const updated = await prisma.account.update({
    where: { id },
    data: { name: name.trim(), type }
  });

  revalidatePath("/wallets");
  revalidatePath("/dashboard");
  revalidatePath("/transaction");

  return updated;
}

export async function deleteAccount(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const account = await prisma.account.findFirst({
    where: { id, userId: session.user.id },
    include: { _count: { select: { transactions: true } } }
  });

  if (!account) throw new Error("Dompet tidak ditemukan");

  const totalAccounts = await prisma.account.count({
    where: { userId: session.user.id }
  });

  if (totalAccounts <= 1) {
    throw new Error("Anda harus memiliki minimal 1 dompet/akun");
  }

  // Prevent accidental destruction of money tracking
  if (Math.abs(account.balance) > 0.01) {
    const formatter = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    });
    throw new Error(
      `Dompet "${account.name}" masih memiliki saldo sebesar ${formatter.format(account.balance)}. Pindahkan saldo terlebih dahulu sebelum menghapus dompet.`
    );
  }

  // Prevent breaking transaction associations
  if (account._count.transactions > 0) {
    throw new Error(
      `Dompet "${account.name}" masih terhubung dengan ${account._count.transactions} riwayat transaksi. Pindahkan transaksi terlebih dahulu.`
    );
  }

  await prisma.account.delete({
    where: { id }
  });

  revalidatePath("/wallets");
  revalidatePath("/dashboard");
  revalidatePath("/transaction");
}

export async function transferFunds(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description: string,
  date: Date
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (fromAccountId === toAccountId) {
    throw new Error("Dompet pengirim dan penerima tidak boleh sama");
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    throw new Error("Nominal transfer harus lebih dari 0");
  }

  const fromAccount = await prisma.account.findFirst({
    where: { id: fromAccountId, userId: session.user.id }
  });

  const toAccount = await prisma.account.findFirst({
    where: { id: toAccountId, userId: session.user.id }
  });

  if (!fromAccount || !toAccount) {
    throw new Error("Akun dompet tidak valid");
  }

  // Check sufficient balance
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

  // Execute transfer in a database transaction
  const [updatedFrom, updatedTo, transferRecord] = await prisma.$transaction([
    // Deduct from source account
    prisma.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: amount } }
    }),
    // Add to target account
    prisma.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: amount } }
    }),
    // Record transfer log
    prisma.transfer.create({
      data: {
        fromAccountId,
        toAccountId,
        amount,
        description: description?.trim() || null,
        date: date || new Date(),
        userId: session.user.id
      },
      include: {
        fromAccount: { select: { id: true, name: true, type: true } },
        toAccount: { select: { id: true, name: true, type: true } }
      }
    })
  ]);

  revalidatePath("/wallets");
  revalidatePath("/dashboard");

  return { updatedFrom, updatedTo, transferRecord };
}
