import type { ConvoyRecord } from "./db";
import type {
  ConvoyListItem,
  ConvoyDetail,
  ConvoyFormData,
} from "@/types";
import { logOperation } from "./sync-operations";
import { getDeviceId } from "./device-id";
import { getConvoyItems, getConvoyReconciliationStatus } from "./convoy-item-repository";
async function getDb() {
  const { db } = await import("./db");
  return db;
}

function toListItem(r: ConvoyRecord, itemCount: number, totalTaken: number, totalDispensed: number): ConvoyListItem {
  return {
    id: r.id!,
    name: r.name,
    date: r.date,
    location: r.location,
    responsiblePerson: r.responsiblePerson,
    status: r.status as ConvoyListItem["status"],
    itemCount,
    totalTaken,
    totalDispensed,
    createdAt: r.createdAt,
    completedAt: r.completedAt ?? null,
  };
}

export async function getAllConvoys(): Promise<ConvoyListItem[]> {
  const db = await getDb();
  const convoys = await db.convoys.orderBy("createdAt").reverse().toArray();

  if (convoys.length === 0) return [];

  const allItems = await db.convoyItems.toArray();
  const itemsByConvoy = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const list = itemsByConvoy.get(item.convoyId) || [];
    list.push(item);
    itemsByConvoy.set(item.convoyId, list);
  }

  return convoys.map((c) => {
    const items = itemsByConvoy.get(c.id!) || [];
    return toListItem(
      c,
      items.length,
      items.reduce((s, i) => s + i.quantityTaken, 0),
      items.reduce((s, i) => s + i.quantityDispensed, 0)
    );
  });
}

export async function getConvoyDetail(id: string): Promise<ConvoyDetail | null> {
  const db = await getDb();
  const convoy = await db.convoys.get(id);
  if (!convoy) return null;

  const items = await getConvoyItems(id);

  return {
    id: convoy.id!,
    name: convoy.name,
    date: convoy.date,
    location: convoy.location,
    responsiblePerson: convoy.responsiblePerson,
    notes: convoy.notes,
    status: convoy.status as ConvoyDetail["status"],
    reconciliationStatus: getConvoyReconciliationStatus(items),
    createdAt: convoy.createdAt,
    updatedAt: convoy.updatedAt,
    completedAt: convoy.completedAt ?? null,
    items,
  };
}

export async function createConvoy(data: ConvoyFormData): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date();

  await db.convoys.add({
    id,
    name: data.name.trim(),
    date: data.date,
    location: data.location.trim(),
    responsiblePerson: data.responsiblePerson.trim(),
    notes: data.notes.trim(),
    status: "DRAFT",
    createdAt: now,
    updatedAt: now,
  });

  await logOperation({
    entityType: "convoy",
    entityId: id,
    operationType: "create",
    payload: data,
    deviceId: getDeviceId(),
  });

  return id;
}

export async function updateConvoy(id: string, data: ConvoyFormData): Promise<void> {
  const db = await getDb();

  await db.convoys.update(id, {
    name: data.name.trim(),
    date: data.date,
    location: data.location.trim(),
    responsiblePerson: data.responsiblePerson.trim(),
    notes: data.notes.trim(),
    updatedAt: new Date(),
  });

  await logOperation({
    entityType: "convoy",
    entityId: id,
    operationType: "update",
    payload: data,
    deviceId: getDeviceId(),
  });
}

export async function startConvoy(
  convoyId: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const deviceId = getDeviceId();
  const now = new Date();

  const convoy = await db.convoys.get(convoyId);
  if (!convoy) return { success: false, error: "Convoy not found." };
  if (convoy.status !== "DRAFT")
    return { success: false, error: "Only draft convoys can be started." };

  const items = await db.convoyItems
    .where("convoyId")
    .equals(convoyId)
    .toArray();
  if (items.length === 0)
    return { success: false, error: "Add at least one medicine before starting." };

  // Validate stock for each item
  const batchUpdates = new Map<string, number>();

  for (const item of items) {
    if (!item.batchId)
      return { success: false, error: "An item has no batch assigned." };

    const batch = await db.batches.get(item.batchId);
    if (!batch || batch.archivedAt) {
      const med = await db.medicines.get(item.medicineId);
      return {
        success: false,
        error: `Batch not found or archived for ${med?.tradeName || "medicine"}.`,
      };
    }

    // FIX: batch.quantity already reflects all previous CONVOY_OUT deductions.
    // No need to subtract allocated movements again.
    const available = batch.quantity;

    if (item.quantityTaken > available) {
      const med = await db.medicines.get(item.medicineId);
      return {
        success: false,
        error: `Insufficient stock for ${med?.tradeName || "medicine"} (batch ${batch.batchNumber}). Available: ${available}, Requested: ${item.quantityTaken}`,
      };
    }

    batchUpdates.set(item.batchId, batch.quantity - item.quantityTaken);
  }

  // All valid — atomic transaction
  try {
    await db.transaction(
      "rw",
      [db.convoys, db.batches, db.stockMovements, db.syncOperations],
      async () => {
        await db.convoys.update(convoyId, {
          status: "ACTIVE",
          updatedAt: now,
        });

        for (const [batchId, newQty] of batchUpdates) {
          await db.batches.update(batchId, {
            quantity: newQty,
            updatedAt: now,
          });
        }

        for (const item of items) {
          await db.stockMovements.add({
            id: crypto.randomUUID(),
            medicineId: item.medicineId,
            batchId: item.batchId,
            convoyId,
            convoyItemId: item.id,
            type: "CONVOY_OUT",
            quantity: item.quantityTaken,
            createdAt: now,
            deviceId,
          });
        }

        await logOperation({
          entityType: "convoy",
          entityId: convoyId,
          operationType: "update",
          payload: { status: "ACTIVE" },
          deviceId,
        });
      }
    );

    return { success: true };
  } catch {
    return { success: false, error: "Failed to start convoy. Please try again." };
  }
}

export async function completeConvoy(convoyId: string): Promise<void> {
  const db = await getDb();
  const now = new Date();

  await db.convoys.update(convoyId, {
    status: "COMPLETED",
    completedAt: now,
    updatedAt: now,
  });

  await logOperation({
    entityType: "convoy",
    entityId: convoyId,
    operationType: "update",
    payload: { status: "COMPLETED" },
    deviceId: getDeviceId(),
  });
}

export async function deleteConvoy(id: string): Promise<void> {
  const db = await getDb();
  await db.transaction("rw", [db.convoys, db.convoyItems, db.syncOperations], async () => {
    await db.convoyItems.where("convoyId").equals(id).delete();
    await db.convoys.delete(id);
  });

  await logOperation({
    entityType: "convoy",
    entityId: id,
    operationType: "delete",
    payload: { deletedAt: new Date().toISOString() },
    deviceId: getDeviceId(),
  });
}