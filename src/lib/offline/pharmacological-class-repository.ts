import type { PharmacologicalClassRecord } from "./db";
import type { PharmacologicalClassItem, PharmacologicalClassFormData } from "@/types";
import { logOperation } from "./sync-operations";
import { getDeviceId } from "./device-id";

async function getDb() {
  const { db } = await import("./db");
  return db;
}

function toItem(r: PharmacologicalClassRecord): PharmacologicalClassItem {
  return { id: r.id!, name: r.name };
}

export async function getAllPharmacologicalClasses(): Promise<PharmacologicalClassItem[]> {
  const db = await getDb();
  return (await db.pharmacologicalClasses.orderBy("name").toArray()).map(toItem);
}

export async function getPharmacologicalClassById(id: string): Promise<PharmacologicalClassRecord | null> {
  const db = await getDb();
  return (await db.pharmacologicalClasses.get(id)) ?? null;
}

export async function createPharmacologicalClass(data: PharmacologicalClassFormData): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date();

  await db.pharmacologicalClasses.add({
    id,
    name: data.name.trim(),
    description: data.description.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  });

  await logOperation({
    entityType: "pharmacologicalClass",
    entityId: id,
    operationType: "create",
    payload: data,
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });

  return id;
}

export async function updatePharmacologicalClass(id: string, data: PharmacologicalClassFormData): Promise<void> {
  const db = await getDb();

  await db.pharmacologicalClasses.update(id, {
    name: data.name.trim(),
    description: data.description.trim() || undefined,
    updatedAt: new Date(),
  });

  await logOperation({
    entityType: "pharmacologicalClass",
    entityId: id,
    operationType: "update",
    payload: data,
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });
}

export async function deletePharmacologicalClass(id: string): Promise<void> {
  const db = await getDb();

  // Remove junction records first
  await db.medicinePharmacologicalClasses
    .where("pharmacologicalClassId")
    .equals(id)
    .delete();

  await db.pharmacologicalClasses.delete(id);

  await logOperation({
    entityType: "pharmacologicalClass",
    entityId: id,
    operationType: "delete",
    payload: { deletedAt: new Date().toISOString() },
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });
}