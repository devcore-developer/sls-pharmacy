import type { MedicineAlternativeRecord } from "./db";
import type { MedicineAlternativeItem } from "@/types";
import { logOperation } from "./sync-operations";
import { getDeviceId } from "./device-id";

async function getDb() {
  const { db } = await import("./db");
  return db;
}

export async function getAlternativesForMedicine(
  medicineId: string
): Promise<MedicineAlternativeItem[]> {
  const db = await getDb();

  const forward = await db.medicineAlternatives
    .where("medicineId")
    .equals(medicineId)
    .toArray();

  const reverse = await db.medicineAlternatives
    .where("alternativeMedicineId")
    .equals(medicineId)
    .toArray();

  const allAltIds = [
    ...forward.map((r) => r.alternativeMedicineId),
    ...reverse.map((r) => r.medicineId),
  ];

  if (allAltIds.length === 0) return [];

  const altMeds = await db.medicines.where("id").anyOf(allAltIds).toArray();

  const allBatches = await db.batches.toArray();
  const batchesByMed = new Map<string, typeof allBatches>();
  for (const b of allBatches.filter((b) => !b.archivedAt)) {
    const list = batchesByMed.get(b.medicineId) || [];
    list.push(b);
    batchesByMed.set(b.medicineId, list);
  }

  const medMap = new Map(altMeds.map((m) => [m.id!, m]));

  const seen = new Set<string>();
  const results: MedicineAlternativeItem[] = [];

  for (const altId of allAltIds) {
    if (seen.has(altId)) continue;
    seen.add(altId);

    const med = medMap.get(altId);
    if (!med) continue;

    const batches = batchesByMed.get(altId) || [];
    const totalQty = batches.reduce((s, b) => s + b.quantity, 0);
    let nearestExpiry: Date | null = null;
    for (const b of batches) {
      if (!nearestExpiry || b.expiryDate < nearestExpiry) {
        nearestExpiry = b.expiryDate;
      }
    }

    const forwardRecord = forward.find((r) => r.alternativeMedicineId === altId);
    const reverseRecord = reverse.find((r) => r.medicineId === altId);
    const recordId = (forwardRecord && forwardRecord.id) || (reverseRecord && reverseRecord.id) || "";

    results.push({
      id: recordId,
      alternativeMedicineId: altId,
      tradeName: med.tradeName,
      genericName: med.genericName,
      totalQuantity: totalQty,
      nearestExpiry,
    });
  }

  return results;
}

export async function addAlternative(
  medicineId: string,
  alternativeMedicineId: string
): Promise<{ success: boolean; error?: string }> {
  if (medicineId === alternativeMedicineId) {
    return { success: false, error: "Cannot set a medicine as its own alternative." };
  }

  const db = await getDb();

  const existingForward = await db.medicineAlternatives
    .where("medicineId")
    .equals(medicineId)
    .filter((r) => r.alternativeMedicineId === alternativeMedicineId)
    .first();

  if (existingForward) {
    return { success: false, error: "This alternative relationship already exists." };
  }

  const existingReverse = await db.medicineAlternatives
    .where("medicineId")
    .equals(alternativeMedicineId)
    .filter((r) => r.alternativeMedicineId === medicineId)
    .first();

  if (existingReverse) {
    return { success: false, error: "This alternative relationship already exists (reverse direction)." };
  }

  const now = new Date();
  const id = crypto.randomUUID();

  await db.medicineAlternatives.add({
    id,
    medicineId,
    alternativeMedicineId,
    createdAt: now,
    updatedAt: now,
  });

  await logOperation({
    entityType: "medicineAlternative",
    entityId: id,
    operationType: "create",
    payload: { medicineId, alternativeMedicineId },
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });

  return { success: true };
}

export async function removeAlternative(
  alternativeId: string,
  medicineId: string,
  alternativeMedicineId: string
): Promise<void> {
  const db = await getDb();
  await db.medicineAlternatives.delete(alternativeId);

  await logOperation({
    entityType: "medicineAlternative",
    entityId: alternativeId,
    operationType: "delete",
    payload: { medicineId, alternativeMedicineId },
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });
}