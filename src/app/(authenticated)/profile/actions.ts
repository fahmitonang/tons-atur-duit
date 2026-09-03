'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updatePaydayCutoff(day: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const safeDay = Math.max(1, Math.min(28, Math.round(day)));

  await prisma.user.update({
    where: { id: session.user.id },
    data: { paydayCutoffDay: safeDay }
  });

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/settings");
  revalidatePath("/transaction");
  revalidatePath("/history");

  return { success: true, paydayCutoffDay: safeDay };
}

export async function getUserSettings() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      paydayCutoffDay: true
    }
  });

  return user;
}

