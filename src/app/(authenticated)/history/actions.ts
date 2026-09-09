'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseDateInputToNoonUTC, toJakartaYMD } from "@/lib/dateUtils";

export async function updateTransaction(
  id: string, 
  categoryId: string, 
  amount: number, 
  date: Date | string, 
  description: string,
  accountId?: string,
  paymentMethod?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (!amount || isNaN(amount) || amount <= 0) {
    return { success: false, error: "Jumlah transaksi tidak valid" };
  }

  const validMethods = ["CASH", "QRIS", "TRANSFER", "DEBIT_CARD", "CREDIT_CARD", "EWALLET", "OTHER"];

  // Normalize accountId: empty string → null, undefined → keep old
  const normalizedAccountId: string | null | undefined =
    accountId === "" ? null : accountId;

  // Normalize date to safe Noon UTC to prevent timezone day shift
  const targetDate = typeof date === "string"
    ? parseDateInputToNoonUTC(date)
    : parseDateInputToNoonUTC(toJakartaYMD(date));

  try {
    // All reads and writes inside $transaction to prevent race conditions
    await prisma.$transaction(async (tx) => {
      // 1. Read old transaction atomically
      const oldTx = await tx.transaction.findFirst({
        where: { id, category: { userId: session.user.id } },
        include: { category: true }
      });

      if (!oldTx) throw new Error("Transaksi tidak ditemukan");

      // 2. Verify new category belongs to user
      const newCategory = await tx.category.findFirst({
        where: { id: categoryId, userId: session.user.id }
      });

      if (!newCategory) throw new Error("Kategori baru tidak ditemukan");

      // 3. Determine target account
      let targetAccountId: string | null;
      if (normalizedAccountId !== undefined) {
        targetAccountId = normalizedAccountId;
      } else {
        targetAccountId = oldTx.accountId;
      }

      // 4. Validate target account if specified
      if (targetAccountId) {
        const acc = await tx.account.findFirst({
          where: { id: targetAccountId, userId: session.user.id }
        });
        if (!acc) targetAccountId = null;
      }

      // 5. Revert old transaction impact on balance
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

      // 6. Apply new transaction impact
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

      const method = paymentMethod && validMethods.includes(paymentMethod)
        ? (paymentMethod as any)
        : oldTx.paymentMethod;

      // 7. Update transaction record
      await tx.transaction.update({
        where: { id },
        data: {
          categoryId,
          amount,
          date: targetDate,
          description: description?.trim() || null,
          accountId: targetAccountId,
          paymentMethod: method
        }
      });
    });

    revalidatePath("/history");
    revalidatePath("/dashboard");
    revalidatePath("/wallets");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Gagal memperbarui transaksi" };
  }
}

export async function deleteTransaction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    // All reads and writes inside $transaction to prevent race conditions
    await prisma.$transaction(async (prismaTx) => {
      const tx = await prismaTx.transaction.findFirst({
        where: { id, category: { userId: session.user.id } },
        include: { category: true }
      });

      if (!tx) throw new Error("Transaksi tidak ditemukan");

      // Refund / reverse account balance if linked to wallet
      if (tx.accountId) {
        if (tx.category.type === "EXPENSE") {
          await prismaTx.account.update({
            where: { id: tx.accountId },
            data: { balance: { increment: tx.amount } }
          });
        } else {
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

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Gagal menghapus transaksi" };
  }
}
