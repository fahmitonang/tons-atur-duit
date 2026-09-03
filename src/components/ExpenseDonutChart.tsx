"use client";

import { useMemo } from "react";
import { PieChart as PieIcon } from "lucide-react";

type CategoryExpense = {
  id: string;
  name: string;
  amount: number;
};

const CHART_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#6366f1", // Indigo
];

export default function ExpenseDonutChart({
  items
}: {
  items: CategoryExpense[];
}) {
  const totalAmount = useMemo(() => items.reduce((sum, i) => sum + i.amount, 0), [items]);

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  });

  // Calculate SVG stroke segments
  // SVG circle radius = 40, circumference = 2 * PI * 40 ≈ 251.327
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;
  const segments = items.map((item, index) => {
    const percent = totalAmount > 0 ? (item.amount / totalAmount) : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativePercent * circumference;
    cumulativePercent += percent;

    return {
      ...item,
      percent: Math.round(percent * 100),
      color: CHART_COLORS[index % CHART_COLORS.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  if (items.length === 0 || totalAmount <= 0) {
    return (
      <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400 space-y-2">
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center mx-auto text-gray-400">
          <PieIcon className="w-5 h-5" />
        </div>
        <p>Belum ada data pengeluaran bulan ini untuk ditampilkan grafik.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Donut Chart SVG Container */}
      <div className="relative flex justify-center items-center py-2">
        <svg viewBox="0 0 100 100" className="w-44 h-44 -rotate-90 transform">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="14"
            className="text-gray-100 dark:text-gray-700/50"
          />

          {/* Segments */}
          {segments.map((seg) => (
            <circle
              key={seg.id}
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth="14"
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              className="transition-all duration-700"
            />
          ))}
        </svg>

        {/* Center Text inside Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
          <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-400 tracking-wider">
            Total Keluar
          </span>
          <span className="text-sm font-black text-gray-900 dark:text-white leading-tight mt-0.5">
            {formatter.format(totalAmount)}
          </span>
        </div>
      </div>

      {/* Breakdown Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
        {segments.map((seg) => (
          <div key={seg.id} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-750/50 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <span 
                className="w-3 h-3 rounded-full shrink-0" 
                style={{ backgroundColor: seg.color }}
              />
              <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                {seg.name}
              </span>
            </div>
            <div className="text-right shrink-0 ml-2">
              <span className="font-bold text-gray-900 dark:text-white">
                {formatter.format(seg.amount)}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1">
                ({seg.percent}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

