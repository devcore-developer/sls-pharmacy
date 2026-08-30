import type { StockMovementRecord } from "./db";
import type {
  MovementType,
  MovementDirection,
  StockMovementListItem,
  StockMovementDetail,
  RecentActivityItem,
  MovementFilters,
} from "@/types";
import { logOperation } from "./sync-operations";
import { logAudit } from "./audit-repository";
import { getDeviceId } from "./device-id";
import { getMovementDirection, getMovementTypeLabel } from "./stock-utils";
import { getDateRange, isDateInRange } from "@/lib/date-utils";

async function getDb() {
  const { db } = await import("./db");
  return db;
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

export async function createStockMovement(params: {
  medicineId: string;
  batchId?: string;
  convoyId?: string;
  convoyItemId?: string;
  receiptId?: string;
  receiptItemId?: string;
  type: string;
  quantity: number;
  reason?: string;
  notes?: string;
  userId?: string;
}): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const deviceId = getDeviceId();

  await db.stockMovements.add({
    id,
    medicineId: params.medicineId,
    batchId: params.batchId,
    convoyId: params.convoyId,
    convoyItemId: params.convoyItemId,
    receiptId: params.receiptId,
    receiptItemId: params.receiptItemId,
    type: params.type,
    quantity: params.quantity,
    reason: params.reason,
    notes: params.notes,
    createdAt: new Date(),
    deviceId,
    userId: params.userId,
  });

  await logOperation({
    entityType: "stockMovement",
    entityId: id,
    operationType: "create",
    payload: params,
    deviceId,
  });

  return id;
}

/* ------------------------------------------------------------------ */
/*  Adjustment                                                         */
/* ------------------------------------------------------------------ */

export async function createAdjustment(params: {
  medicineId: string;
  batchId: string;
  type: "IN" | "OUT";
  quantity: number;
  reason: string;
  note?: string;
  userId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const deviceId = getDeviceId();

  if (params.quantity <= 0) {
    return { success: false, error: "Quantity must be greater than 0." };
  }

  const batch = await db.batches.get(params.batchId);
  if (!batch || batch.archivedAt) {
    return { success: false, error: "Batch not found or archived." };
  }

  const currentStock = batch.quantity;
  const movementType: MovementType =
    params.type === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
  const newStock =
    params.type === "IN"
      ? currentStock + params.quantity
      : currentStock - params.quantity;

  if (newStock < 0) {
    return {
      success: false,
      error: `Adjustment would make stock negative. Current: ${currentStock}, Adjustment: -${params.quantity}, Result: ${newStock}.`,
    };
  }

  const now = new Date();
  const movementId = crypto.randomUUID();

  await db.transaction(
    "rw",
    [db.stockMovements, db.batches, db.syncOperations],
    async () => {
      await db.stockMovements.add({
        id: movementId,
        medicineId: params.medicineId,
        batchId: params.batchId,
        type: movementType,
        quantity: params.quantity,
        reason: params.reason,
        notes: params.note,
        createdAt: now,
        deviceId,
        userId: params.userId,
      });

      await db.batches.update(params.batchId, {
        quantity: newStock,
        updatedAt: now,
      });

      await db.syncOperations.add({
        operationId: crypto.randomUUID(),
        deviceId,
        userId: params.userId,
        entityType: "stockMovement",
        entityId: movementId,
        operationType: "create",
        payload: { ...params, movementType } as unknown as Record<string, unknown>,
        createdAt: now,
        syncStatus: "pending",
        retryCount: 0,
      });
    }
  );

  await logAudit({
    userId: params.userId || "",
    action: "STOCK_ADJUSTED",
    entityType: "batch",
    entityId: params.batchId,
    metadata: { type: movementType, quantity: params.quantity, reason: params.reason },
  });

  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export async function getStockMovementById(
  id: string
): Promise<StockMovementDetail | null> {
  const db = await getDb();
  const m = await db.stockMovements.get(id);
  if (!m) return null;

  const med = await db.medicines.get(m.medicineId);
  const batch = m.batchId ? await db.batches.get(m.batchId) : null;
  const carton = batch?.cartonId ? await db.cartons.get(batch.cartonId) : null;
  const convoy = m.convoyId ? await db.convoys.get(m.convoyId) : null;
  const receipt = m.receiptId ? await db.stockReceipts.get(m.receiptId) : null;

  return {
    id: m.id!,
    date: m.createdAt,
    medicineName: med?.tradeName || "Unknown",
    genericName: med?.genericName || "",
    batchNumber: batch?.batchNumber || null,
    type: m.type as MovementType,
    typeLabel: getMovementTypeLabel(m.type),
    quantity: m.quantity,
    direction: getMovementDirection(m.type),
    convoyName: convoy?.name || null,
    convoyId: m.convoyId ?? null,
    userName: m.userId || null,
    reason: m.reason || null,
    note: m.notes || null,
    deviceId: m.deviceId || "Unknown",
    batchId: m.batchId ?? null,
    batchExpiry: batch?.expiryDate ?? null,
    cartonCode: carton?.code ?? null,
    convoyItemId: m.convoyItemId ?? null,
    receiptId: m.receiptId ?? null,
    receiptNumber: receipt?.receiptNumber ?? null,
  };
}

export async function getStockMovements(
  filters: MovementFilters
): Promise<StockMovementListItem[]> {
  const db = await getDb();
  const { from, to } = getDateRange(
    filters.datePreset as "today" | "last_7" | "last_30" | "all",
    filters.dateFrom ?? undefined,
    filters.dateTo ?? undefined
  );

  const collection = db.stockMovements.orderBy("createdAt").reverse();

  let movements = await collection.toArray();

  if (from || to) {
    movements = movements.filter((m) => isDateInRange(m.createdAt, from, to));
  }
  if (filters.type !== "all") {
    movements = movements.filter((m) => m.type === filters.type);
  }
  if (filters.convoyId !== "all") {
    movements = movements.filter((m) => m.convoyId === filters.convoyId);
  }

  if (movements.length === 0) return [];

  const medIds = [...new Set(movements.map((m) => m.medicineId))];
  const batchIds = [...new Set(movements.filter((m) => m.batchId).map((m) => m.batchId!))];
  const convoyIds = [...new Set(movements.filter((m) => m.convoyId).map((m) => m.convoyId!))];

  const [meds, batches, convoys] = await Promise.all([
    medIds.length > 0 ? db.medicines.where("id").anyOf(medIds).toArray() : [],
    batchIds.length > 0 ? db.batches.where("id").anyOf(batchIds).toArray() : [],
    convoyIds.length > 0 ? db.convoys.where("id").anyOf(convoyIds).toArray() : [],
  ]);

  const medMap = new Map(meds.map((m) => [m.id!, m]));
  const batchMap = new Map(batches.map((b) => [b.id!, b]));
  const convoyMap = new Map(convoys.map((c) => [c.id!, c]));

  let results: StockMovementListItem[] = movements.map((m) => {
    const med = medMap.get(m.medicineId);
    const batch = m.batchId ? batchMap.get(m.batchId) : null;
    const convoy = m.convoyId ? convoyMap.get(m.convoyId) : null;
    return {
      id: m.id!,
      date: m.createdAt,
      medicineName: med?.tradeName || "Unknown",
      genericName: med?.genericName || "",
      batchNumber: batch?.batchNumber || null,
      type: m.type as MovementType,
      typeLabel: getMovementTypeLabel(m.type),
      quantity: m.quantity,
      direction: getMovementDirection(m.type),
      convoyName: convoy?.name || null,
      convoyId: m.convoyId ?? null,
      userName: m.userId || null,
      reason: m.reason || null,
    };
  });

  if (filters.medicineSearch) {
    const q = filters.medicineSearch.toLowerCase();
    results = results.filter(
      (r) =>
        r.medicineName.toLowerCase().includes(q) ||
        r.genericName.toLowerCase().includes(q)
    );
  }
  if (filters.batchSearch) {
    const q = filters.batchSearch.toLowerCase();
    results = results.filter(
      (r) => r.batchNumber?.toLowerCase().includes(q)
    );
  }

  return results;
}

export async function getMovementsByMedicine(
  medicineId: string,
  limit = 50
): Promise<StockMovementListItem[]> {
  const db = await getDb();
  const movements = await db.stockMovements
    .where("medicineId")
    .equals(medicineId)
    .reverse()
    .sortBy("createdAt");

  const batchIds = [...new Set(movements.filter((m) => m.batchId).map((m) => m.batchId!))];
  const convoyIds = [...new Set(movements.filter((m) => m.convoyId).map((m) => m.convoyId!))];
  const [batches, convoys] = await Promise.all([
    batchIds.length > 0 ? db.batches.where("id").anyOf(batchIds).toArray() : [],
    convoyIds.length > 0 ? db.convoys.where("id").anyOf(convoyIds).toArray() : [],
  ]);
  const batchMap = new Map(batches.map((b) => [b.id!, b]));
  const convoyMap = new Map(convoys.map((c) => [c.id!, c]));

  return movements.slice(0, limit).map((m) => ({
    id: m.id!,
    date: m.createdAt,
    medicineName: "",
    genericName: "",
    batchNumber: m.batchId ? batchMap.get(m.batchId)?.batchNumber || null : null,
    type: m.type as MovementType,
    typeLabel: getMovementTypeLabel(m.type),
    quantity: m.quantity,
    direction: getMovementDirection(m.type),
    convoyName: m.convoyId ? convoyMap.get(m.convoyId)?.name || null : null,
    convoyId: m.convoyId ?? null,
    userName: m.userId || null,
    reason: m.reason || null,
  }));
}

export async function getMovementsByBatch(
  batchId: string,
  limit = 50
): Promise<StockMovementListItem[]> {
  const db = await getDb();
  const movements = await db.stockMovements
    .where("batchId")
    .equals(batchId)
    .reverse()
    .sortBy("createdAt");

  const medIds = [...new Set(movements.map((m) => m.medicineId))];
  const convoyIds = [...new Set(movements.filter((m) => m.convoyId).map((m) => m.convoyId!))];
  const [meds, convoys] = await Promise.all([
    medIds.length > 0 ? db.medicines.where("id").anyOf(medIds).toArray() : [],
    convoyIds.length > 0 ? db.convoys.where("id").anyOf(convoyIds).toArray() : [],
  ]);
  const medMap = new Map(meds.map((m) => [m.id!, m]));
  const convoyMap = new Map(convoys.map((c) => [c.id!, c]));

  return movements.slice(0, limit).map((m) => {
    const med = medMap.get(m.medicineId);
    return {
      id: m.id!,
      date: m.createdAt,
      medicineName: med?.tradeName || "Unknown",
      genericName: med?.genericName || "",
      batchNumber: null,
      type: m.type as MovementType,
      typeLabel: getMovementTypeLabel(m.type),
      quantity: m.quantity,
      direction: getMovementDirection(m.type),
      convoyName: m.convoyId ? convoyMap.get(m.convoyId)?.name || null : null,
      convoyId: m.convoyId ?? null,
      userName: m.userId || null,
      reason: m.reason || null,
    };
  });
}

export async function getLastMovementForBatch(
  batchId: string
): Promise<{ type: string; date: Date } | null> {
  const db = await getDb();
  const movements = await db.stockMovements
    .where("batchId")
    .equals(batchId)
    .reverse()
    .sortBy("createdAt");
  if (movements.length === 0) return null;
  return { type: movements[0].type, date: movements[0].createdAt };
}

export async function getRecentActivity(
  limit = 5
): Promise<RecentActivityItem[]> {
  const db = await getDb();
  const movements = await db.stockMovements
    .reverse()
    .sortBy("createdAt");

  const medIds = [...new Set(movements.slice(0, limit).map((m) => m.medicineId))];
  const meds =
    medIds.length > 0
      ? await db.medicines.where("id").anyOf(medIds).toArray()
      : [];
  const medMap = new Map(meds.map((m) => [m.id!, m]));

  const now = new Date();
  return movements.slice(0, limit).map((m) => {
    const med = medMap.get(m.medicineId);
    const dir = getMovementDirection(m.type);
    const label = getMovementTypeLabel(m.type);
    const minsAgo = Math.floor(
      (now.getTime() - m.createdAt.getTime()) / 60000
    );
    let time: string;
    if (minsAgo < 1) time = "Just now";
    else if (minsAgo < 60) time = `${minsAgo}m ago`;
    else if (minsAgo < 1440) time = `${Math.floor(minsAgo / 60)}h ago`;
    else time = `${Math.floor(minsAgo / 1440)}d ago`;

    return {
      id: m.id!,
      action: label,
      detail: `${m.quantity} units of ${med?.tradeName || "Unknown"}`,
      time,
      type: dir === "IN" ? "inbound" : dir === "OUT" ? "outbound" : "neutral",
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Filter options (offline)                                           */
/* ------------------------------------------------------------------ */

export async function getMovementFilterOptions(): Promise<{
  convoys: Array<{ id: string; name: string }>;
}> {
  const db = await getDb();
  const convoys = await db.convoys
    .where("status")
    .anyOf(["DRAFT", "ACTIVE", "COMPLETED"])
    .toArray();
  return {
    convoys: convoys.map((c) => ({ id: c.id!, name: c.name })),
  };
}