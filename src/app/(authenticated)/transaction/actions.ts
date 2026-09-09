'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addTransaction(
  categoryId: string, 
  amount: number, 
  date: Date, 
  description: string,
  accountId?: string,
  paymentMethod?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!amount || isNaN(amount) || amount <= 0) throw new Error("Jumlah transaksi tidak valid");

  const validMethods = ["CASH", "QRIS", "TRANSFER", "DEBIT_CARD", "CREDIT_CARD", "EWALLET", "OTHER"];
  const method = paymentMethod && validMethods.includes(paymentMethod) 
    ? (paymentMethod as any) 
    : "CASH";

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
        date,
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
}
