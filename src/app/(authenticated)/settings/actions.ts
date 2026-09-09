'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addCategory(name: string, type: "INCOME" | "EXPENSE") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!name?.trim()) throw new Error("Nama kategori tidak boleh kosong");

  const existing = await prisma.category.findFirst({
    where: {
      name: name.trim(),
      type,
      userId: session.user.id
    }
  });

  if (existing) {
    throw new Error(`Kategori "${name.trim()}" untuk jenis ini sudah ada`);
  }

  await prisma.category.create({
    data: {
      name: name.trim(),
      type,
      userId: session.user.id
    }
  });

  revalidatePath("/settings");
  revalidatePath("/transaction");
}

export async function deleteCategory(categoryId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
    include: {
      _count: {
        select: { transactions: true }
      }
    }
  });

  if (!category) throw new Error("Kategori tidak ditemukan");

  // Prevent accidental destruction of transactions and wallet records
  if (category._count.transactions > 0) {
    throw new Error(
      `Kategori "${category.name}" masih memiliki ${category._count.transactions} transaksi aktif. Hapus atau pindahkan transaksi tersebut terlebih dahulu.`
    );
  }

  await prisma.category.delete({
    where: { id: categoryId }
  });

  revalidatePath("/settings");
  revalidatePath("/transaction");
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

export async function setMonthlyBudget(categoryId: string, limit: number, month: number, year: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!limit || isNaN(limit) || limit <= 0) throw new Error("Limit budget tidak valid");
  if (!month || isNaN(month) || month < 1 || month > 12) throw new Error("Bulan tidak valid (1-12)");
  if (!year || isNaN(year) || year < 2000 || year > 2100) throw new Error("Tahun tidak valid (2000-2100)");

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id }
  });

  if (!category) throw new Error("Kategori tidak ditemukan");

  await prisma.monthlyBudget.upsert({
    where: {
      categoryId_month_year: {
        categoryId,
        month,
        year
      }
    },
    update: {
      limit
    },
    create: {
      categoryId,
      month,
      year,
      limit
    }
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/transaction");
}

export async function deleteMonthlyBudget(categoryId: string, month: number, year: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!month || isNaN(month) || month < 1 || month > 12) throw new Error("Bulan tidak valid (1-12)");
  if (!year || isNaN(year) || year < 2000 || year > 2100) throw new Error("Tahun tidak valid (2000-2100)");

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id }
  });

  if (!category) throw new Error("Kategori tidak ditemukan");

  await prisma.monthlyBudget.deleteMany({
    where: {
      categoryId,
      month,
      year
    }
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/transaction");
}

export async function copyBudgetFromPreviousMonth(targetMonth: number, targetYear: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!targetMonth || isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
    throw new Error("Bulan target tidak valid (1-12)");
  }
  if (!targetYear || isNaN(targetYear) || targetYear < 2000 || targetYear > 2100) {
    throw new Error("Tahun target tidak valid (2000-2100)");
  }

  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;

  const prevBudgets = await prisma.monthlyBudget.findMany({
    where: {
      month: prevMonth,
      year: prevYear,
      category: {
        userId: session.user.id
      }
    }
  });

  if (prevBudgets.length === 0) {
    throw new Error(`Tidak ada data budget pada bulan sebelumnya (${prevMonth}/${prevYear})`);
  }

  for (const b of prevBudgets) {
    await prisma.monthlyBudget.upsert({
      where: {
        categoryId_month_year: {
          categoryId: b.categoryId,
          month: targetMonth,
          year: targetYear
        }
      },
      update: {
        limit: b.limit
      },
      create: {
        categoryId: b.categoryId,
        month: targetMonth,
        year: targetYear,
        limit: b.limit
      }
    });
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/transaction");

  return { copiedCount: prevBudgets.length };
}
