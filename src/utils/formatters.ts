/**
 * formatters.ts
 * ─────────────
 * Centralized date and currency formatting utilities for InvestPro.
 * Enforces UK Standard formats across all application views and reports.
 */

/**
 * Formats any date string, Date object, or timestamp into the UK standard date format: DD/MM/YYYY.
 * Example: 2026-08-22 -> 22/08/2026
 *
 * @param date - Date object, ISO string, or timestamp
 * @param fallback - Fallback string if date is null/undefined/invalid (default: "—")
 */
export function formatUKDate(date?: string | Date | null | number, fallback: string = "—"): string {
  if (!date) return fallback;
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formats any date string or Date object into a readable UK short month format: "DD Mon YYYY".
 * Example: 2026-08-22 -> 22 Aug 2026
 *
 * @param date - Date object, ISO string, or timestamp
 * @param fallback - Fallback string if invalid (default: "—")
 */
export function formatUKDateDisplay(date?: string | Date | null | number, fallback: string = "—"): string {
  if (!date) return fallback;
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats any date with time in UK format: "DD/MM/YYYY, HH:mm".
 * Example: 2026-08-22T14:30:00 -> 22/08/2026, 14:30
 */
export function formatUKDateTime(date?: string | Date | null | number, fallback: string = "—"): string {
  if (!date) return fallback;
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
