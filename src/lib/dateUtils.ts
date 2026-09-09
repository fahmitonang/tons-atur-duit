import { format, isToday, isYesterday } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const WIB_OFFSET_HOURS = 7;
export const TIMEZONE_JAKARTA = "Asia/Jakarta";

/**
 * Extracts { year, month (1-12), day, ymd } in Asia/Jakarta (WIB) timezone.
 */
export function getJakartaDateParts(dateInput: Date | string) {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_JAKARTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [year, month, day] = ymd.split("-").map(Number);
  return { year, month, day, ymd };
}

/**
 * Returns a 'YYYY-MM-DD' string in Asia/Jakarta timezone.
 */
export function toJakartaYMD(dateInput: Date | string): string {
  return getJakartaDateParts(dateInput).ymd;
}

/**
 * Converts a date string 'YYYY-MM-DD' from an <input type="date">
 * into a safe UTC Date at 12:00:00 UTC (Noon UTC).
 * 
 * At 12:00:00 UTC:
 * - UTC: same calendar day (12:00)
 * - WIB (UTC+7): same calendar day (19:00)
 * - WITA (UTC+8): same calendar day (20:00)
 * - WIT (UTC+9): same calendar day (21:00)
 * It will NEVER roll over to yesterday or tomorrow across any Indonesian or international timezone.
 */
export function parseDateInputToNoonUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

/**
 * Formats any Date or ISO string for user display in Indonesian (locale: id),
 * using the date parts resolved in Asia/Jakarta.
 */
export function formatDisplayDate(dateInput: Date | string, formatStr: string = "dd MMM yyyy"): string {
  const { year, month, day } = getJakartaDateParts(dateInput);
  const localDate = new Date(year, month - 1, day);
  return format(localDate, formatStr, { locale: idLocale });
}

/**
 * Formats date header with "Hari ini", "Kemarin", or "EEEE, dd MMMM yyyy" in Asia/Jakarta.
 */
export function formatDateHeader(dateInput: Date | string): string {
  const { year, month, day } = getJakartaDateParts(dateInput);
  const localDate = new Date(year, month - 1, day);
  if (isToday(localDate)) return "Hari ini";
  if (isYesterday(localDate)) return "Kemarin";
  return format(localDate, "EEEE, dd MMMM yyyy", { locale: idLocale });
}

/**
 * Creates a Date representing start of day (00:00:00.000) in WIB, converted to UTC.
 */
export function getWIBStartOfDayInUTC(year: number, monthZeroIndexed: number, day: number): Date {
  return new Date(Date.UTC(year, monthZeroIndexed, day, 0, 0, 0, 0) - (WIB_OFFSET_HOURS * 3600 * 1000));
}

/**
 * Creates a Date representing end of day (23:59:59.999) in WIB, converted to UTC.
 */
export function getWIBEndOfDayInUTC(year: number, monthZeroIndexed: number, day: number): Date {
  return new Date(Date.UTC(year, monthZeroIndexed, day, 23, 59, 59, 999) - (WIB_OFFSET_HOURS * 3600 * 1000));
}
