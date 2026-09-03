"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { BarChart3, TrendingUp } from "lucide-react";

type DailyData = {
  date: Date;
  dayLabel: string;
  amount: number;
};

export default function DailyTrendChart({
  dailyData,
  periodLabel
}: {
  dailyData: DailyData[];
  periodLabel: string;
}) {
  const [hoveredDay, setHoveredDay] = useState<DailyData | null>(null);

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  });

  const { maxAmount, avgAmount, peakDay, totalPeriodExpense } = useMemo(() => {
    let max = 0;
    let total = 0;
    let peak: DailyData | null = null;

    for (let i = 0; i < dailyData.length; i++) {
      const d = dailyData[i];
      total += d.amount;
      if (d.amount > max) {
        max = d.amount;
        peak = d;
      }
    }

    const avg = dailyData.length > 0 ? total / dailyData.length : 0;

    return {
      maxAmount: Math.max(max, 10000),
      avgAmount: avg,
      peakDay: (peak && peak.amount > 0 ? peak : null) as DailyData | null,
      totalPeriodExpense: total
    };
  }, [dailyData]);

  if (dailyData.length === 0 || totalPeriodExpense === 0) {
    return (
      <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400 space-y-2">
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center mx-auto text-gray-400">
          <BarChart3 className="w-5 h-5" />
        </div>
        <p>Belum ada aktivitas pengeluaran pada periode ini.</p>
      </div>
    );
  }

  // Chart Dimensions
  const chartHeight = 120;
  const chartWidth = 320;
  const barGap = 2;
  const totalBars = dailyData.length;
  const barWidth = Math.max(4, Math.floor((chartWidth - (totalBars - 1) * barGap) / totalBars));
  const svgWidth = totalBars * (barWidth + barGap);

  // Calculate Average Line Y position
  const avgY = chartHeight - (avgAmount / maxAmount) * (chartHeight - 15);

  return (
    <div className="space-y-3">
      {/* Header Info */}
      <div className="flex justify-between items-center text-xs">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Rata-rata Harian:</span>{" "}
          <strong className="text-gray-900 dark:text-white font-bold">{formatter.format(avgAmount)}</strong>
        </div>
        {peakDay && (
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
            <TrendingUp className="w-3 h-3" />
            Puncak: Tgl {peakDay.dayLabel} ({formatter.format(peakDay.amount)})
          </span>
        )}
      </div>

      {/* Interactive Tooltip Card */}
      {hoveredDay && (
        <div className="p-2 rounded-xl bg-gray-900 text-white text-xs flex justify-between items-center animate-fadeIn shadow-sm">
          <span>{format(new Date(hoveredDay.date), "dd MMMM yyyy", { locale: idLocale })}</span>
          <strong className="font-bold text-emerald-400">{formatter.format(hoveredDay.amount)}</strong>
        </div>
      )}

      {/* SVG Bar Chart Container */}
      <div className="w-full overflow-x-auto pb-1 pt-2">
        <svg 
          viewBox={`0 0 ${svgWidth} ${chartHeight + 20}`} 
          className="w-full h-36 min-w-[280px]"
        >
          {/* Average Line */}
          {avgAmount > 0 && (
            <line
              x1="0"
              y1={avgY}
              x2={svgWidth}
              y2={avgY}
              stroke="#94a3b8"
              strokeDasharray="4 3"
              strokeWidth="1"
            />
          )}

          {/* Daily Bars */}
          {dailyData.map((item, idx) => {
            const barHeight = Math.max(3, (item.amount / maxAmount) * (chartHeight - 15));
            const x = idx * (barWidth + barGap);
            const y = chartHeight - barHeight;
            const isPeak = peakDay !== null && peakDay.date.getTime() === item.date.getTime();
            const isHovered = hoveredDay !== null && hoveredDay.date.getTime() === item.date.getTime();

            return (
              <g 
                key={idx}
                className="cursor-pointer transition-opacity group"
                onMouseEnter={() => setHoveredDay(item)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => setHoveredDay(item)}
              >
                {/* Clickable invisible hit-area */}
                <rect
                  x={x}
                  y={0}
                  width={barWidth + barGap}
                  height={chartHeight + 20}
                  fill="transparent"
                />

                {/* Visible bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={barWidth > 6 ? 2 : 1}
                  fill={
                    isHovered
                      ? "#2563eb"
                      : isPeak
                      ? "#f43f5e"
                      : item.amount > 0
                      ? "#60a5fa"
                      : "#e2e8f0"
                  }
                  className="transition-all duration-300 dark:opacity-90"
                />

                {/* Day label every 5 days or 1st & last day */}
                {(idx === 0 || (idx + 1) % 5 === 0 || idx === totalBars - 1) && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 14}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#94a3b8"
                    className="font-medium"
                  >
                    {item.dayLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between items-center text-[10px] text-gray-400 px-1">
        <span>Garis putus-putus: Rata-rata harian</span>
        <span>Ketuk batang untuk melihat tanggal & nominal</span>
      </div>
    </div>
  );
}

