'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addCategory(name: string, type: "INCOME" | "EXPENSE") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (!name?.trim()) return { success: false, error: "Nama kategori tidak boleh kosong" };

  const existing = await prisma.category.findFirst({
    where: {
      name: name.trim(),
      type,
      userId: session.user.id
    }
  });

  if (existing) {
    return { success: false, error: `Kategori "${name.trim()}" untuk jenis ini sudah ada` };
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      type,
      userId: session.user.id
    }
  });

  revalidatePath("/settings");
  revalidatePath("/transaction");

  return { success: true, category };
}

export async function updateCategory(
  categoryId: string, 
  name: string,
  type?: "INCOME" | "EXPENSE"
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (!name?.trim()) return { success: false, error: "Nama kategori tidak boleh kosong" };

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
    include: {
      _count: {
        select: { transactions: true, monthlyBudgets: true }
      }
    }
  });

  if (!category) return { success: false, error: "Kategori tidak ditemukan" };

  const targetType = type || category.type;

  // If changing category type, ensure no transactions or budgets exist
  if (targetType !== category.type) {
    if (category._count.transactions > 0) {
      return { 
        success: false, 
        error: `Jenis kategori tidak dapat diubah karena masih terhubung dengan ${category._count.transactions} riwayat transaksi.` 
      };
    }
    if (category._count.monthlyBudgets > 0) {
      return { 
        success: false, 
        error: "Jenis kategori tidak dapat diubah karena masih memiliki data alokasi budget." 
      };
    }
  }

  // Check duplicate
  const duplicate = await prisma.category.findFirst({
    where: {
      name: name.trim(),
      type: targetType,
      userId: session.user.id,
      NOT: { id: categoryId }
    }
  });

  if (duplicate) {
    return { 
      success: false, 
      error: `Kategori "${name.trim()}" untuk jenis ${targetType === "EXPENSE" ? "pengeluaran" : "pemasukan"} sudah ada` 
    };
  }

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: { 
      name: name.trim(),
      type: targetType
    }
  });

  revalidatePath("/settings");
  revalidatePath("/transaction");
  revalidatePath("/dashboard");
  revalidatePath("/history");

  return { success: true, category: updated };
}

export async function deleteCategory(categoryId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
    include: {
      _count: {
        select: { transactions: true }
      }
    }
  });

  if (!category) return { success: false, error: "Kategori tidak ditemukan" };

  // Prevent accidental destruction of transactions and wallet records
  if (category._count.transactions > 0) {
    return {
      success: false,
      error: `Kategori "${category.name}" masih memiliki ${category._count.transactions} transaksi aktif. Anda dapat mengubah nama kategori ini via tombol Edit jika ingin memperbarui namanya.`
    };
  }

  await prisma.category.delete({
    where: { id: categoryId }
  });

  revalidatePath("/settings");
  revalidatePath("/transaction");
  revalidatePath("/dashboard");
  revalidatePath("/history");

  return { success: true };
}

export async function setMonthlyBudget(categoryId: string, limit: number, month: number, year: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (!limit || isNaN(limit) || limit <= 0) return { success: false, error: "Limit budget tidak valid" };
  if (!month || isNaN(month) || month < 1 || month > 12) return { success: false, error: "Bulan tidak valid (1-12)" };
  if (!year || isNaN(year) || year < 2000 || year > 2100) return { success: false, error: "Tahun tidak valid (2000-2100)" };

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id }
  });

  if (!category) return { success: false, error: "Kategori tidak ditemukan" };

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

  return { success: true };
}

export async function deleteMonthlyBudget(categoryId: string, month: number, year: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (!month || isNaN(month) || month < 1 || month > 12) return { success: false, error: "Bulan tidak valid (1-12)" };
  if (!year || isNaN(year) || year < 2000 || year > 2100) return { success: false, error: "Tahun tidak valid (2000-2100)" };

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id }
  });

  if (!category) return { success: false, error: "Kategori tidak ditemukan" };

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

  return { success: true };
}

export async function copyBudgetFromPreviousMonth(targetMonth: number, targetYear: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (!targetMonth || isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
    return { success: false, error: "Bulan target tidak valid (1-12)" };
  }
  if (!targetYear || isNaN(targetYear) || targetYear < 2000 || targetYear > 2100) {
    return { success: false, error: "Tahun target tidak valid (2000-2100)" };
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
    return { success: false, error: `Tidak ada data budget pada bulan sebelumnya (${prevMonth}/${prevYear})` };
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

  return { success: true, copiedCount: prevBudgets.length };
}

