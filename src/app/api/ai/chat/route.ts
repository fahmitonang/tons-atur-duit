import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getFinancialTelemetry, consultFinancialPlanWithAi } from "@/lib/gemini";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const history = await prisma.aiConsultation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      take: 20
    });

    return NextResponse.json({ consultations: history });
  } catch (error: any) {
    console.error("Error fetching AI consultations:", error);
    return NextResponse.json(
      { message: error?.message || "Gagal mengambil riwayat konsultasi" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { question } = await req.json();
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { message: "Pertanyaan atau rencana wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Fetch telemetry & recent conversation history
    const telemetry = await getFinancialTelemetry(session.user.id);
    const pastConsultations = await prisma.aiConsultation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 4
    });

    const formattedHistory = pastConsultations.reverse().map((c) => ({
      question: c.question,
      answer: c.answer
    }));

    // 2. Call Gemini
    const answer = await consultFinancialPlanWithAi(
      telemetry,
      question.trim(),
      formattedHistory
    );

    // 3. Save consultation record
    const record = await prisma.aiConsultation.create({
      data: {
        userId: session.user.id,
        question: question.trim(),
        answer
      }
    });

    return NextResponse.json({
      id: record.id,
      question: record.question,
      answer: record.answer,
      createdAt: record.createdAt
    });
  } catch (error: any) {
    console.error("Error in AI consultation:", error);
    return NextResponse.json(
      { message: error?.message || "Gagal memproses konsultasi rencana dengan AI" },
      { status: 500 }
    );
  }
}
