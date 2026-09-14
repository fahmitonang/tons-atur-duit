import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getFinancialTelemetry, generateAiFinancialAnalysis } from "@/lib/gemini";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const cached = await prisma.aiAnalysis.findUnique({
      where: { userId: session.user.id }
    });

    if (!cached) {
      return NextResponse.json({ analysis: null, updatedAt: null });
    }

    try {
      const parsedContent = JSON.parse(cached.contentJson);
      return NextResponse.json({
        analysis: parsedContent,
        updatedAt: cached.updatedAt
      });
    } catch {
      return NextResponse.json({ analysis: null, updatedAt: null });
    }
  } catch (error: any) {
    console.error("Error fetching AI analysis:", error);
    return NextResponse.json(
      { message: error?.message || "Gagal mengambil data analisis AI" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 1. Gather real financial telemetry from user
    const telemetry = await getFinancialTelemetry(session.user.id);

    // 2. Call Google Gemini to analyze
    const analysis = await generateAiFinancialAnalysis(telemetry);

    // 3. Save / Upsert analysis in DB
    const saved = await prisma.aiAnalysis.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        healthScore: analysis.healthScore,
        healthStatus: analysis.healthStatus,
        summary: analysis.summary,
        contentJson: JSON.stringify(analysis)
      },
      update: {
        healthScore: analysis.healthScore,
        healthStatus: analysis.healthStatus,
        summary: analysis.summary,
        contentJson: JSON.stringify(analysis)
      }
    });

    return NextResponse.json({
      analysis,
      updatedAt: saved.updatedAt,
      message: "Analisis keuangan berhasil diperbarui"
    });
  } catch (error: any) {
    console.error("Error generating AI analysis:", error);
    return NextResponse.json(
      { message: error?.message || "Gagal memproses analisis AI" },
      { status: 500 }
    );
  }
}
