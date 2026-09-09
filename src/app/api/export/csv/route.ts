import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { getPaymentMethodLabel } from "@/lib/paymentMethod";
import { toJakartaYMD, getWIBStartOfDayInUTC, getWIBEndOfDayInUTC } from "@/lib/dateUtils";

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
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const startDate = getWIBStartOfDayInUTC(y, m - 1, 1);
        const endDate = getWIBEndOfDayInUTC(y, m - 1, lastDay);
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
    const headers = ["ID", "Tanggal", "Kategori", "Jenis", "Dompet", "Metode Pembayaran", "Nominal (Rp)", "Keterangan"];
    const rows = transactions.map(t => {
      const formattedDate = toJakartaYMD(t.date);
      const categoryName = `"${(t.category?.name || "").replace(/"/g, '""')}"`;
      const type = t.category?.type === "INCOME" ? "Pemasukan" : "Pengeluaran";
      const accountName = `"${(t.account?.name || "Tunai").replace(/"/g, '""')}"`;
      const paymentMethod = `"${getPaymentMethodLabel((t as any).paymentMethod)}"`;
      const amount = t.amount;
      const desc = `"${(t.description || "").replace(/"/g, '""')}"`;

      return [t.id, formattedDate, categoryName, type, accountName, paymentMethod, amount, desc].join(",");
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
