import type { ConvoyItemRecord } from "./db";
import type { ConvoyItem, BatchAvailability, ReconciliationStatus } from "@/types";
import { logOperation } from "./sync-operations";
import { getDeviceId } from "./device-id";

async function getDb() {
  const { db } = await import("./db");
  return db;
}

function toItemRecord(
  r: ConvoyItemRecord,
  medName: string,
  genericName: string,
  batchNumber: string
): ConvoyItem {
  return {
    id: r.id!,
    convoyId: r.convoyId,
    medicineId: r.medicineId,
    medicineName: medName,
    genericName,
    batchId: r.batchId ?? null,
    batchNumber,
    quantityTaken: r.quantityTaken,
    quantityDispensed: r.quantityDispensed,
    quantityReturned: r.quantityReturned || 0,
    quantityMissingOrDamaged: r.quantityMissingOrDamaged || 0,
    reconciliationNote: r.reconciliationNote || "",
    returnedAt: r.returnedAt ?? null,
    reconciledAt: r.reconciledAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function getItemReconciliation(item: ConvoyItem): {
  status: ReconciliationStatus;
  unreconciled: number;
  expectedRemaining: number;
} {
  const expectedRemaining = item.quantityTaken - item.quantityDispensed;
  if (expectedRemaining === 0) return { status: "RECONCILED" as const, unreconciled: 0, expectedRemaining: 0 };
  const unreconciled = expectedRemaining - item.quantityReturned - item.quantityMissingOrDamaged;
  if (unreconciled === 0) return { status: "RECONCILED" as const, unreconciled: 0, expectedRemaining };
  if (item.quantityReturned > 0 || item.quantityMissingOrDamaged > 0) {
    return { status: "PARTIALLY_RECONCILED" as const, unreconciled, expectedRemaining };
  }
  return { status: "PENDING" as const, unreconciled, expectedRemaining };
}

export function getConvoyReconciliationStatus(items: ConvoyItem[]): ReconciliationStatus {
  if (items.length === 0) return "RECONCILED" as const;
  if (items.every((i) => getItemReconciliation(i).status === "RECONCILED")) return "RECONCILED" as const;
  if (items.some((i) => getItemReconciliation(i).status === "PARTIALLY_RECONCILED")) return "PARTIALLY_RECONCILED" as const;
  return "PENDING" as const;
}

export async function getConvoyItems(convoyId: string): Promise<ConvoyItem[]> {
  const db = await getDb();
  const records = await db.convoyItems.where("convoyId").equals(convoyId).toArray();
  if (records.length === 0) return [];

  const medIds = [...new Set(records.map((r) => r.medicineId))];
  const batchIds = [...new Set(records.filter((r) => r.batchId).map((r) => r.batchId!))];

  const meds = medIds.length > 0 ? await db.medicines.where("id").anyOf(medIds).toArray() : [];
  const batches = batchIds.length > 0 ? await db.batches.where("id").anyOf(batchIds).toArray() : [];

  const medMap = new Map(meds.map((m) => [m.id!, m]));
  const batchMap = new Map(batches.map((b) => [b.id!, b]));

  return records.map((r) => {
    const med = medMap.get(r.medicineId);
    const batch = r.batchId ? batchMap.get(r.batchId) : null;
    return toItemRecord(r, med?.tradeName || "Unknown", med?.genericName || "", batch?.batchNumber || "—");
  });
}

export async function getAvailableBatchesForMedicine(
  medicineId: string,
  excludeConvoyId?: string
): Promise<BatchAvailability[]> {
  const db = await getDb();
  const batches = await db.batches.where("medicineId").equals(medicineId).filter((b) => !b.archivedAt).toArray();
  if (batches.length === 0) return [];

  const batchIds = batches.map((b) => b.id!);
  const movements = batchIds.length > 0
    ? await db.stockMovements.where("batchId").anyOf(batchIds).filter((m) => m.type === "CONVOY_OUT").toArray()
    : [];
  const allocatedByBatch = new Map<string, number>();
  for (const m of movements) {
    if (m.batchId) allocatedByBatch.set(m.batchId, (allocatedByBatch.get(m.batchId) || 0) + m.quantity);
  }

  if (excludeConvoyId) {
    const currentItems = await db.convoyItems.where("convoyId").equals(excludeConvoyId).toArray();
    for (const item of currentItems) {
      if (item.batchId) allocatedByBatch.set(item.batchId, (allocatedByBatch.get(item.batchId) || 0) + item.quantityTaken);
    }
  }

  return [...batches]
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    .map((b) => ({
      batchId: b.id!,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      availableQuantity: b.quantity - (allocatedByBatch.get(b.id!) || 0),
    }))
    .filter((b) => b.availableQuantity > 0);
}

export async function addConvoyItem(params: {
  convoyId: string;
  medicineId: string;
  batchId: string;
  quantityTaken: number;
}): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const existing = await db.convoyItems
    .where("convoyId").equals(params.convoyId)
    .filter((i) => i.medicineId === params.medicineId && i.batchId === params.batchId)
    .first();
  if (existing) return { success: false, error: "This medicine and batch are already in the convoy." };

  const available = await getAvailableBatchesForMedicine(params.medicineId, params.convoyId);
  const batchInfo = available.find((b) => b.batchId === params.batchId);
  if (!batchInfo) return { success: false, error: "Batch not found or no available quantity." };
  if (params.quantityTaken > batchInfo.availableQuantity) {
    return { success: false, error: `Insufficient stock. Available: ${batchInfo.availableQuantity}, Requested: ${params.quantityTaken}` };
  }

  const id = crypto.randomUUID();
  const now = new Date();
  await db.convoyItems.add({
    id, convoyId: params.convoyId, medicineId: params.medicineId, batchId: params.batchId,
    quantityTaken: params.quantityTaken, quantityDispensed: 0, quantityReturned: 0,
    quantityMissingOrDamaged: 0, reconciliationNote: "", createdAt: now, updatedAt: now,
  });
  await logOperation({ entityType: "convoyItem", entityId: id, operationType: "create", payload: params, deviceId: getDeviceId() });
  return { success: true };
}

export async function removeConvoyItem(itemId: string): Promise<void> {
  const db = await getDb();
  const item = await db.convoyItems.get(itemId);
  if (!item) return;
  await db.convoyItems.delete(itemId);
  await logOperation({ entityType: "convoyItem", entityId: itemId, operationType: "delete", payload: { convoyId: item.convoyId, medicineId: item.medicineId }, deviceId: getDeviceId() });
}

export async function dispenseMedicine(
  convoyItemId: string,
  delta: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const deviceId = getDeviceId();
  const item = await db.convoyItems.get(convoyItemId);
  if (!item) return { success: false, error: "Item not found." };

  const newDispensed = item.quantityDispensed + delta;
  if (newDispensed < 0) return { success: false, error: "Cannot go below zero." };
  if (newDispensed > item.quantityTaken) return { success: false, error: "Cannot exceed taken quantity." };

  const now = new Date();
  const movementType = delta > 0 ? "DISPENSE" : "DISPENSE_ADJUSTMENT";

  await db.transaction("rw", [db.convoyItems, db.stockMovements, db.syncOperations], async () => {
    await db.convoyItems.update(convoyItemId, { quantityDispensed: newDispensed, updatedAt: now });
    await db.stockMovements.add({
      id: crypto.randomUUID(), medicineId: item.medicineId, batchId: item.batchId,
      convoyId: item.convoyId, convoyItemId, type: movementType,
      quantity: Math.abs(delta), createdAt: now, deviceId,
    });
    await logOperation({
      entityType: "stockMovement", entityId: convoyItemId, operationType: "create",
      payload: { type: movementType, quantity: Math.abs(delta), newDispensed }, deviceId,
    });
  });
  return { success: true };
}

/* ---- Phase 5: Reconciliation ---- */

export async function updateItemReconciliation(
  convoyItemId: string,
  data: { quantityReturned?: number; quantityMissingOrDamaged?: number; reconciliationNote?: string }
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const item = await db.convoyItems.get(convoyItemId);
  if (!item) return { success: false, error: "Item not found." };
  if (item.reconciledAt) return { success: false, error: "This item is already reconciled." };

  const expectedRemaining = item.quantityTaken - item.quantityDispensed;
  const newReturned = data.quantityReturned !== undefined ? data.quantityReturned : item.quantityReturned;
  const newMissing = data.quantityMissingOrDamaged !== undefined ? data.quantityMissingOrDamaged : item.quantityMissingOrDamaged;

  if (newReturned < 0) return { success: false, error: "Returned cannot be negative." };
  if (newMissing < 0) return { success: false, error: "Missing/Damaged cannot be negative." };
  if (newReturned + newMissing > expectedRemaining) {
    return { success: false, error: `Returned + Missing/Damaged (${newReturned + newMissing}) exceeds expected remaining (${expectedRemaining}).` };
  }

  const now = new Date();
  const updates: Partial<ConvoyItemRecord> = {
    quantityReturned: newReturned,
    quantityMissingOrDamaged: newMissing,
    updatedAt: now,
  };
  if (data.reconciliationNote !== undefined) updates.reconciliationNote = data.reconciliationNote;
  if (newReturned > 0) updates.returnedAt = now;

  await db.convoyItems.update(convoyItemId, updates);

  if (data.quantityReturned !== undefined && data.quantityReturned !== item.quantityReturned) {
    await logOperation({
      entityType: "convoyItem", entityId: convoyItemId, operationType: "update",
      payload: { action: "RECORD_RETURN", quantityReturned: newReturned }, deviceId: getDeviceId(),
    });
  }
  if (data.quantityMissingOrDamaged !== undefined && data.quantityMissingOrDamaged !== item.quantityMissingOrDamaged) {
    await logOperation({
      entityType: "convoyItem", entityId: convoyItemId, operationType: "update",
      payload: { action: "RECORD_MISSING_DAMAGED", quantityMissingOrDamaged: newMissing }, deviceId: getDeviceId(),
    });
  }

  return { success: true };
}

export async function completeReconciliation(
  convoyId: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const deviceId = getDeviceId();
  const now = new Date();

  const items = await db.convoyItems.where("convoyId").equals(convoyId).toArray();

  for (const item of items) {
    const expected = item.quantityTaken - item.quantityDispensed;
    const unreconciled = expected - item.quantityReturned - item.quantityMissingOrDamaged;
    if (unreconciled !== 0) {
      const med = await db.medicines.get(item.medicineId);
      return {
        success: false,
        error: `Unreconciled items exist. "${med?.tradeName || "Unknown"}" has ${unreconciled} unaccounted unit(s). Record as Missing/Damaged or adjust returns.`,
      };
    }
  }

  try {
    await db.transaction("rw", [db.convoyItems, db.batches, db.stockMovements, db.syncOperations], async () => {
      for (const item of items) {
        if (item.quantityReturned > 0 && item.batchId) {
          const batch = await db.batches.get(item.batchId);
          if (batch) {
            await db.batches.update(item.batchId, {
              quantity: batch.quantity + item.quantityReturned,
              updatedAt: now,
            });
          }
          await db.stockMovements.add({
            id: crypto.randomUUID(),
            medicineId: item.medicineId,
            batchId: item.batchId,
            convoyId,
            convoyItemId: item.id,
            type: "RETURN_TO_WAREHOUSE",
            quantity: item.quantityReturned,
            createdAt: now,
            deviceId,
          });
        }
        await db.convoyItems.update(item.id!, {
          reconciledAt: now,
          updatedAt: now,
        });
      }

      await logOperation({
        entityType: "convoy", entityId: convoyId, operationType: "update",
        payload: { action: "RECONCILE_CONVOY" }, deviceId,
      });
    });
    return { success: true };
  } catch {
    return { success: false, error: "Reconciliation failed. Please try again." };
  }
}