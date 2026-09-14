"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, TrendingUp } from "lucide-react";
import type { AiAnalysisResult } from "@/lib/gemini";

export default function AiInsightCard() {
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/advisor")
      .then((res) => res.json())
      .then((data) => {
        if (data.analysis) {
          setAnalysis(data.analysis);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800";
    if (score >= 65) return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800";
    if (score >= 50) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800";
    return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800";
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 dark:from-gray-800 dark:via-gray-800/90 dark:to-indigo-950/30 p-4 border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
      {/* Decorative background glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative space-y-3">
        {/* Header with Sparkles badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shadow-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                Asisten Keuangan AI
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1.5 font-medium">
                Gemini 3.6
              </span>
            </div>
          </div>

          {analysis && (
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreColor(analysis.healthScore)} flex items-center gap-1`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Skor: {analysis.healthScore}/100</span>
            </div>
          )}
        </div>

        {/* Content body */}
        {loading ? (
          <div className="py-2 space-y-2 animate-pulse">
            <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4" />
            <div className="h-3 bg-gray-100 dark:bg-gray-700/60 rounded-md w-5/6" />
          </div>
        ) : analysis ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-700 dark:text-gray-200 line-clamp-2 leading-relaxed font-medium">
              {analysis.summary}
            </p>
            {analysis.warnings.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span className="truncate">{analysis.warnings[0]}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
              Analisis cerdas data keuangan & evaluasi rencana impian Anda.
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Dapatkan skor kesehatan finansial, cek celengan, dan saran hemat dari AI.
            </p>
          </div>
        )}

        {/* Call to action button */}
        <div className="pt-1 flex items-center justify-between">
          <Link
            href="/ai-advisor"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group"
          >
            <span>{analysis ? "Buka Analisis Lengkap & Konsultasi" : "Mulai Analisis Keuangan"}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
