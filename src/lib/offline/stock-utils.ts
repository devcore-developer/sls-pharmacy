import type { ExpiryStatus, StockAvailability } from "@/types";
import type { MovementType, MovementDirection } from "@/types";

/** Number of days before expiry to consider "expiring soon". */
export const EXPIRY_SOON_DAYS = 90;

/** Quantity at or below this is considered "low stock". Configurable — not scattered. */
export const LOW_STOCK_THRESHOLD = 10;

export function getExpiryStatus(expiryDate: Date): ExpiryStatus {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < now) return "expired";

  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + EXPIRY_SOON_DAYS);

  if (expiry <= threshold) return "expiring_soon";

  return "valid";
}

export function getStockAvailability(totalQuantity: number): StockAvailability {
  if (totalQuantity === 0) return "out_of_stock";
  if (totalQuantity <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

export function getNearestExpiry(
  batches: Array<{ expiryDate: Date; archivedAt?: Date | null }>
): Date | null {
  const active = batches.filter((b) => !b.archivedAt);
  if (active.length === 0) return null;
  return active.reduce((nearest, b) =>
    b.expiryDate < nearest.expiryDate ? b : nearest
  ).expiryDate;
}

export function calculateTotalStock(
  batches: Array<{ quantity: number; archivedAt?: Date | null }>
): number {
  return batches.filter((b) => !b.archivedAt).reduce((s, b) => s + b.quantity, 0);
}

export function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getMovementDirection(type: string): MovementDirection {
  switch (type) {
    case "DONATION_IN":
    case "RETURN_TO_WAREHOUSE":
    case "ADJUSTMENT_IN":
      return "IN";
    case "CONVOY_OUT":
    case "ADJUSTMENT_OUT":
      return "OUT";
    default:
      return "NEUTRAL";
  }
}

export function getMovementTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    DONATION_IN: "Donation In",
    CONVOY_OUT: "Convoy Out",
    RETURN_TO_WAREHOUSE: "Return",
    ADJUSTMENT_IN: "Adjustment In",
    ADJUSTMENT_OUT: "Adjustment Out",
    DISPENSE: "Dispensed",
    DISPENSE_ADJUSTMENT: "Dispense Adj.",
  };
  return labels[type] || type;
}