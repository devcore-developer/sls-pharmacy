import type {
  StorageSectionItem,
  StorageSectionFormData,
  CartonListItem,
  CartonDetail,
  CartonContentItem,
  CartonFormData,
  CartonSearchResult,
  UnassignedBatch,
  LocationHistoryEntry,
  WarehouseOverview,
  SectionDetail,
  SectionCartonItem,
} from "@/types";
import { logOperation } from "./sync-operations";

async function getDb() {
  const { db } = await import("./db");
  return db;
}

async function getDeviceId() {
  const { getDeviceId: id } = await import("./device-id");
  return id();
}

function getExpiryStatus(expiryDate: Date): "expired" | "expiring_soon" | "valid" {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  if (exp < now) return "expired";
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + 90);
  if (exp <= threshold) return "expiring_soon";
  return "valid";
}

/* ------------------------------------------------------------------ */
/*  Storage Sections                                                   */
/* ------------------------------------------------------------------ */

export async function getSections(includeInactive = false): Promise<StorageSectionItem[]> {
  const db = await getDb();
  const allSections = await db.storageSections.orderBy("name").toArray();
  const sections = includeInactive
    ? allSections
    : allSections.filter((s) => s.isActive !== false);

  const allCartons = await db.cartons
    .filter((c) => c.isActive !== false)
    .toArray();

  const cartonIds = allCartons.map((c) => c.id!);

  const allBatches =
    cartonIds.length > 0
      ? await db.batches
          .where("cartonId")
          .anyOf(cartonIds)
          .filter((b) => !b.archivedAt)
          .toArray()
      : [];

  return sections.map((s) => {
    const sectionCartons = allCartons.filter((c) => c.sectionId === s.id);
    const sectionCartonIds = new Set(sectionCartons.map((c) => c.id!));
    const sectionBatches = allBatches.filter((b) => sectionCartonIds.has(b.cartonId!));
    return {
      id: s.id!,
      name: s.name,
      code: s.code,
      description: s.description || undefined,
      organizationType: s.organizationType,
      isActive: s.isActive !== false,
      cartonCount: sectionCartons.length,
      batchCount: sectionBatches.length,
      totalUnits: sectionBatches.reduce((sum, b) => sum + b.quantity, 0),
    };
  });
}

export async function createSection(data: StorageSectionFormData): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date();
  await db.storageSections.add({
    id,
    name: data.name.trim(),
    code: data.code.trim(),
    description: data.description?.trim() || undefined,
    organizationType: data.organizationType,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  await logOperation({
    entityType: "storageSection",
    entityId: id,
    operationType: "create",
    payload: data,
    deviceId: await getDeviceId(),
  });
  return id;
}

export async function updateSection(
  id: string,
  data: Partial<StorageSectionFormData> & { isActive?: boolean }
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.description !== undefined) updates.description = data.description?.trim() || undefined;
  if (data.organizationType !== undefined) updates.organizationType = data.organizationType;
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  await db.storageSections.update(id, updates);
  await logOperation({
    entityType: "storageSection",
    entityId: id,
    operationType: "update",
    payload: data,
    deviceId: await getDeviceId(),
  });
}

export async function deactivateSection(id: string): Promise<void> {
  await updateSection(id, { isActive: false });
}

/* ------------------------------------------------------------------ */
/*  Cartons                                                           */
/* ------------------------------------------------------------------ */

export async function getCartons(opts?: {
  sectionId?: string;
  includeInactive?: boolean;
}): Promise<CartonListItem[]> {
  const db = await getDb();
  let cartons = await db.cartons.orderBy("code").toArray();

  if (!opts?.includeInactive) {
    cartons = cartons.filter((c) => c.isActive !== false);
  }
  if (opts?.sectionId) {
    cartons = cartons.filter((c) => c.sectionId === opts.sectionId);
  }

  const cartonIds = cartons.map((c) => c.id!);
  const allBatches =
    cartonIds.length > 0
      ? await db.batches
          .where("cartonId")
          .anyOf(cartonIds)
          .filter((b) => !b.archivedAt)
          .toArray()
      : [];

  const sectionIds = [...new Set(cartons.filter((c) => c.sectionId).map((c) => c.sectionId!))];
  const sections =
    sectionIds.length > 0 ? await db.storageSections.where("id").anyOf(sectionIds).toArray() : [];
  const sectionMap = new Map(sections.map((s) => [s.id!, s.name]));

  return cartons.map((c) => {
    const cBatches = allBatches.filter((b) => b.cartonId === c.id!);
    return {
      id: c.id!,
      code: c.code,
      label: c.label,
      sectionId: c.sectionId ?? null,
      sectionName: c.sectionId ? sectionMap.get(c.sectionId) || null : null,
      locationNote: c.locationNote || "",
      batchCount: cBatches.length,
      totalUnits: cBatches.reduce((s, b) => s + b.quantity, 0),
      isActive: c.isActive === true,
    };
  });
}

export async function getCartonById(id: string): Promise<CartonDetail | null> {
  const db = await getDb();
  const carton = await db.cartons.get(id);
  if (!carton) return null;

  let sectionName: string | null = null;
  if (carton.sectionId) {
    const section = await db.storageSections.get(carton.sectionId);
    sectionName = section?.name ?? null;
  }

  const batches = await db.batches
    .where("cartonId")
    .equals(id)
    .filter((b) => !b.archivedAt)
    .toArray();

  const medIds = [...new Set(batches.map((b) => b.medicineId))];
  const meds = medIds.length > 0 ? await db.medicines.where("id").anyOf(medIds).toArray() : [];
  const medMap = new Map(meds.map((m) => [m.id!, m]));

  let expiringSoonCount = 0;
  let expiredCount = 0;

  const contents: CartonContentItem[] = batches.map((b) => {
    const med = medMap.get(b.medicineId);
    const status = getExpiryStatus(b.expiryDate);
    if (status === "expiring_soon") expiringSoonCount++;
    if (status === "expired") expiredCount++;
    return {
      batchId: b.id!,
      medicineId: b.medicineId,
      medicineName: med?.tradeName || "Unknown",
      genericName: med?.genericName || "",
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      quantity: b.quantity,
      expiryStatus: status,
    };
  });

  return {
    id: carton.id!,
    code: carton.code,
    label: carton.label,
    sectionId: carton.sectionId ?? null,
    sectionName,
    locationNote: carton.locationNote || "",
    isActive: carton.isActive !== false,
    batchCount: batches.length,
    totalUnits: batches.reduce((s, b) => s + b.quantity, 0),
    expiringSoonCount,
    expiredCount,
    contents,
  };
}

export async function createCarton(data: CartonFormData): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const codeTrimmed = data.code.trim();

  if (!codeTrimmed) return { success: false, error: "Carton code is required." };
  if (!data.sectionId) return { success: false, error: "Section is required." };

  const existing = await db.cartons.where("code").equals(codeTrimmed).first();
  if (existing) {
    return { success: false, error: `Carton code "${codeTrimmed}" already exists.` };
  }

  const now = new Date();
  const id = crypto.randomUUID();
  await db.cartons.add({
    id,
    code: codeTrimmed,
    label: data.label.trim(),
    sectionId: data.sectionId,
    locationNote: data.locationNote?.trim() || undefined,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  await logOperation({
    entityType: "carton",
    entityId: id,
    operationType: "create",
    payload: data,
    deviceId: await getDeviceId(),
  });

  return { success: true };
}

export async function updateCarton(
  id: string,
  data: { label?: string; sectionId?: string; locationNote?: string; isActive?: boolean }
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (data.label !== undefined) updates.label = data.label.trim();
  if (data.sectionId !== undefined) updates.sectionId = data.sectionId;
  if (data.locationNote !== undefined) updates.locationNote = data.locationNote?.trim() || undefined;
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  await db.cartons.update(id, updates);
  await logOperation({
    entityType: "carton",
    entityId: id,
    operationType: "update",
    payload: data,
    deviceId: await getDeviceId(),
  });
}

export async function deactivateCarton(id: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const carton = await db.cartons.get(id);
  if (!carton) return { success: false, error: "Carton not found." };

  const batches = await db.batches
    .where("cartonId")
    .equals(id)
    .filter((b) => !b.archivedAt && b.quantity > 0)
    .toArray();

  if (batches.length > 0) {
    return {
      success: false,
      error: `Cannot deactivate: carton contains ${batches.length} batch${batches.length !== 1 ? "es" : ""} with stock.`,
    };
  }

  await updateCarton(id, { isActive: false });
  return { success: true };
}

export async function getAllCartonsSimple(): Promise<Array<{ id: string; code: string; label: string }>> {
  const db = await getDb();
  const cartons = await db.cartons.filter((c: { isActive?: boolean }) => c.isActive !== false).toArray();
  return cartons
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((c) => ({ id: c.id!, code: c.code, label: c.label }));
}

/* ------------------------------------------------------------------ */
/*  Carton Contents                                                   */
/* ------------------------------------------------------------------ */

export async function getCartonContents(cartonId: string): Promise<CartonContentItem[]> {
  const db = await getDb();
  const batches = await db.batches
    .where("cartonId")
    .equals(cartonId)
    .filter((b) => !b.archivedAt)
    .toArray();

  if (batches.length === 0) return [];

  const medIds = [...new Set(batches.map((b) => b.medicineId))];
  const meds = medIds.length > 0 ? await db.medicines.where("id").anyOf(medIds).toArray() : [];
  const medMap = new Map(meds.map((m) => [m.id!, m]));

  return batches.map((b) => {
    const med = medMap.get(b.medicineId);
    return {
      batchId: b.id!,
      medicineId: b.medicineId,
      medicineName: med?.tradeName || "Unknown",
      genericName: med?.genericName || "",
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      quantity: b.quantity,
      expiryStatus: getExpiryStatus(b.expiryDate),
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Carton Search                                                     */
/* ------------------------------------------------------------------ */

export async function searchCartons(query: string): Promise<CartonListItem[]> {
  if (!query.trim()) return [];
  const cartons = await getCartons();
  const q = query.toLowerCase();
  return cartons.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q) ||
      (c.sectionName?.toLowerCase().includes(q) ?? false)
  );
}

export async function searchCartonContents(query: string): Promise<CartonSearchResult[]> {
  const db = await getDb();
  if (!query.trim()) return [];

  const q = query.toLowerCase();

  // Search by carton code/label first
  const allCartons = await db.cartons.filter((c) => c.isActive !== false).toArray();
  const matchedCartonIds = allCartons
    .filter((c) => c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q))
    .map((c) => c.id!);

  // Search by medicine name in batches
  const allBatches = await db.batches.filter((b) => !b.archivedAt && !!b.cartonId).toArray();
  const medIds = [...new Set(allBatches.map((b) => b.medicineId))];
  const meds = medIds.length > 0 ? await db.medicines.where("id").anyOf(medIds).toArray() : [];
  const medMap = new Map(meds.map((m) => [m.id!, m]));

  const medicineMatchCartonIds = new Set<string>();
  for (const b of allBatches) {
    const med = medMap.get(b.medicineId);
    if (
      med &&
      (med.tradeName.toLowerCase().includes(q) || med.genericName.toLowerCase().includes(q))
    ) {
      if (b.cartonId) medicineMatchCartonIds.add(b.cartonId);
    }
  }

  const relevantIds = [...new Set([...matchedCartonIds, ...medicineMatchCartonIds])];
  if (relevantIds.length === 0) return [];

  const sectionIds = [...new Set(allCartons.filter((c) => c.sectionId && relevantIds.includes(c.id!)).map((c) => c.sectionId!))];
  const sections = sectionIds.length > 0 ? await db.storageSections.where("id").anyOf(sectionIds).toArray() : [];
  const sectionMap = new Map(sections.map((s) => [s.id!, s.name]));

  const results: CartonSearchResult[] = [];
  for (const cid of relevantIds) {
    const carton = allCartons.find((c) => c.id === cid);
    if (!carton) continue;

    const cBatches = allBatches.filter((b) => b.cartonId === cid);
    const matches = cBatches
      .filter((b) => {
        const med = medMap.get(b.medicineId);
        if (!med) return false;
        return (
          med.tradeName.toLowerCase().includes(q) ||
          med.genericName.toLowerCase().includes(q)
        );
      })
      .map((b) => {
        const med = medMap.get(b.medicineId);
        return {
          batchId: b.id!,
          medicineName: med?.tradeName || "Unknown",
          genericName: med?.genericName || "",
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate,
          quantity: b.quantity,
        };
      });

    results.push({
      cartonId: cid,
      cartonCode: carton.code,
      cartonLabel: carton.label,
      sectionName: carton.sectionId ? sectionMap.get(carton.sectionId) || null : null,
      matches,
    });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Unassigned Batches                                                */
/* ------------------------------------------------------------------ */

export async function getUnassignedBatches(): Promise<UnassignedBatch[]> {
  const db = await getDb();
  const batches = await db.batches
    .filter((b) => !b.archivedAt && !b.cartonId)
    .toArray();

  if (batches.length === 0) return [];

  const medIds = [...new Set(batches.map((b) => b.medicineId))];
  const meds = medIds.length > 0 ? await db.medicines.where("id").anyOf(medIds).toArray() : [];
  const medMap = new Map(meds.map((m) => [m.id!, m]));

  return batches.map((b) => ({
    batchId: b.id!,
    medicineId: b.medicineId,
    medicineName: medMap.get(b.medicineId)?.tradeName || "Unknown",
    genericName: medMap.get(b.medicineId)?.genericName || "",
    batchNumber: b.batchNumber,
    expiryDate: b.expiryDate,
    quantity: b.quantity,
  }));
}

/* ------------------------------------------------------------------ */
/*  Batch Location                                                    */
/* ------------------------------------------------------------------ */

export async function getBatchLocation(batchId: string): Promise<{
  sectionName: string | null;
  cartonCode: string | null;
  cartonLabel: string | null;
  locationNote: string | null;
  isUnassigned: boolean;
}> {
  const db = await getDb();
  const batch = await db.batches.get(batchId);
  if (!batch || !batch.cartonId) {
    return { sectionName: null, cartonCode: null, cartonLabel: null, locationNote: null, isUnassigned: true };
  }

  const carton = await db.cartons.get(batch.cartonId);
  if (!carton) {
    return { sectionName: null, cartonCode: null, cartonLabel: null, locationNote: null, isUnassigned: true };
  }

  let sectionName: string | null = null;
  if (carton.sectionId) {
    const section = await db.storageSections.get(carton.sectionId);
    sectionName = section?.name ?? null;
  }

  return {
    sectionName,
    cartonCode: carton.code,
    cartonLabel: carton.label,
    locationNote: carton.locationNote || null,
    isUnassigned: false,
  };
}

export async function getBatchLocationHistory(batchId: string): Promise<LocationHistoryEntry[]> {
  const db = await getDb();
  const transfers = await db.batchLocationTransfers
    .where("batchId")
    .equals(batchId)
    .reverse()
    .sortBy("createdAt");

  const cartonIds = new Set<string>();
  for (const t of transfers) {
    if (t.fromCartonId) cartonIds.add(t.fromCartonId);
    if (t.toCartonId) cartonIds.add(t.toCartonId);
  }

  const cartons =
    cartonIds.size > 0 ? await db.cartons.where("id").anyOf([...cartonIds]).toArray() : [];
  const cartonMap = new Map(cartons.map((c) => [c.id!, c.code]));

  const history: LocationHistoryEntry[] = transfers.map((t) => ({
    id: t.id!,
    fromCartonCode: t.fromCartonId ? cartonMap.get(t.fromCartonId) || null : null,
    toCartonCode: t.toCartonId ? cartonMap.get(t.toCartonId) || null : null,
    note: t.note || undefined,
    createdAt: t.createdAt,
  }));

  // Add initial assignment if no transfers exist but batch has carton
  const batch = await db.batches.get(batchId);
  if (batch?.cartonId && transfers.length === 0) {
    const carton = await db.cartons.get(batch.cartonId);
    history.unshift({
      id: "initial",
      fromCartonCode: null,
      toCartonCode: carton?.code || null,
      note: "Assigned on creation",
      createdAt: batch.createdAt,
    });
  }

  return history;
}

export async function assignBatchToCarton(
  batchId: string,
  cartonId: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const carton = await db.cartons.get(cartonId);
  if (!carton) return { success: false, error: "Carton not found." };
  if (carton.isActive === false) return { success: false, error: "Cannot assign to a deactivated carton." };

  const batch = await db.batches.get(batchId);
  if (!batch || batch.archivedAt) return { success: false, error: "Batch not found or archived." };

  const now = new Date();
  const deviceId = await getDeviceId();

  await db.transaction("rw", [db.batches, db.batchLocationTransfers, db.syncOperations], async () => {
    await db.batches.update(batchId, { cartonId, updatedAt: now });
    await db.batchLocationTransfers.add({
      id: crypto.randomUUID(),
      batchId,
      fromCartonId: batch.cartonId ?? undefined,
      toCartonId: cartonId,
      createdAt: now,
      deviceId,
    });
  });

  await logOperation({
    entityType: "batchCartonAssignment",
    entityId: batchId,
    operationType: "update",
    payload: { batchId, cartonId },
    deviceId,
  });

  return { success: true };
}

export async function moveBatchCarton(
  batchId: string,
  toCartonId: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const batch = await db.batches.get(batchId);
  if (!batch || batch.archivedAt) return { success: false, error: "Batch not found or archived." };

  const fromCartonId = batch.cartonId;
  if (!fromCartonId) return { success: false, error: "Batch is not assigned to any carton. Use Assign instead." };
  if (fromCartonId === toCartonId) return { success: false, error: "Cannot move to the same carton." };

  const toCarton = await db.cartons.get(toCartonId);
  if (!toCarton) return { success: false, error: "Destination carton not found." };
  if (toCarton.isActive === false) return { success: false, error: "Cannot move to a deactivated carton." };

  const now = new Date();
  const deviceId = await getDeviceId();

  await db.transaction("rw", [db.batches, db.batchLocationTransfers, db.syncOperations], async () => {
    await db.batches.update(batchId, { cartonId: toCartonId, updatedAt: now });
    await db.batchLocationTransfers.add({
      id: crypto.randomUUID(),
      batchId,
      fromCartonId,
      toCartonId,
      note: note || undefined,
      createdAt: now,
      deviceId,
    });
  });

  await logOperation({
    entityType: "batchLocationTransfer",
    entityId: batchId,
    operationType: "create",
    payload: { batchId, fromCartonId, toCartonId, note },
    deviceId,
  });

  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Warehouse Overview                                                */
/* ------------------------------------------------------------------ */

export async function getWarehouseOverview(): Promise<WarehouseOverview> {
  const db = await getDb();

  const [sections, cartons, batches, convoys] = await Promise.all([
    db.storageSections.filter((s) => s.isActive !== false).toArray(),
    db.cartons.filter((c) => c.isActive !== false).toArray(),
    db.batches.filter((b) => !b.archivedAt).toArray(),
    db.convoys.toArray(),
  ]);

  const cartonIds = new Set(cartons.map((c) => c.id!));
  const batchesInCartons = batches.filter((b) => b.cartonId && cartonIds.has(b.cartonId));

  const occupiedCartonIds = new Set(batchesInCartons.map((b) => b.cartonId!));
  const emptyCartons = cartons.filter((c) => !occupiedCartonIds.has(c.id!));

  return {
    totalSections: sections.length,
    totalCartons: cartons.length,
    occupiedCartons: occupiedCartonIds.size,
    emptyCartons: emptyCartons.length,
    totalBatches: batches.length,
    totalUnits: batches.reduce((s, b) => s + b.quantity, 0),
    activeConvoys: convoys.filter((c) => c.status === "ACTIVE").length,
  };
}

/* ------------------------------------------------------------------ */
/*  Section Detail                                                    */
/* ------------------------------------------------------------------ */

export async function getSectionDetail(sectionId: string): Promise<SectionDetail | null> {
  const db = await getDb();
  const section = await db.storageSections.get(sectionId);
  if (!section) return null;

  const cartons = await db.cartons
    .filter((c) => c.sectionId === sectionId && c.isActive !== false)
    .toArray();

  const cartonIds = cartons.map((c) => c.id!);
  const batches =
    cartonIds.length > 0
      ? await db.batches
          .where("cartonId")
          .anyOf(cartonIds)
          .filter((b) => !b.archivedAt)
          .toArray()
      : [];

  let expiringSoonCount = 0;
  let expiredCount = 0;
  for (const b of batches) {
    const status = getExpiryStatus(b.expiryDate);
    if (status === "expiring_soon") expiringSoonCount++;
    if (status === "expired") expiredCount++;
  }

  return {
    id: section.id!,
    name: section.name,
    code: section.code,
    description: section.description || null,
    organizationType: section.organizationType,
    isActive: section.isActive !== false,
    cartonCount: cartons.length,
    batchCount: batches.length,
    totalUnits: batches.reduce((s, b) => s + b.quantity, 0),
    expiringSoonCount,
    expiredCount,
  };
}

export async function getSectionCartons(sectionId: string): Promise<SectionCartonItem[]> {
  const db = await getDb();
  const allCartons = await db.cartons.toArray();

  const cartonIds: string[] = [];
  for (const c of allCartons) {
    if (c.sectionId === sectionId && c.isActive === true) {
      cartonIds.push(c.id!);
    }
  }

  const allBatches =
    cartonIds.length > 0
      ? await db.batches
          .where("cartonId")
          .anyOf(cartonIds)
          .filter((b) => !b.archivedAt)
          .toArray()
      : [];

  const results: SectionCartonItem[] = [];

  for (const c of allCartons) {
    if (c.sectionId !== sectionId || c.isActive !== true) continue;

    const cBatches = allBatches.filter((b) => b.cartonId === c.id!);
    let expiringSoonCount = 0;
    let expiredCount = 0;
    for (const b of cBatches) {
      const status = getExpiryStatus(b.expiryDate);
      if (status === "expiring_soon") expiringSoonCount++;
      if (status === "expired") expiredCount++;
    }
    results.push({
      id: c.id!,
      code: c.code,
      label: c.label,
      locationNote: c.locationNote || "",
      isActive: true,
      batchCount: cBatches.length,
      totalUnits: cBatches.reduce((s, b) => s + b.quantity, 0),
      expiringSoonCount,
      expiredCount,
    });
  }

  return results;
}