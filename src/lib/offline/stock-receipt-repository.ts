// src/lib/offline/stock-receipt-repository.ts

import type {
  ReceiptListItem,
  ReceiptDetail,
  ReceiptDetailItem,
  ReceiptSourceType,
} from "@/types";
import { logOperation } from "./sync-operations";
import { getDeviceId } from "./device-id";

async function getDb() {
  const { db } = await import("./db");
  return db;
}

/* ------------------------------------------------------------------ */
/*  Receipt Number Generation                                         */
/* ------------------------------------------------------------------ */

export async function generateReceiptNumber(): Promise<string> {
  const db = await getDb();
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  const all = await db.stockReceipts.toArray();
  const yearReceipts = all.filter((r) => r.receiptNumber.startsWith(prefix));

  let maxNum = 0;
  for (const r of yearReceipts) {
    const numStr = r.receiptNumber.slice(prefix.length);
    const num = parseInt(numStr, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }

  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  List                                                               */
/* ------------------------------------------------------------------ */

export async function getAllReceipts(): Promise<ReceiptListItem[]> {
  const db = await getDb();
  const receipts = await db.stockReceipts.orderBy("createdAt").reverse().toArray();

  if (receipts.length === 0) return [];

  const allItems = await db.stockReceiptItems.toArray();
  const itemsByReceipt = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const list = itemsByReceipt.get(item.receiptId) || [];
    list.push(item);
    itemsByReceipt.set(item.receiptId, list);
  }

  return receipts.map((r) => {
    const items = itemsByReceipt.get(r.id!) || [];
    return {
      id: r.id!,
      receiptNumber: r.receiptNumber,
      date: r.date,
      sourceType: r.sourceType as ReceiptSourceType,
      sourceName: r.sourceName ?? null,
      responsiblePerson: r.responsiblePerson ?? null,
      itemCount: items.length,
      totalUnits: items.reduce((s, i) => s + i.quantity, 0),
      createdAt: r.createdAt,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Detail                                                             */
/* ------------------------------------------------------------------ */

export async function getReceiptById(id: string): Promise<ReceiptDetail | null> {
  const db = await getDb();
  const receipt = await db.stockReceipts.get(id);
  if (!receipt) return null;

  const items = await db.stockReceiptItems.where("receiptId").equals(id).toArray();
  if (items.length === 0) {
    return {
      id: receipt.id!,
      receiptNumber: receipt.receiptNumber,
      date: receipt.date,
      sourceType: receipt.sourceType as ReceiptSourceType,
      sourceName: receipt.sourceName ?? null,
      responsiblePerson: receipt.responsiblePerson ?? null,
      notes: receipt.notes ?? null,
      createdAt: receipt.createdAt,
      items: [],
    };
  }

  const medIds = [...new Set(items.map((i) => i.medicineId))];
  const batchIds = [...new Set(items.filter((i) => i.batchId).map((i) => i.batchId!))];
  const cartonIds = [...new Set(items.filter((i) => i.cartonId).map((i) => i.cartonId!))];

  const [meds, batches, cartons] = await Promise.all([
    medIds.length > 0 ? db.medicines.where("id").anyOf(medIds).toArray() : [],
    batchIds.length > 0 ? db.batches.where("id").anyOf(batchIds).toArray() : [],
    cartonIds.length > 0 ? db.cartons.where("id").anyOf(cartonIds).toArray() : [],
  ]);

  const medMap = new Map(meds.map((m) => [m.id!, m]));
  const batchMap = new Map(batches.map((b) => [b.id!, b]));
  const cartonMap = new Map(cartons.map((c) => [c.id!, c]));

  const detailItems: ReceiptDetailItem[] = items.map((i) => {
    const med = medMap.get(i.medicineId);
    const batch = i.batchId ? batchMap.get(i.batchId) : null;
    const carton = i.cartonId ? cartonMap.get(i.cartonId) : null;
    return {
      id: i.id!,
      medicineName: med?.tradeName || "Unknown",
      genericName: med?.genericName || "",
      batchNumber: batch?.batchNumber || i.batchId || "—",
      batchId: i.batchId ?? null,
      expiryDate: batch?.expiryDate ?? new Date(),
      quantity: i.quantity,
      cartonCode: carton?.code ?? null,
      notes: i.notes ?? null,
    };
  });

  return {
    id: receipt.id!,
    receiptNumber: receipt.receiptNumber,
    date: receipt.date,
    sourceType: receipt.sourceType as ReceiptSourceType,
    sourceName: receipt.sourceName ?? null,
    responsiblePerson: receipt.responsiblePerson ?? null,
    notes: receipt.notes ?? null,
    createdAt: receipt.createdAt,
    items: detailItems,
  };
}

/* ------------------------------------------------------------------ */
/*  Check existing batch                                              */
/* ------------------------------------------------------------------ */

export async function findExistingBatch(
  medicineId: string,
  batchNumber: string,
  expiryDate: string
): Promise<string | null> {
  const db = await getDb();
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);

  const existing = await db.batches
    .where("medicineId")
    .equals(medicineId)
    .filter((b) => {
      if (b.batchNumber !== batchNumber) return false;
      const bExp = new Date(b.expiryDate);
      bExp.setHours(0, 0, 0, 0);
      return bExp.getTime() === exp.getTime();
    })
    .first();

  return existing?.id ?? null;
}

/* ------------------------------------------------------------------ */
/*  Create Carton (if new)                                            */
/* ------------------------------------------------------------------ */

async function ensureCarton(cartonId: string | undefined, cartonData: {
  code?: string;
  name?: string;
  categoryId?: string;
  location?: string;
  description?: string;
} | null): Promise<string | undefined> {
  if (!cartonId && !cartonData?.code) return undefined;
  if (cartonId) return cartonId;

  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date();
  await db.cartons.add({
    id,
    code: cartonData!.code!.trim(),
    name: cartonData!.name?.trim() || cartonData!.code!.trim(),
    categoryId: cartonData!.categoryId || undefined,
    location: cartonData!.location?.trim() || "",
    description: cartonData!.description?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/* ------------------------------------------------------------------ */
/*  Confirm Receipt — Atomic Transaction                              */
/* ------------------------------------------------------------------ */

export interface ReceiptItemInput {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  cartonId: string;
  newCarton: {
    code: string;
    name: string;
    categoryId: string;
    location: string;
  } | null;
  notes: string;
  useExistingBatch: boolean;
}

export async function confirmReceipt(params: {
  date: string;
  sourceType: string;
  sourceName: string;
  responsiblePerson: string;
  notes: string;
  items: ReceiptItemInput[];
}): Promise<{ success: boolean; receiptId?: string; receiptNumber?: string; error?: string }> {
  const db = await getDb();
  const deviceId = getDeviceId();
  const now = new Date();

  if (params.items.length === 0) {
    return { success: false, error: "Add at least one medicine." };
  }

  const receiptNumber = await generateReceiptNumber();
  const receiptId = crypto.randomUUID();

  try {
    await db.transaction(
      "rw",
      [
        db.stockReceipts,
        db.stockReceiptItems,
        db.batches,
        db.cartons,
        db.stockMovements,
        db.syncOperations,
      ],
      async () => {
        // 1. Create receipt
        await db.stockReceipts.add({
          id: receiptId,
          receiptNumber,
          date: params.date,
          sourceType: params.sourceType,
          sourceName: params.sourceName.trim() || undefined,
          responsiblePerson: params.responsiblePerson.trim() || undefined,
          notes: params.notes.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        });

        // 2. Process each item
        for (const item of params.items) {
          if (item.quantity <= 0) continue;

          // Find or create batch
          let batchId: string;
          if (item.useExistingBatch) {
            const existingId = await findExistingBatch(
              item.medicineId,
              item.batchNumber.trim(),
              item.expiryDate
            );
            if (!existingId) {
              throw new Error(`Batch ${item.batchNumber} not found for update.`);
            }
            batchId = existingId;
            // Add quantity to existing batch
            const batch = await db.batches.get(batchId);
            if (batch) {
              await db.batches.update(batchId, {
                quantity: batch.quantity + item.quantity,
                updatedAt: now,
              });
            }
          } else {
            // Create new batch
            batchId = crypto.randomUUID();
            const cartonId = await ensureCarton(
              item.cartonId || undefined,
              item.newCarton,
            );
            await db.batches.add({
              id: batchId,
              medicineId: item.medicineId,
              batchNumber: item.batchNumber.trim(),
              quantity: item.quantity,
              expiryDate: new Date(item.expiryDate),
              cartonId: cartonId,
              createdAt: now,
              updatedAt: now,
            });
          }

          // Create receipt item
          const receiptItemId = crypto.randomUUID();
          await db.stockReceiptItems.add({
            id: receiptItemId,
            receiptId,
            medicineId: item.medicineId,
            batchId,
            quantity: item.quantity,
            cartonId: item.cartonId || undefined,
            notes: item.notes.trim() || undefined,
            createdAt: now,
            updatedAt: now,
          });

          // Create DONATION_IN stock movement
          const movementId = crypto.randomUUID();
          await db.stockMovements.add({
            id: movementId,
            medicineId: item.medicineId,
            batchId,
            receiptId,
            receiptItemId,
            type: "DONATION_IN",
            quantity: item.quantity,
            notes: `Receipt: ${receiptNumber}`,
            createdAt: now,
            deviceId,
          });

          // Sync operations
          await db.syncOperations.add({
            operationId: crypto.randomUUID(),
            deviceId,
            entityType: "stockReceipt",
            entityId: receiptId,
            operationType: "create",
            payload: { receiptNumber, date: params.date, sourceType: params.sourceType } as unknown as Record<string, unknown>,
            createdAt: now,
            syncStatus: "pending",
            retryCount: 0,
          });

          await db.syncOperations.add({
            operationId: crypto.randomUUID(),
            deviceId,
            entityType: "stockMovement",
            entityId: movementId,
            operationType: "create",
            payload: { type: "DONATION_IN", receiptId, receiptNumber } as unknown as Record<string, unknown>,
            createdAt: now,
            syncStatus: "pending",
            retryCount: 0,
          });
        }
      }
    );

    return { success: true, receiptId, receiptNumber };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to confirm receipt.",
    };
  }
}