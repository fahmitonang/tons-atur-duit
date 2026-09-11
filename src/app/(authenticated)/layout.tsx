import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="pb-16 min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <main className="max-w-lg mx-auto w-full min-h-screen bg-white dark:bg-gray-900 shadow-sm transition-colors flex flex-col">
        <TopBar user={session.user} />
        <div className="flex-1">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

