'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateTransaction(
  id: string, 
  categoryId: string, 
  amount: number, 
  date: Date, 
  description: string,
  accountId?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!amount || isNaN(amount) || amount <= 0) throw new Error("Jumlah transaksi tidak valid");

  const oldTx = await prisma.transaction.findFirst({
    where: { id, category: { userId: session.user.id } },
    include: { category: true }
  });

  if (!oldTx) throw new Error("Transaksi tidak ditemukan");

  const newCategory = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id }
  });

  if (!newCategory) throw new Error("Kategori baru tidak ditemukan");

  let targetAccountId = accountId !== undefined ? accountId : oldTx.accountId;
  if (targetAccountId) {
    const acc = await prisma.account.findFirst({
      where: { id: targetAccountId, userId: session.user.id }
    });
    if (!acc) targetAccountId = null;
  }

  // Execute ledger adjustment in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Revert old transaction impact
    if (oldTx.accountId) {
      if (oldTx.category.type === "EXPENSE") {
        await tx.account.update({
          where: { id: oldTx.accountId },
          data: { balance: { increment: oldTx.amount } }
        });
      } else {
        await tx.account.update({
          where: { id: oldTx.accountId },
          data: { balance: { decrement: oldTx.amount } }
        });
      }
    }

    // 2. Apply new transaction impact
    if (targetAccountId) {
      if (newCategory.type === "EXPENSE") {
        await tx.account.update({
          where: { id: targetAccountId },
          data: { balance: { decrement: amount } }
        });
      } else {
        await tx.account.update({
          where: { id: targetAccountId },
          data: { balance: { increment: amount } }
        });
      }
    }

    // 3. Update transaction record
    await tx.transaction.update({
      where: { id },
      data: {
        categoryId,
        amount,
        date,
        description: description?.trim() || null,
        accountId: targetAccountId
      }
    });
  });

  revalidatePath("/history");
  revalidatePath("/dashboard");
  revalidatePath("/wallets");
}

export async function deleteTransaction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tx = await prisma.transaction.findFirst({
    where: { id, category: { userId: session.user.id } },
    include: { category: true }
  });

  if (!tx) throw new Error("Transaksi tidak ditemukan");

  await prisma.$transaction(async (prismaTx) => {
    // Refund / reverse account balance if linked to wallet
    if (tx.accountId) {
      if (tx.category.type === "EXPENSE") {
        // Refund expense back to wallet
        await prismaTx.account.update({
          where: { id: tx.accountId },
          data: { balance: { increment: tx.amount } }
        });
      } else {
        // Deduct deleted income from wallet
        await prismaTx.account.update({
          where: { id: tx.accountId },
          data: { balance: { decrement: tx.amount } }
        });
      }
    }

    await prismaTx.transaction.delete({
      where: { id }
    });
  });

  revalidatePath("/history");
  revalidatePath("/dashboard");
  revalidatePath("/wallets");
}
