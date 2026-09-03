import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import SettingsForm from "./SettingsForm";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) redirect('/login');

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Fetch all categories and their budgets so user can toggle months in UI
  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    include: {
      monthlyBudgets: true
    },
    orderBy: { createdAt: 'asc' }
  });

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengaturan</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Kelola master kategori & alokasi budget bulanan</p>
      </div>
      <SettingsForm 
        initialCategories={categories} 
        currentMonth={currentMonth}
        currentYear={currentYear}
      />
    </div>
  );
}
