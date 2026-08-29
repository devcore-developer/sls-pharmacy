// src/lib/offline/dashboard-repository.ts

import {
  EXPIRY_SOON_DAYS,
  LOW_STOCK_THRESHOLD,
} from "./stock-utils";
import { getMovementTypeLabel, getMovementDirection } from "./stock-utils";

async function getDb() {
  const { db } = await import("./db");
  return db;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DashboardSummary {
  totalMedicines: number;
  totalBatches: number;
  totalStock: number;
  lowStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  activeConvoyCount: number;
}

export interface ExpiryAlertItem {
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  stock: number;
  expiryDate: Date;
  daysUntilExpiry: number;
  priority: "CRITICAL" | "WARNING";
}

export interface ExpiredBatchItem {
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  stock: number;
  expiryDate: Date;
  daysExpired: number;
}

export interface LowStockItem {
  medicineId: string;
  medicineName: string;
  currentStock: number;
  threshold: number;
}

export interface RecentMovementItem {
  id: string;
  medicineName: string;
  typeLabel: string;
  quantity: number;
  direction: "IN" | "OUT" | "NEUTRAL";
  date: Date;
}

export interface ActiveConvoyItem {
  id: string;
  name: string;
  date: string;
  location: string;
  totalTaken: number;
  totalDispensed: number;
  totalRemaining: number;
  itemCount: number;
}

export interface RecentConvoyItem {
  id: string;
  name: string;
  date: string;
  location: string;
  status: string;
  itemCount: number;
  totalTaken: number;
  totalDispensed: number;
  reconciliationStatus: string;
}

export interface CategoryCount {
  id: string;
  name: string;
  count: number;
}

export interface ClassCount {
  id: string;
  name: string;
  count: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  expiryAlerts: ExpiryAlertItem[];
  expiredBatches: ExpiredBatchItem[];
  lowStock: LowStockItem[];
  recentMovements: RecentMovementItem[];
  activeConvoys: ActiveConvoyItem[];
  recentConvoys: RecentConvoyItem[];
  categories: CategoryCount[];
  classes: ClassCount[];
}

/* ------------------------------------------------------------------ */
/*  Single bulk loader — 9 parallel IndexedDB queries, then in-memory  */
/* ------------------------------------------------------------------ */

export async function loadDashboardData(): Promise<DashboardData> {
  const db = await getDb();

  const [
    medicines,
    batches,
    convoys,
    convoyItems,
    movements,
    categoryRecords,        // ← كان: categories
    pharmClassRecords,      // ← كان: pharmacologicalClasses (نفس المشكلة محتملة)
    medCats,
    medClasses,
  ] = await Promise.all([
    db.medicines.toArray(),
    db.batches.toArray(),
    db.convoys.toArray(),
    db.convoyItems.toArray(),
    db.stockMovements.toArray(),
    db.categories.toArray(),
    db.pharmacologicalClasses.toArray(),
    db.medicineCategories.toArray(),
    db.medicinePharmacologicalClasses.toArray(),
  ]);

  /* --- Maps -------------------------------------------------------- */
  const medMap = new Map(medicines.map((m) => [m.id!, m]));
  const catMap = new Map(categoryRecords.map((c) => [c.id!, c]));
  const classMap = new Map(pharmClassRecords.map((c) => [c.id!, c]));

  const activeMeds = new Set(
    medicines.filter((m) => !m.archivedAt).map((m) => m.id!)
  );
  const activeBatches = batches.filter((b) => !b.archivedAt && activeMeds.has(b.medicineId));

  /* --- Summary ----------------------------------------------------- */
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const thresholdEnd = new Date(startOfToday);
  thresholdEnd.setDate(thresholdEnd.getDate() + EXPIRY_SOON_DAYS);
  thresholdEnd.setHours(23, 59, 59, 999);

  let totalStock = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;

  const stockByMed = new Map<string, number>();

  for (const b of activeBatches) {
    totalStock += b.quantity;
    stockByMed.set(b.medicineId, (stockByMed.get(b.medicineId) || 0) + b.quantity);

    const exp = new Date(b.expiryDate);
    exp.setHours(0, 0, 0, 0);
    if (exp < startOfToday) {
      if (b.quantity > 0) expiredCount++;
    } else if (exp <= thresholdEnd) {
      expiringSoonCount++;
    }
  }

  let lowStockCount = 0;
  for (const [, qty] of stockByMed) {
    if (qty > 0 && qty <= LOW_STOCK_THRESHOLD) lowStockCount++;
  }

  const activeConvoyCount = convoys.filter((c) => c.status === "ACTIVE").length;

  const summary: DashboardSummary = {
    totalMedicines: activeMeds.size,
    totalBatches: activeBatches.length,
    totalStock,
    lowStockCount,
    expiringSoonCount,
    expiredCount,
    activeConvoyCount,
  };

  /* --- Expiry Alerts ----------------------------------------------- */
  const expiryAlerts: ExpiryAlertItem[] = [];
  for (const b of activeBatches) {
    const exp = new Date(b.expiryDate);
    exp.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil(
      (exp.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= EXPIRY_SOON_DAYS) {
      const med = medMap.get(b.medicineId);
      expiryAlerts.push({
        medicineId: b.medicineId,
        medicineName: med?.tradeName || "Unknown",
        batchId: b.id!,
        batchNumber: b.batchNumber,
        stock: b.quantity,
        expiryDate: b.expiryDate,
        daysUntilExpiry: daysUntil,
        priority: daysUntil <= 0 ? "CRITICAL" : "WARNING",
      });
    }
  }
  expiryAlerts.sort((a, b) => {
    if (a.daysUntilExpiry <= 0 && b.daysUntilExpiry > 0) return -1;
    if (a.daysUntilExpiry > 0 && b.daysUntilExpiry <= 0) return 1;
    if (a.daysUntilExpiry !== b.daysUntilExpiry) return a.daysUntilExpiry - b.daysUntilExpiry;
    return b.stock - a.stock;
  });

  /* --- Expired Batches --------------------------------------------- */
  const expiredBatches: ExpiredBatchItem[] = expiryAlerts
    .filter((e) => e.priority === "CRITICAL" && e.stock > 0)
    .map((e) => ({
      medicineId: e.medicineId,
      medicineName: e.medicineName,
      batchId: e.batchId,
      batchNumber: e.batchNumber,
      stock: e.stock,
      expiryDate: e.expiryDate,
      daysExpired: Math.abs(e.daysUntilExpiry),
    }));

  /* --- Low Stock --------------------------------------------------- */
  const lowStock: LowStockItem[] = [];
  for (const [medId, qty] of stockByMed) {
    if (qty > 0 && qty <= LOW_STOCK_THRESHOLD) {
      const med = medMap.get(medId);
      lowStock.push({
        medicineId: medId,
        medicineName: med?.tradeName || "Unknown",
        currentStock: qty,
        threshold: LOW_STOCK_THRESHOLD,
      });
    }
  }
  lowStock.sort((a, b) => a.currentStock - b.currentStock);

  /* --- Recent Movements -------------------------------------------- */
  const sortedMovements = [...movements].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  const recentMovements: RecentMovementItem[] = sortedMovements.slice(0, 8).map((m) => {
    const med = medMap.get(m.medicineId);
    return {
      id: m.id!,
      medicineName: med?.tradeName || "Unknown",
      typeLabel: getMovementTypeLabel(m.type),
      quantity: m.quantity,
      direction: getMovementDirection(m.type),
      date: m.createdAt,
    };
  });

  /* --- Convoys ----------------------------------------------------- */
  const itemsByConvoy = new Map<string, typeof convoyItems>();
  for (const item of convoyItems) {
    const list = itemsByConvoy.get(item.convoyId) || [];
    list.push(item);
    itemsByConvoy.set(item.convoyId, list);
  }

  const activeConvoys: ActiveConvoyItem[] = convoys
    .filter((c) => c.status === "ACTIVE")
    .map((c) => {
      const items = itemsByConvoy.get(c.id!) || [];
      const taken = items.reduce((s, i) => s + i.quantityTaken, 0);
      const dispensed = items.reduce((s, i) => s + i.quantityDispensed, 0);
      const returned = items.reduce((s, i) => s + (i.quantityReturned || 0), 0);
      const missing = items.reduce((s, i) => s + (i.quantityMissingOrDamaged || 0), 0);
      return {
        id: c.id!,
        name: c.name,
        date: c.date,
        location: c.location,
        totalTaken: taken,
        totalDispensed: dispensed,
        totalRemaining: taken - dispensed - returned - missing,
        itemCount: items.length,
      };
    });

  const recentConvoys: RecentConvoyItem[] = convoys
    .filter((c) => c.status !== "ACTIVE")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((c) => {
      const items = itemsByConvoy.get(c.id!) || [];
      return {
        id: c.id!,
        name: c.name,
        date: c.date,
        location: c.location,
        status: c.status,
        itemCount: items.length,
        totalTaken: items.reduce((s, i) => s + i.quantityTaken, 0),
        totalDispensed: items.reduce((s, i) => s + i.quantityDispensed, 0),
        reconciliationStatus: c.status === "COMPLETED" ? "RECONCILED" : "PENDING",
      };
    });

  /* --- Categories -------------------------------------------------- */
  const catCounts = new Map<string, number>();
  for (const mc of medCats) {
    if (activeMeds.has(mc.medicineId)) {
      catCounts.set(mc.categoryId, (catCounts.get(mc.categoryId) || 0) + 1);
    }
  }
  const categoryCounts: CategoryCount[] = [...catCounts]
    .map(([id, count]) => {
      const cat = catMap.get(id);
      return { id, name: cat?.name || "Unknown", count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  /* --- Pharmacological Classes -------------------------------------- */
  const classCounts = new Map<string, number>();
  for (const mc of medClasses) {
    if (activeMeds.has(mc.medicineId)) {
      classCounts.set(mc.pharmacologicalClassId, (classCounts.get(mc.pharmacologicalClassId) || 0) + 1);
    }
  }
  const classCounts2: ClassCount[] = [...classCounts]
    .map(([id, count]) => {
      const cls = classMap.get(id);
      return { id, name: cls?.name || "Unknown", count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    summary,
    expiryAlerts,
    expiredBatches,
    lowStock,
    recentMovements,
    activeConvoys,
    recentConvoys,
    categories: categoryCounts,    // ← صح
    classes: classCounts2,          // ← صح
  };
}