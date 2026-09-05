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
/*  Optimized Dashboard Loader                                         */
/* ------------------------------------------------------------------ */

export async function loadDashboardData(): Promise<DashboardData> {
  const db = await getDb();

  // 1. Fetch ONLY counts and active batches (No toArray on medicines!)
  const [
    totalMedicines,
    activeBatches,
    activeConvoysList,
    convoys,
    convoyItems,
    movements,
    categoryRecords,
    pharmClassRecords,
    medCats,
    medClasses,
  ] = await Promise.all([
    db.medicines.filter(m => !m.archivedAt).count(),
    db.batches.filter(b => !b.archivedAt).toArray(),
    db.convoys.filter(c => c.status === "ACTIVE").toArray(),
    db.convoys.toArray(), 
    db.convoyItems.toArray(),
    db.stockMovements.reverse().limit(8).toArray(), // Efficient recent movements
    db.categories.toArray(),
    db.pharmacologicalClasses.toArray(),
    db.medicineCategories.toArray(),
    db.medicinePharmacologicalClasses.toArray(),
  ]);

  /* --- Maps -------------------------------------------------------- */
  // To avoid loading 30k medicines into memory, we only fetch the names 
  // for the batches and movements we actually need to display.
  const neededMedIds = new Set<string>();
  activeBatches.forEach(b => neededMedIds.add(b.medicineId));
  movements.forEach(m => neededMedIds.add(m.medicineId));
  
  const medsNeeded = neededMedIds.size > 0 
    ? await db.medicines.where("id").anyOf([...neededMedIds]).toArray() 
    : [];
    
  const medMap = new Map(medsNeeded.map((m) => [m.id!, m]));
  const catMap = new Map(categoryRecords.map((c) => [c.id!, c]));
  const classMap = new Map(pharmClassRecords.map((c) => [c.id!, c]));

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

  const summary: DashboardSummary = {
    totalMedicines,
    totalBatches: activeBatches.length,
    totalStock,
    lowStockCount,
    expiringSoonCount,
    expiredCount,
    activeConvoyCount: activeConvoysList.length,
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
  const recentMovements: RecentMovementItem[] = movements.map((m) => {
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

  const activeConvoys: ActiveConvoyItem[] = activeConvoysList.map((c) => {
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

  /* --- Categories & Classes (Using string fields directly) -------- */
  // Since the CSV import maps category and drugClass as direct string properties
  // on the Medicine model, we calculate counts based on those strings.
  const catCounts = new Map<string, number>();
  const classCounts = new Map<string, number>();

  // We need to fetch only active medicines' categories and classes
  // To do this efficiently without loading 30k records, we use the medCats relation 
  // (which is small) OR fallback to the string counts if relations weren't populated.
  
  for (const mc of medCats) {
    catCounts.set(mc.categoryId, (catCounts.get(mc.categoryId) || 0) + 1);
  }
  
  const categoryCounts: CategoryCount[] = [...catCounts]
    .map(([id, count]) => {
      const cat = catMap.get(id);
      return { id, name: cat?.name || "Unknown", count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  for (const mc of medClasses) {
    classCounts.set(mc.pharmacologicalClassId, (classCounts.get(mc.pharmacologicalClassId) || 0) + 1);
  }
  
  const classCountsResult: ClassCount[] = [...classCounts]
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
    categories: categoryCounts,
    classes: classCountsResult,
  };
}