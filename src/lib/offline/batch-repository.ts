import type { BatchWithCarton, BatchFormData, StockStats, ExpiryAlertData } from "@/types";
import { getExpiryStatus, daysUntil, EXPIRY_SOON_DAYS, calculateTotalStock } from "./stock-utils";
import { logOperation } from "./sync-operations";

async function getDb() {
  const { db } = await import("./db");
  return db;
}

export async function getBatchesForMedicine(medicineId: string): Promise<BatchWithCarton[]> {
  const db = await getDb();
  const batches = await db.batches.where("medicineId").equals(medicineId).toArray();

  if (batches.length === 0) return [];

  const cartonIds = [...new Set(batches.filter((b) => b.cartonId).map((b) => b.cartonId!))];
  const cartonRecords =
    cartonIds.length > 0 ? await db.cartons.where("id").anyOf(cartonIds).toArray() : [];
  const cartonMap = new Map(cartonRecords.map((c) => [c.id!, c]));

  const sectionIds = [...new Set(cartonRecords.filter((c) => c.sectionId).map((c) => c.sectionId!))];
  const sections =
    sectionIds.length > 0 ? await db.storageSections.where("id").anyOf(sectionIds).toArray() : [];
  const sectionMap = new Map(sections.map((s) => [s.id!, s.name]));

  return batches.map((b) => {
    const carton = b.cartonId ? cartonMap.get(b.cartonId) : undefined;
    return {
      id: b.id!,
      batchNumber: b.batchNumber,
      quantity: b.quantity,
      expiryDate: b.expiryDate,
      cartonId: b.cartonId ?? null,
      cartonCode: carton?.code ?? null,
      cartonLabel: carton?.label ?? null,
      sectionName: carton?.sectionId ? sectionMap.get(carton.sectionId) ?? null : null,
      locationNote: carton?.locationNote ?? null,
      isUnassigned: !b.cartonId,  // ✅ أضف هذا
      archivedAt: b.archivedAt ?? null,
    };
  });
}
export async function createBatch(medicineId: string, data: BatchFormData): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date();

  await db.batches.add({
    id,
    medicineId,
    batchNumber: data.batchNumber.trim(),
    quantity: parseInt(data.quantity, 10) || 0,
    expiryDate: new Date(data.expiryDate),
    cartonId: data.cartonId || undefined,
    createdAt: now,
    updatedAt: now,
  });

  await logOperation({
    entityType: "batch",
    entityId: id,
    operationType: "create",
    payload: { medicineId, ...data },
  });

  return id;
}

export async function updateBatch(id: string, data: BatchFormData): Promise<void> {
  const db = await getDb();
  await db.batches.update(id, {
    batchNumber: data.batchNumber.trim(),
    quantity: parseInt(data.quantity, 10) || 0,
    expiryDate: new Date(data.expiryDate),
    cartonId: data.cartonId || undefined,
    updatedAt: new Date(),
  });

  await logOperation({
    entityType: "batch",
    entityId: id,
    operationType: "update",
    payload: data,
  });
}

export async function archiveBatch(id: string): Promise<void> {
  const db = await getDb();
  await db.batches.update(id, { archivedAt: new Date(), updatedAt: new Date() });

  await logOperation({
    entityType: "batch",
    entityId: id,
    operationType: "delete",
    payload: { archivedAt: new Date().toISOString() },
  });
}

export async function getStockStats(): Promise<StockStats> {
  const db = await getDb();
  const medicines = await db.medicines.toArray();
  const activeMeds = medicines.filter((m) => !m.archivedAt);
  const batches = await db.batches.toArray();
  const activeBatches = batches.filter((b) => !b.archivedAt);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + EXPIRY_SOON_DAYS);

  let expiringSoon = 0;
  let expired = 0;

  for (const b of activeBatches) {
    const e = new Date(b.expiryDate);
    e.setHours(0, 0, 0, 0);
    if (e < now) expired++;
    else if (e <= threshold) expiringSoon++;
  }

  return {
    totalMedicines: activeMeds.length,
    totalUnits: calculateTotalStock(activeBatches),
    expiringSoon,
    expired,
  };
}

export async function getExpiryAlerts(): Promise<ExpiryAlertData[]> {
  const db = await getDb();
  const batches = await db.batches.toArray();
  const medicines = await db.medicines.toArray();
  const medMap = new Map(medicines.map((m) => [m.id!, m]));

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + EXPIRY_SOON_DAYS);

  return batches
    .filter((b) => {
      if (b.archivedAt) return false;
      const e = new Date(b.expiryDate);
      e.setHours(0, 0, 0, 0);
      return e <= threshold;
    })
    .map((b) => {
      const med = medMap.get(b.medicineId);
      return {
        medicineId: b.medicineId,
        medicineName: med?.tradeName || "Unknown",
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        quantity: b.quantity,
        expiresIn: daysUntil(b.expiryDate),
      };
    })
    .sort((a, b) => a.expiresIn - b.expiresIn)
    .slice(0, 8);
}

export async function getExpiryStatusForMedicine(
  medicineId: string
): Promise<{ status: ReturnType<typeof getExpiryStatus>; nearest: Date | null }> {
  const batches = await getBatchesForMedicine(medicineId);
  const active = batches.filter((b) => !b.archivedAt);
  if (active.length === 0) return { status: "valid" as const, nearest: null };
  const nearest = active.reduce((n, b) => (b.expiryDate < n.expiryDate ? b : n)).expiryDate;
  return { status: getExpiryStatus(nearest), nearest };
}

export async function getAllCartonsSimple(): Promise<Array<{ id: string; code: string; label: string }>> {
  const { getAllCartonsSimple: getSimple } = await import("./warehouse-repository");
  return getSimple();
}