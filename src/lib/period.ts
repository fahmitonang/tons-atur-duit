import { getJakartaDateParts, getWIBStartOfDayInUTC, getWIBEndOfDayInUTC } from "./dateUtils";

/**
 * Helper to compute active and previous billing periods based on payday cutoff day (1-28).
 * Accurately aligns start and end timestamps to Asia/Jakarta (WIB) boundaries in UTC.
 */
export function getBillingPeriod(referenceDate: Date = new Date(), cutoffDay: number = 1) {
  const { year, month: month1Indexed, day } = getJakartaDateParts(referenceDate);
  const month = month1Indexed - 1; // 0-indexed month

  const safeCutoff = Math.max(1, Math.min(28, cutoffDay || 1));

  let startDate: Date;
  let endDate: Date;

  if (safeCutoff === 1) {
    startDate = getWIBStartOfDayInUTC(year, month, 1);
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    endDate = getWIBEndOfDayInUTC(year, month, lastDayOfMonth);
  } else {
    if (day >= safeCutoff) {
      startDate = getWIBStartOfDayInUTC(year, month, safeCutoff);
      endDate = getWIBEndOfDayInUTC(year, month + 1, safeCutoff - 1);
    } else {
      startDate = getWIBStartOfDayInUTC(year, month - 1, safeCutoff);
      endDate = getWIBEndOfDayInUTC(year, month, safeCutoff - 1);
    }
  }

  // Previous period for Month-over-Month comparison
  let prevStartDate: Date;
  let prevEndDate: Date;

  if (safeCutoff === 1) {
    const lastDayOfPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    prevStartDate = getWIBStartOfDayInUTC(year, month - 1, 1);
    prevEndDate = getWIBEndOfDayInUTC(year, month - 1, lastDayOfPrevMonth);
  } else {
    if (day >= safeCutoff) {
      prevStartDate = getWIBStartOfDayInUTC(year, month - 1, safeCutoff);
      prevEndDate = getWIBEndOfDayInUTC(year, month, safeCutoff - 1);
    } else {
      prevStartDate = getWIBStartOfDayInUTC(year, month - 2, safeCutoff);
      prevEndDate = getWIBEndOfDayInUTC(year, month - 1, safeCutoff - 1);
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
