'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseDateInputToNoonUTC, toJakartaYMD } from "@/lib/dateUtils";

export async function addTransaction(
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
  const method = paymentMethod && validMethods.includes(paymentMethod) 
    ? (paymentMethod as any) 
    : "CASH";

  // Normalize date to safe Noon UTC to prevent timezone day shift
  const targetDate = typeof date === "string" 
    ? parseDateInputToNoonUTC(date) 
    : parseDateInputToNoonUTC(toJakartaYMD(date));

  try {
    // Use interactive transaction to verify and create record and update account balance atomically
    await prisma.$transaction(async (tx) => {
      const category = await tx.category.findFirst({
        where: { id: categoryId, userId: session.user.id }
      });

      if (!category) throw new Error("Kategori tidak ditemukan");

      let validAccountId: string | null = null;
      if (accountId) {
        const acc = await tx.account.findFirst({
          where: { id: accountId, userId: session.user.id }
        });
        if (acc) {
          validAccountId = acc.id;
        }
      }

      await tx.transaction.create({
        data: {
          categoryId,
          amount,
          date: targetDate,
          description: description?.trim() || null,
          accountId: validAccountId,
          paymentMethod: method
        }
      });

      if (validAccountId) {
        if (category.type === "EXPENSE") {
          await tx.account.update({
            where: { id: validAccountId },
            data: { balance: { decrement: amount } }
          });
        } else {
          await tx.account.update({
            where: { id: validAccountId },
            data: { balance: { increment: amount } }
          });
        }
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/history");
    revalidatePath("/wallets");
    revalidatePath("/transaction");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Gagal mencatat transaksi" };
  }
}
