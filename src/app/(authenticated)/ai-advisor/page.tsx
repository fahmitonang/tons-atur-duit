"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  Flame, 
  TrendingUp, 
  Lightbulb, 
  Send, 
  Bot, 
  User, 
  Calendar,
  Wallet,
  Clock
} from "lucide-react";
import toast from "react-hot-toast";
import type { AiAnalysisResult } from "@/lib/gemini";

type Consultation = {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
};

export default function AiAdvisorPage() {
  const [activeTab, setActiveTab] = useState<"analysis" | "chat">("analysis");
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Chat Consultation State
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [sendingQuestion, setSendingQuestion] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch cached analysis
  const fetchAnalysis = async () => {
    try {
      const res = await fetch("/api/ai/advisor");
      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
        setUpdatedAt(data.updatedAt);
      }
    } catch {
      toast.error("Gagal memuat analisis AI tersimpan");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Generate or refresh analysis
  const handleRefreshAnalysis = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/ai/advisor", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memperbarui analisis");
      setAnalysis(data.analysis);
      setUpdatedAt(data.updatedAt);
      toast.success("Analisis keuangan berhasil diperbarui!");
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat memproses dengan Gemini");
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch consultations history
  const fetchConsultations = async () => {
    try {
      const res = await fetch("/api/ai/chat");
      const data = await res.json();
      if (data.consultations) {
        setConsultations(data.consultations);
      }
    } catch {}
  };

  useEffect(() => {
    fetchAnalysis();
    fetchConsultations();
  }, []);

  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [consultations, activeTab]);

  // Handle send question
  const handleSendQuestion = async (qText?: string) => {
    const textToSend = qText || questionInput;
    if (!textToSend.trim() || sendingQuestion) return;

    const currentQuestion = textToSend.trim();
    setQuestionInput("");
    setSendingQuestion(true);

    // Optimistic user bubble
    const tempId = `temp-${Date.now()}`;
    const optimisticEntry: Consultation = {
      id: tempId,
      question: currentQuestion,
      answer: "Sedang menganalisis data keuangan Anda...",
      createdAt: new Date().toISOString()
    };
    setConsultations((prev) => [...prev, optimisticEntry]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mengirim pertanyaan");

      setConsultations((prev) =>
        prev.map((c) => (c.id === tempId ? { ...c, id: data.id, answer: data.answer } : c))
      );
    } catch (err: any) {
      toast.error(err.message || "Gagal mendapatkan respon dari AI");
      setConsultations((prev) => prev.filter((c) => c.id !== tempId));
    } finally {
      setSendingQuestion(false);
    }
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return "bg-emerald-500 text-white";
    if (score >= 65) return "bg-blue-500 text-white";
    if (score >= 50) return "bg-amber-500 text-white";
    return "bg-red-500 text-white";
  };

  const quickPrompts = [
    "Apakah budget bulanan saya aman sampai akhir siklus gajian?",
    "Berapa dana darurat ideal untuk kondisi finansial saya saat ini?",
    "Bagaimana strategi terbaik agar celengan impian saya tercapai tepat waktu?",
    "Saya berencana beli gadget baru, apakah kondisi keuangan saya aman?"
  ];

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Asisten Keuangan AI
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Penasihat finansial cerdas didukung Google Gemini 3.6
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefreshAnalysis}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0"
          title="Audit Ulang Data Keuangan"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "Menganalisis..." : "Audit Ulang"}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("analysis")}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "analysis"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-bold"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Audit & Saran Finansial</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "chat"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-bold"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Tanya Rencana (Konsultasi)</span>
        </button>
      </div>

      {/* TAB 1: FINANCIAL AUDIT & TIPS */}
      {activeTab === "analysis" && (
        <div className="space-y-4">
          {loadingAnalysis ? (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Memuat data analisis keuangan...
              </p>
            </div>
          ) : !analysis ? (
            <div className="p-6 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Belum Ada Analisis Tersimpan
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                  Klik tombol di bawah agar Gemini AI melakukan audit menyeluruh terhadap pengeluaran, pemasukan, dan target tabungan Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefreshAnalysis}
                disabled={refreshing}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {refreshing ? "Sedang Menganalisis..." : "Mulai Analisis Keuangan Sekarang"}
              </button>
            </div>
          ) : (
            <>
              {/* Financial Health Score Hero Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-3xl p-5 shadow-lg shadow-indigo-500/10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wider">
                      Skor Kesehatan Finansial
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black tracking-tight">
                        {analysis.healthScore}
                      </span>
                      <span className="text-indigo-200 text-sm font-bold">/ 100</span>
                    </div>
                    <span className={`inline-block text-xs font-extrabold px-2.5 py-0.5 rounded-full ${getScoreBadgeClass(analysis.healthScore)}`}>
                      Kondisi: {analysis.healthStatus}
                    </span>
                  </div>

                  {/* Circular progress representation */}
                  <div className="w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center relative">
                    <div 
                      className="absolute inset-0 rounded-full border-4 border-white border-t-transparent"
                      style={{ transform: `rotate(${Math.round(analysis.healthScore * 3.6)}deg)` }}
                    />
                    <ShieldCheck className="w-8 h-8 text-white/90" />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/15">
                  <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                    {analysis.summary}
                  </p>
                  {updatedAt && (
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-indigo-300">
                      <Clock className="w-3 h-3" />
                      <span>Terakhir diaudit: {new Date(updatedAt).toLocaleString("id-ID")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cashflow & Burn Rate Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Laju Belanja (Burn Rate)
                    </h3>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    analysis.burnRateAnalysis.status === "Aman"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : analysis.burnRateAnalysis.status === "Waspada"
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                      : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                  }`}>
                    {analysis.burnRateAnalysis.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">Rata-rata Belanja</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      Rp {analysis.burnRateAnalysis.dailyAverageSpend.toLocaleString("id-ID")}/hari
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">Batas Aman Harian</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      Rp {analysis.burnRateAnalysis.safeDailyBudget.toLocaleString("id-ID")}/hari
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  {analysis.burnRateAnalysis.advice}
                </p>
              </div>

              {/* Strengths & Warnings Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Strengths */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Hal Positif & Kekuatan</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                    {analysis.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Warnings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Perhatian & Pos Bocor</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                    {analysis.warnings.map((w, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Evaluasi Celengan Impian (Goal Reality Check) */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Evaluasi Celengan & Target Impian
                  </h3>
                </div>

                {analysis.goalsReview.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    Belum ada target impian aktif yang dapat dievaluasi. Tambahkan di menu Celengan Impian.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analysis.goalsReview.map((goal, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {goal.goalName}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            goal.status === "Sangat Realistis" || goal.status === "On Track"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}>
                            {goal.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                          {goal.analysis}
                        </p>
                        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold pt-0.5">
                          💡 Saran Setoran: Rp {goal.recommendedMonthlySavings.toLocaleString("id-ID")}/bulan
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actionable Tips */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Saran Taktis Berhemat
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {analysis.actionableTips.map((tip, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700/80 bg-white dark:bg-gray-800/80 space-y-1 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {tip.title}
                        </span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          tip.priority === "TINGGI"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                            : tip.priority === "SEDANG"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        }`}>
                          Prioritas {tip.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {tip.description}
                      </p>
                      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {tip.impact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: INTERACTIVE CONSULTATION */}
      {activeTab === "chat" && (
        <div className="space-y-4">
          {/* Quick Prompts */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Inspirasi Pertanyaan Cepat:
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {quickPrompts.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendQuestion(q)}
                  disabled={sendingQuestion}
                  className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-medium border border-gray-200 dark:border-gray-700 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Feed */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 min-h-[350px] max-h-[500px] overflow-y-auto space-y-4">
            {consultations.length === 0 ? (
              <div className="text-center py-12 space-y-2 text-gray-400 dark:text-gray-500">
                <Bot className="w-10 h-10 mx-auto text-indigo-400/60" />
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Konsultasikan Rencana Keuangan Anda
                </p>
                <p className="text-[11px] max-w-xs mx-auto text-gray-400">
                  Tanyakan rencana pembelian besar, kelayakan tabungan, atau strategi anggaran. Gemini akan menganalisisnya berdasarkan data keuangan riil Anda.
                </p>
              </div>
            ) : (
              consultations.map((c) => (
                <div key={c.id} className="space-y-3">
                  {/* User bubble */}
                  <div className="flex items-start justify-end gap-2">
                    <div className="max-w-[85%] bg-indigo-600 text-white rounded-2xl rounded-tr-none px-3.5 py-2.5 text-xs shadow-xs leading-relaxed font-medium">
                      {c.question}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* AI response bubble */}
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="max-w-[85%] bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-none px-4 py-3 text-xs shadow-xs leading-relaxed space-y-2">
                      <div className="whitespace-pre-wrap font-sans">
                        {c.answer}
                      </div>
                      <span className="text-[10px] text-gray-400 block text-right pt-1">
                        {new Date(c.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Question Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Tanyakan rencana keuangan Anda ke Gemini..."
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              disabled={sendingQuestion}
              className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={!questionInput.trim() || sendingQuestion}
              className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-all disabled:opacity-40 cursor-pointer shrink-0"
              title="Kirim Pertanyaan"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
