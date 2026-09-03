/**
 * Helper to compute active and previous billing periods based on payday cutoff day (1-28).
 */
export function getBillingPeriod(referenceDate: Date = new Date(), cutoffDay: number = 1) {
  const d = new Date(referenceDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  const safeCutoff = Math.max(1, Math.min(28, cutoffDay || 1));

  let startDate: Date;
  let endDate: Date;

  if (safeCutoff === 1) {
    startDate = new Date(year, month, 1, 0, 0, 0, 0);
    endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
  } else {
    if (day >= safeCutoff) {
      startDate = new Date(year, month, safeCutoff, 0, 0, 0, 0);
      endDate = new Date(year, month + 1, safeCutoff - 1, 23, 59, 59, 999);
    } else {
      startDate = new Date(year, month - 1, safeCutoff, 0, 0, 0, 0);
      endDate = new Date(year, month, safeCutoff - 1, 23, 59, 59, 999);
    }
  }

  // Previous period for Month-over-Month comparison
  let prevStartDate: Date;
  let prevEndDate: Date;

  if (safeCutoff === 1) {
    prevStartDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    prevEndDate = new Date(year, month, 0, 23, 59, 59, 999);
  } else {
    if (day >= safeCutoff) {
      prevStartDate = new Date(year, month - 1, safeCutoff, 0, 0, 0, 0);
      prevEndDate = new Date(year, month, safeCutoff - 1, 23, 59, 59, 999);
    } else {
      prevStartDate = new Date(year, month - 2, safeCutoff, 0, 0, 0, 0);
      prevEndDate = new Date(year, month - 1, safeCutoff - 1, 23, 59, 59, 999);
    }
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);
  const now = new Date();
  const daysPassed = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / msPerDay));
  const daysRemaining = Math.max(1, totalDays - daysPassed);

  return {
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    totalDays,
    daysRemaining,
    cutoffDay: safeCutoff
  };
}

