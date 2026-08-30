import type { BatchRecord, CategoryRecord, CartonRecord } from "./db";
import type {
  InventoryBatchRow,
  CategoryItem,
  ExpiryStatus,
  StockAvailability,
  DashboardStats,
  LowStockMedicine,
  PharmacologicalClassItem,
} from "@/types";
import {
  getNearestExpiry,
  getExpiryStatus,
  getStockAvailability,
  LOW_STOCK_THRESHOLD,
  EXPIRY_SOON_DAYS,
} from "./stock-utils";

async function getDb() {
  const { db } = await import("./db");
  return db;
}

/* ------------------------------------------------------------------ */
/*  Batch-level inventory data                                         */
/* ------------------------------------------------------------------ */

export async function getInventoryBatchData(): Promise<{
  rows: InventoryBatchRow[];
  categories: CategoryItem[];
  pharmacologicalClasses: PharmacologicalClassItem[];
  cartons: Array<{ id: string; code: string; label: string }>;
}> {
  const db = await getDb();

  const allBatches = await db.batches.toArray();
  const activeBatches = allBatches.filter((b) => !b.archivedAt);

  if (activeBatches.length === 0) {
    return { rows: [], categories: [], pharmacologicalClasses: [], cartons: [] };
  }

  const medIds = [...new Set(activeBatches.map((b) => b.medicineId))];
  const cartonIds = [
    ...new Set(activeBatches.filter((b) => b.cartonId).map((b) => b.cartonId!)),
  ];

  const [medicines, cartonRecords, medCats, medClasses, allMovements] = await Promise.all([
    medIds.length > 0
      ? db.medicines.where("id").anyOf(medIds).toArray()
      : [],
    cartonIds.length > 0
      ? db.cartons.where("id").anyOf(cartonIds).toArray()
      : [],
    medIds.length > 0
      ? db.medicineCategories.where("medicineId").anyOf(medIds).toArray()
      : [],
    medIds.length > 0
      ? db.medicinePharmacologicalClasses
          .where("medicineId")
          .anyOf(medIds)
          .toArray()
      : [],
    db.stockMovements.toArray(),
  ]);

  const medMap = new Map(medicines.map((m) => [m.id!, m]));
  const cartonMap = new Map(cartonRecords.map((c) => [c.id!, c]));

  // Build section lookup for cartons
  const sectionIds = [...new Set(cartonRecords.filter((c) => c.sectionId).map((c) => c.sectionId!))];
  const sections = sectionIds.length > 0 ? await db.storageSections.where("id").anyOf(sectionIds).toArray() : [];
  const sectionMap = new Map(sections.map((s) => [s.id!, s.name]));

  const catIds = [...new Set(medCats.map((mc) => mc.categoryId))];
  const classIds = [
    ...new Set(medClasses.map((mc) => mc.pharmacologicalClassId)),
  ];
  const [allCats, allClasses] = await Promise.all([
    catIds.length > 0 ? db.categories.where("id").anyOf(catIds).toArray() : [],
    classIds.length > 0
      ? db.pharmacologicalClasses.where("id").anyOf(classIds).toArray()
      : [],
  ]);

  const catsByMed = new Map<string, string[]>();
  for (const mc of medCats) {
    const list = catsByMed.get(mc.medicineId) || [];
    list.push(mc.categoryId);
    catsByMed.set(mc.medicineId, list);
  }
  const classesByMed = new Map<string, string[]>();
  for (const mc of medClasses) {
    const list = classesByMed.get(mc.medicineId) || [];
    list.push(mc.pharmacologicalClassId);
    classesByMed.set(mc.medicineId, list);
  }

  // Last movement per batch
  const lastMovementByBatch = new Map<
    string,
    { type: string; date: Date }
  >();
  for (const m of allMovements) {
    if (!m.batchId) continue;
    const existing = lastMovementByBatch.get(m.batchId);
    if (!existing || m.createdAt > existing.date) {
      lastMovementByBatch.set(m.batchId, { type: m.type, date: m.createdAt });
    }
  }

  const rows: InventoryBatchRow[] = activeBatches.map((b) => {
    const med = medMap.get(b.medicineId);
    const carton = b.cartonId ? cartonMap.get(b.cartonId) : null;
    const expiryStatus: ExpiryStatus = getExpiryStatus(b.expiryDate);
    const stockStatus: StockAvailability = getStockAvailability(b.quantity);
    const sectionId = carton?.sectionId ?? null;
    const sectionName = sectionId ? (sectionMap.get(sectionId) ?? null) : null;

    return {
      medicineId: b.medicineId,
      medicineName: med?.tradeName || "Unknown",
      genericName: med?.genericName || "",
      batchId: b.id!,
      batchNumber: b.batchNumber,
      cartonId: b.cartonId ?? null,
      cartonCode: carton?.code ?? null,
      cartonLabel: carton?.label ?? null,
      sectionId,
      sectionName,
      currentQuantity: b.quantity,
      expiryDate: b.expiryDate,
      expiryStatus,
      stockStatus,
      lastMovement: lastMovementByBatch.get(b.id!) || null,
      categoryIds: catsByMed.get(b.medicineId) || [],
      pharmacologicalClassIds: classesByMed.get(b.medicineId) || [],
    };
  });

  const allCategories = await db.categories.orderBy("name").toArray();
  const allPharmClasses = await db.pharmacologicalClasses
    .orderBy("name")
    .toArray();
  const allCartons = await db.cartons.orderBy("code").toArray();

  return {
    rows,
    categories: allCategories.map((c) => ({ id: c.id!, name: c.name })),
    pharmacologicalClasses: allPharmClasses.map((c) => ({
      id: c.id!,
      name: c.name,
    })),
    cartons: allCartons.map((c) => ({
      id: c.id!,
      code: c.code,
      label: c.label,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Dashboard stats (real data)                                        */
/* ------------------------------------------------------------------ */

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();

  const [medicines, batches, convoys] = await Promise.all([
    db.medicines.toArray(),
    db.batches.toArray(),
    db.convoys.toArray(),
  ]);

  const activeMeds = medicines.filter((m) => !m.archivedAt);
  const activeBatches = batches.filter((b) => !b.archivedAt);
  const now = new Date();

  let expiringSoon = 0;
  let expired = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalUnits = 0;

  const stockByMed = new Map<string, number>();

  for (const b of activeBatches) {
    totalUnits += b.quantity;
    const current = (stockByMed.get(b.medicineId) || 0) + b.quantity;
    stockByMed.set(b.medicineId, current);

    const days = Math.ceil(
      (b.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 0) expired++;
    else if (days <= EXPIRY_SOON_DAYS) expiringSoon++;
  }

  for (const [, qty] of stockByMed) {
    if (qty === 0) outOfStockCount++;
    else if (qty <= LOW_STOCK_THRESHOLD) lowStockCount++;
  }

  const activeConvoyCount = convoys.filter((c) => c.status === "ACTIVE").length;

  return {
    totalMedicines: activeMeds.length,
    totalUnits,
    expiringSoon,
    expired,
    lowStockCount,
    outOfStockCount,
    activeConvoyCount,
  };
}

export async function getLowStockMedicines(): Promise<LowStockMedicine[]> {
  const db = await getDb();
  const batches = await db.batches.toArray();
  const activeBatches = batches.filter((b) => !b.archivedAt);

  const stockByMed = new Map<string, number>();
  for (const b of activeBatches) {
    stockByMed.set(
      b.medicineId,
      (stockByMed.get(b.medicineId) || 0) + b.quantity
    );
  }

  const lowMeds: Array<{ id: string; stock: number }> = [];
  for (const [medId, stock] of stockByMed) {
    if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) {
      lowMeds.push({ id: medId, stock });
    }
  }

  if (lowMeds.length === 0) return [];

  const medIds = lowMeds.map((m) => m.id);
  const meds = await db.medicines.where("id").anyOf(medIds).toArray();
  const medMap = new Map(meds.map((m) => [m.id!, m]));

  return lowMeds
    .map((m) => {
      const med = medMap.get(m.id);
      return {
        medicineId: m.id,
        medicineName: med?.tradeName || "Unknown",
        currentStock: m.stock,
        minimumStock: LOW_STOCK_THRESHOLD,
      };
    })
    .sort((a, b) => a.currentStock - b.currentStock);
}