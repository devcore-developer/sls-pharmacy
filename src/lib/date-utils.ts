// src/lib/date-utils.ts

export type DatePreset = "today" | "last_7" | "last_30" | "all";

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