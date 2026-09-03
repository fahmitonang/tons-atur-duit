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
  accountId?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!amount || isNaN(amount) || amount <= 0) throw new Error("Jumlah transaksi tidak valid");

  // Verify category belongs to user
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id }
  });

  if (!category) throw new Error("Kategori tidak ditemukan");

  let validAccountId: string | null = null;
  if (accountId) {
    const acc = await prisma.account.findFirst({
      where: { id: accountId, userId: session.user.id }
    });
    if (acc) {
      validAccountId = acc.id;
    }
  }

  // Use transaction to create record and update account balance
  await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        categoryId,
        amount,
        date,
        description,
        accountId: validAccountId
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
}
