import type { CategoryRecord } from "./db";
import type { CategoryItem, CategoryFormData } from "@/types";
import { logOperation } from "./sync-operations";
import { getDeviceId } from "./device-id";

async function getDb() {
  const { db } = await import("./db");
  return db;
}

function toItem(r: CategoryRecord): CategoryItem {
  return { id: r.id!, name: r.name };
}

export async function getAllCategories(): Promise<CategoryItem[]> {
  const db = await getDb();
  return (await db.categories.orderBy("name").toArray()).map(toItem);
}

export async function getCategoryById(id: string): Promise<CategoryRecord | null> {
  const db = await getDb();
  return (await db.categories.get(id)) ?? null;
}

export async function createCategory(data: CategoryFormData): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date();

  await db.categories.add({
    id,
    name: data.name.trim(),
    description: data.description.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  });

  await logOperation({
    entityType: "category",
    entityId: id,
    operationType: "create",
    payload: data,
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });

  return id;
}

export async function updateCategory(id: string, data: CategoryFormData): Promise<void> {
  const db = await getDb();

  await db.categories.update(id, {
    name: data.name.trim(),
    description: data.description.trim() || undefined,
    updatedAt: new Date(),
  });

  await logOperation({
    entityType: "category",
    entityId: id,
    operationType: "update",
    payload: data,
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();

  // Remove junction records first
  await db.medicineCategories.where("categoryId").equals(id).delete();

  await db.categories.delete(id);

  await logOperation({
    entityType: "category",
    entityId: id,
    operationType: "delete",
    payload: { deletedAt: new Date().toISOString() },
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });
}