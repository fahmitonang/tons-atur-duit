import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { format } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const whereClause: any = {
      category: { userId: session.user.id }
    };

    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      if (!isNaN(m) && !isNaN(y) && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0, 23, 59, 59, 999);
        whereClause.date = { gte: startDate, lte: endDate };
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
        account: true
      },
      orderBy: { date: "desc" }
    });

    // Generate CSV lines
    const headers = ["ID", "Tanggal", "Kategori", "Jenis", "Dompet", "Nominal (Rp)", "Keterangan"];
    const rows = transactions.map(t => {
      const formattedDate = format(new Date(t.date), "yyyy-MM-dd");
      const categoryName = `"${(t.category?.name || "").replace(/"/g, '""')}"`;
      const type = t.category?.type === "INCOME" ? "Pemasukan" : "Pengeluaran";
      const accountName = `"${(t.account?.name || "Tunai").replace(/"/g, '""')}"`;
      const amount = t.amount;
      const desc = `"${(t.description || "").replace(/"/g, '""')}"`;

      return [t.id, formattedDate, categoryName, type, accountName, amount, desc].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    const filename = `transaksi-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error("CSV Export error:", error);
    return NextResponse.json({ message: "Gagal mengekspor data" }, { status: 500 });
  }
}
