// src/lib/date-utils.ts

export type DatePreset = "today" | "last_7" | "last_30" | "this_month" | "last_month" | "this_year" | "all";

export function getDateRange(
  preset: DatePreset,
  customFrom?: Date,
  customTo?: Date
): { from: Date | null; to: Date | null } {
  if (preset === "all" && !customFrom && !customTo) {
    return { from: null, to: null };
  }

  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      return { from: startOfToday, to: now };
    case "last_7": {
      const from = new Date(startOfToday);
      from.setDate(from.getDate() - 6);
      return { from, to: now };
    }
    case "last_30": {
      const from = new Date(startOfToday);
      from.setDate(from.getDate() - 29);
      return { from, to: now };
    }
    case "this_month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: now };
    }
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from, to };
    }
    case "this_year": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: now };
    }
    default: {
      if (customFrom || customTo) {
        const from = customFrom
          ? (() => { const d = new Date(customFrom); d.setHours(0, 0, 0, 0); return d; })()
          : null;
        const to = customTo
          ? (() => { const d = new Date(customTo); d.setHours(23, 59, 59, 999); return d; })()
          : null;
        return { from, to };
      }
      return { from: null, to: null };
    }
  }
}

export function isDateInRange(
  date: Date,
  from: Date | null,
  to: Date | null
): boolean {
  if (!from && !to) return true;
  const d = date.getTime();
  if (from && d < from.getTime()) return false;
  if (to && d > to.getTime()) return false;
  return true;
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateOnly(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const DATE_PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "last_7", label: "Last 7 Days" },
  { value: "last_30", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_year", label: "This Year" },
];