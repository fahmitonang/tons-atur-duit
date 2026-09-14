import prisma from "./prisma";
import { getBillingPeriod } from "./period";
import { toJakartaYMD } from "./dateUtils";

export type FinancialTelemetry = {
  userName: string;
  paydayCutoffDay: number;
  periodLabel: string;
  daysPassed: number;
  daysRemaining: number;
  totalDaysInPeriod: number;
  totalWalletBalance: number;
  accounts: Array<{ name: string; type: string; balance: number }>;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  dailyAverageSpend: number;
  projectedPeriodExpense: number;
  categories: Array<{
    name: string;
    type: "INCOME" | "EXPENSE";
    totalSpent: number;
    budgetLimit: number | null;
    percentUsed: number | null;
    isOverBudget: boolean;
  }>;
  savingsGoals: Array<{
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string | null;
    percentAchieved: number;
  }>;
  recentExpenses: Array<{
    category: string;
    amount: number;
    date: string;
    description: string | null;
    paymentMethod: string;
  }>;
};

export type AiAnalysisResult = {
  healthScore: number;
  healthStatus: "Sangat Baik" | "Baik" | "Stabil" | "Perlu Perhatian" | "Kritis";
  summary: string;
  cashflowVerdict: string;
  burnRateAnalysis: {
    dailyAverageSpend: number;
    safeDailyBudget: number;
    status: "Aman" | "Waspada" | "Boros";
    advice: string;
  };
  strengths: string[];
  warnings: string[];
  goalsReview: Array<{
    goalName: string;
    status: "Sangat Realistis" | "On Track" | "Perlu Percepatan" | "Berisiko Terlambat";
    analysis: string;
    recommendedMonthlySavings: number;
  }>;
  actionableTips: Array<{
    title: string;
    description: string;
    priority: "TINGGI" | "SEDANG" | "RENDAH";
    impact: string;
  }>;
};

const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest"
];

async function callGeminiApi(
  prompt: string,
  systemInstruction?: string,
  jsonMode: boolean = false
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di file .env");
  }

  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload: any = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: jsonMode ? 0.3 : 0.7,
        }
      };

      if (jsonMode) {
        payload.generationConfig.responseMimeType = "application/json";
      }

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `HTTP ${response.status}`;
        lastError = new Error(`Gemini (${model}): ${errorMsg}`);
        continue; // Try next model
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Respon dari Gemini kosong");
      }

      return text;
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error("Gagal menghubungi Google Gemini API");
}

/**
 * Gather complete financial telemetry for a user from the active billing cycle
 */
export async function getFinancialTelemetry(userId: string): Promise<FinancialTelemetry> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true, paydayCutoffDay: true }
  });

  const cutoffDay = user?.paydayCutoffDay || 1;
  const currentDate = new Date();
  const { startDate, endDate, daysRemaining } = getBillingPeriod(currentDate, cutoffDay);

  const totalDays = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const daysPassed = Math.max(1, totalDays - daysRemaining);

  // Accounts
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { balance: "desc" }
  });
  const totalWalletBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Transactions in current billing period
  const transactions = await prisma.transaction.findMany({
    where: {
      category: { userId },
      date: { gte: startDate, lte: endDate }
    },
    include: {
      category: true,
      account: true
    },
    orderBy: { date: "desc" }
  });

  const incomeTx = transactions.filter(t => t.category.type === "INCOME");
  const expenseTx = transactions.filter(t => t.category.type === "EXPENSE");

  const totalIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);
  const netCashflow = totalIncome - totalExpense;

  const dailyAverageSpend = Math.round(totalExpense / daysPassed);
  const projectedPeriodExpense = Math.round(dailyAverageSpend * totalDays);

  // Monthly budgets
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const budgets = await prisma.monthlyBudget.findMany({
    where: {
      year: currentYear,
      month: currentMonth,
      category: { userId }
    },
    include: { category: true }
  });

  const budgetMap = new Map<string, number>();
  budgets.forEach(b => budgetMap.set(b.categoryId, b.limit));

  // Category aggregations
  const allCategories = await prisma.category.findMany({
    where: { userId }
  });

  const categorySpendingMap = new Map<string, number>();
  expenseTx.forEach(t => {
    categorySpendingMap.set(t.categoryId, (categorySpendingMap.get(t.categoryId) || 0) + t.amount);
  });

  const categories = allCategories
    .filter(c => c.type === "EXPENSE")
    .map(c => {
      const spent = categorySpendingMap.get(c.id) || 0;
      const limit = budgetMap.get(c.id) || null;
      const percentUsed = limit && limit > 0 ? Math.round((spent / limit) * 100) : null;
      return {
        name: c.name,
        type: c.type,
        totalSpent: spent,
        budgetLimit: limit,
        percentUsed,
        isOverBudget: limit !== null && spent > limit
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);

  // Savings goals
  const savingsGoalsRaw = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" }
  });

  const savingsGoals = savingsGoalsRaw.map(g => ({
    name: g.name,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    targetDate: g.targetDate ? toJakartaYMD(g.targetDate) : null,
    percentAchieved: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0
  }));

  // Recent 10 expenses
  const recentExpenses = expenseTx.slice(0, 10).map(t => ({
    category: t.category.name,
    amount: t.amount,
    date: toJakartaYMD(t.date),
    description: t.description,
    paymentMethod: t.paymentMethod
  }));

  const periodLabel = `${toJakartaYMD(startDate)} s/d ${toJakartaYMD(endDate)}`;

  return {
    userName: user?.name || user?.username || "Pengguna",
    paydayCutoffDay: cutoffDay,
    periodLabel,
    daysPassed,
    daysRemaining,
    totalDaysInPeriod: totalDays,
    totalWalletBalance,
    accounts: accounts.map(a => ({ name: a.name, type: a.type, balance: a.balance })),
    totalIncome,
    totalExpense,
    netCashflow,
    dailyAverageSpend,
    projectedPeriodExpense,
    categories,
    savingsGoals,
    recentExpenses
  };
}

/**
 * Generate Comprehensive AI Financial Health Check & Goals Review
 */
export async function generateAiFinancialAnalysis(telemetry: FinancialTelemetry): Promise<AiAnalysisResult> {
  const systemInstruction = `Anda adalah "Asisten Keuangan Atur Duit", seorang Certified Financial Planner (CFP) profesional berstandar internasional yang bertutur dalam Bahasa Indonesia yang ramah, memotivasi, cerdas, dan berbasis data riil pengguna.
Tugas Anda adalah menganalisis telemetri keuangan pengguna, mengevaluasi kesehatan finansial, menguji kelayakan rencana & celengan impian, serta memberikan saran taktis yang konkret.

Keluaran WAJIB berupa JSON murni sesuai format berikut tanpa teks pembuka/penutup tambahan:
{
  "healthScore": 82, // Nilai integer 0 - 100 berdasarkan rasio tabungan, kestabilan cashflow, dan kepatuhan budget
  "healthStatus": "Baik", // Pilihan: "Sangat Baik" (85-100), "Baik" (70-84), "Stabil" (55-69), "Perlu Perhatian" (40-54), "Kritis" (<40)
  "summary": "Ringkasan padat 2-3 kalimat mengenai kondisi finansial saat ini.",
  "cashflowVerdict": "Penilaian apakah pemasukan mencukupi pengeluaran dan laju sisa uang saat ini.",
  "burnRateAnalysis": {
    "dailyAverageSpend": 120000,
    "safeDailyBudget": 150000,
    "status": "Aman", // "Aman" | "Waspada" | "Boros"
    "advice": "Penjelasan mengenai laju pengeluaran harian terhadap sisa hari siklus gajian."
  },
  "strengths": [
    "Poin kelebihan / kebiasaan baik pengguna dalam mengelola uang."
  ],
  "warnings": [
    "Potensi bahaya, pos bocor, atau overbudget yang perlu segera ditekan."
  ],
  "goalsReview": [
    {
      "goalName": "Nama Celengan Impian",
      "status": "On Track", // "Sangat Realistis" | "On Track" | "Perlu Percepatan" | "Berisiko Terlambat"
      "analysis": "Analisis apakah target tanggal dan nominal tercapai dengan sisa dana bulanan saat ini.",
      "recommendedMonthlySavings": 500000 // Nominal alokasi tabungan bulanan yang disarankan (angka bulat)
    }
  ],
  "actionableTips": [
    {
      "title": "Judul Saran Aksi",
      "description": "Langkah nyata yang dapat langsung dilakukan pengguna minggu ini.",
      "priority": "TINGGI", // "TINGGI" | "SEDANG" | "RENDAH"
      "impact": "Estimasi penghematan (misal: Potensi hemat Rp 250.000/bln)"
    }
  ]
}`;

  const prompt = `Berikut adalah data telemetri keuangan terbaru pengguna "${telemetry.userName}":
${JSON.stringify(telemetry, null, 2)}

Silakan lakukan audit dan analisis mendalam terhadap data di atas. Berikan JSON sesuai schema.`;

  const jsonText = await callGeminiApi(prompt, systemInstruction, true);
  
  try {
    const parsed: AiAnalysisResult = JSON.parse(jsonText);
    return parsed;
  } catch (err) {
    // If json had backticks or formatting
    const cleaned = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  }
}

/**
 * Interactive Financial Plan Consultation (Chat with Gemini CFP)
 */
export async function consultFinancialPlanWithAi(
  telemetry: FinancialTelemetry,
  question: string,
  history: Array<{ question: string; answer: string }> = []
): Promise<string> {
  const systemInstruction = `Anda adalah "Asisten Keuangan Atur Duit", seorang Certified Financial Planner (CFP) pribadi bersertifikat.
Gunakan Bahasa Indonesia yang komunikatif, suportif, realistis, dan berorientasi pada data riil pengguna.
Setiap kali menjawab pertanyaan atau rencana finansial pengguna, hubungkan selalu dengan kondisi keuangan riil mereka saat ini (saldo kas, sisa hari gajian, pemasukan, pengeluaran terbesar, dan celengan impian).
Format jawaban Anda menggunakan Markdown yang rapi dengan bullet points, bolding pada angka penting, dan kesimpulan/rekomendasi konkret di akhir.`;

  let conversationContext = `Data Keuangan Terkini Pengguna (${telemetry.userName}):
- Periode Siklus: ${telemetry.periodLabel} (Sisa ${telemetry.daysRemaining} hari dari ${telemetry.totalDaysInPeriod} hari)
- Saldo Total Dompet/Rekening: Rp ${telemetry.totalWalletBalance.toLocaleString("id-ID")}
- Pemasukan Periode Ini: Rp ${telemetry.totalIncome.toLocaleString("id-ID")}
- Pengeluaran Periode Ini: Rp ${telemetry.totalExpense.toLocaleString("id-ID")}
- Arus Kas Bersih (Net Cashflow): Rp ${telemetry.netCashflow.toLocaleString("id-ID")}
- Rata-rata Belanja Harian (Burn Rate): Rp ${telemetry.dailyAverageSpend.toLocaleString("id-ID")}/hari
- Kategori Pengeluaran Terbesar: ${telemetry.categories.slice(0, 4).map(c => `${c.name}: Rp ${c.totalSpent.toLocaleString("id-ID")}${c.budgetLimit ? ` (Budget: Rp ${c.budgetLimit.toLocaleString("id-ID")})` : ""}`).join(", ")}
- Celengan Impian: ${telemetry.savingsGoals.map(g => `${g.name} (${g.percentAchieved}% dari Rp ${g.targetAmount.toLocaleString("id-ID")})`).join("; ") || "Belum ada"}

Riwayat Konsultasi Sebelumnya:
${history.slice(-3).map(h => `T: ${h.question}\nJ: ${h.answer}`).join("\n\n")}

Pertanyaan / Rencana Pengguna Sekarang:
"${question}"

Silakan berikan masukan, kalkulasi risiko, evaluasi dampak terhadap sisa anggaran dan celengan impian, serta rekomendasi langkah terbaik.`;

  return await callGeminiApi(conversationContext, systemInstruction, false);
}
