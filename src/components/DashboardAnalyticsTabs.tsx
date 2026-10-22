"use client";

import { useState } from "react";
import { PieChart as PieIcon, BarChart3 } from "lucide-react";
import ExpenseDonutChart from "./ExpenseDonutChart";
import DailyTrendChart from "./DailyTrendChart";

type CategoryExpense = {
  id: string;
  name: string;
  amount: number;
};

type DailyData = {
  date: Date;
  dayLabel: string;
  amount: number;
};

type DashboardAnalyticsTabsProps = {
  expenseBreakdown: CategoryExpense[];
  dailyTrendData: DailyData[];
  periodLabel: string;
};

export default function DashboardAnalyticsTabs({
  expenseBreakdown,
  dailyTrendData,
  periodLabel,
}: DashboardAnalyticsTabsProps) {
  const [activeTab, setActiveTab] = useState<"donut" | "trend">("donut");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-700/80 p-4 space-y-3.5">
      {/* Header & Segmented Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-gray-100 dark:border-gray-700/70">
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Visualisasi Pengeluaran
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Periode {periodLabel}
          </p>
        </div>

        {/* Segmented Control */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("donut")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === "donut"
                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Komposisi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("trend")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === "trend"
                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Tren Harian</span>
          </button>
        </div>
      </div>

      {/* Active Chart Content */}
      <div className="pt-1">
        {activeTab === "donut" ? (
          <ExpenseDonutChart items={expenseBreakdown} />
        ) : (
          <DailyTrendChart dailyData={dailyTrendData} periodLabel={periodLabel} />
        )}
      </div>
    </div>
  );
}

