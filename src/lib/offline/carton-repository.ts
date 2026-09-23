import { db } from "./db";
import { logOperation } from "./sync-operations";
import { getDeviceId } from "./device-id";

export async function createCarton(data: {
  code: string;
  label?: string;
  specialty?: string;
  category?: string;
  sectionId?: string;
  locationNote?: string;
  userId?: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();

  await db.cartons.add({
    id,
    code: data.code,
    label: data.label || undefined,
    specialty: data.specialty || undefined,
    category: data.category || undefined,
    sectionId: data.sectionId || undefined,
    locationNote: data.locationNote || undefined,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  await logOperation({
    entityType: "carton",
    entityId: id,
    operationType: "create",
    payload: { ...data, id },
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });

  return id;
}

export async function updateCarton(id: string, data: {
  code?: string;
  label?: string;
  specialty?: string;
  category?: string;
  sectionId?: string;
  locationNote?: string;
  isActive?: boolean;
  userId?: string;
}): Promise<void> {
  const now = new Date();

  await db.cartons.update(id, {
    code: data.code,
    label: data.label || undefined,
    specialty: data.specialty || undefined,
    category: data.category || undefined,
    sectionId: data.sectionId || undefined,
    locationNote: data.locationNote || undefined,
    isActive: data.isActive,
    updatedAt: now,
  });

  await logOperation({
    entityType: "carton",
    entityId: id,
    operationType: "update",
    payload: data,
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });
}

export async function getAllCartonsSimple(): Promise<Array<{ id: string; code: string; label: string }>> {
  const { getAllCartonsSimple: getSimple } = await import("./warehouse-repository");
  return getSimple();
}