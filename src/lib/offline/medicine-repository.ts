import type {
  MedicineRecord,
  CategoryRecord,
  PharmacologicalClassRecord,
  MedicineCategoryRecord,
  MedicinePharmacologicalClassRecord,
  BatchRecord,
  CartonRecord,
} from "./db";
import type {
  MedicineWithRelations,
  MedicineListItem,
  MedicineFormData,
  CategoryItem,
  PharmacologicalClassItem,
  CartonItem,
  ExpiryStatus,
} from "@/types";
import { seedCategories, seedPharmacologicalClasses } from "./seed-data";
import { logOperation } from "./sync-operations";
import { getDeviceId } from "./device-id";
import {
  getNearestExpiry,
  getExpiryStatus,
  calculateTotalStock,
} from "./stock-utils";

async function getDb() {
  const { db } = await import("./db");
  return db;
}

function toCategoryItem(r: CategoryRecord): CategoryItem {
  return { id: r.id!, name: r.name };
}

function toClassItem(r: PharmacologicalClassRecord): PharmacologicalClassItem {
  return { id: r.id!, name: r.name };
}

function toMedicineWithRelations(
  m: MedicineRecord,
  cats: CategoryRecord[],
  classes: PharmacologicalClassRecord[]
): MedicineWithRelations {
  return {
    id: m.id!,
    tradeName: m.tradeName,
    genericName: m.genericName,
    manufacturer: m.manufacturer || "",
    barcode: m.barcode || undefined, // أضف هذا السطر
    notes: m.notes || "",
    archivedAt: m.archivedAt ?? null,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    categories: cats.map(toCategoryItem),
    pharmacologicalClasses: classes.map(toClassItem),
  };
}

export async function ensureSeedData(): Promise<void> {
  const db = await getDb();
  if ((await db.categories.count()) === 0) {
    await db.categories.bulkAdd(seedCategories);
  }
  if ((await db.pharmacologicalClasses.count()) === 0) {
    await db.pharmacologicalClasses.bulkAdd(seedPharmacologicalClasses);
  }
}

/* ------------------------------------------------------------------ */
/*  Basic CRUD                                                        */
/* ------------------------------------------------------------------ */

export async function getAllMedicines(): Promise<MedicineWithRelations[]> {
  const db = await getDb();
  const medicines = await db.medicines.orderBy("tradeName").toArray();
  if (medicines.length === 0) return [];
  return attachRelations(medicines);
}

export async function getMedicineById(
  id: string
): Promise<MedicineWithRelations | null> {
  const db = await getDb();
  const m = await db.medicines.get(id);
  if (!m) return null;
  const results = await attachRelations([m]);
  return results[0] || null;
}

export async function createMedicine(data: MedicineFormData): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date();

  await db.medicines.add({
    id,
    tradeName: data.tradeName.trim(),
    genericName: data.genericName.trim(),
    manufacturer: data.manufacturer.trim() || undefined,
    notes: data.notes.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  });

  if (data.categoryIds.length > 0) {
    await db.medicineCategories.bulkAdd(
      data.categoryIds.map((categoryId) => ({ medicineId: id, categoryId }))
    );
  }

  if (data.pharmacologicalClassIds.length > 0) {
    await db.medicinePharmacologicalClasses.bulkAdd(
      data.pharmacologicalClassIds.map((pharmacologicalClassId) => ({
        medicineId: id,
        pharmacologicalClassId,
      }))
    );
  }

  await logOperation({
    entityType: "medicine",
    entityId: id,
    operationType: "create",
    payload: { ...data, id },
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });

  return id;
}

export async function updateMedicine(
  id: string,
  data: MedicineFormData
): Promise<void> {
  const db = await getDb();
  const now = new Date();

  await db.medicines.update(id, {
    tradeName: data.tradeName.trim(),
    genericName: data.genericName.trim(),
    manufacturer: data.manufacturer.trim() || undefined,
    notes: data.notes.trim() || undefined,
    updatedAt: now,
  });

  // Replace category relations
  await db.medicineCategories.where("medicineId").equals(id).delete();
  if (data.categoryIds.length > 0) {
    await db.medicineCategories.bulkAdd(
      data.categoryIds.map((categoryId) => ({ medicineId: id, categoryId }))
    );
  }

  // Replace pharmacological class relations
  await db.medicinePharmacologicalClasses
    .where("medicineId")
    .equals(id)
    .delete();
  if (data.pharmacologicalClassIds.length > 0) {
    await db.medicinePharmacologicalClasses.bulkAdd(
      data.pharmacologicalClassIds.map((pharmacologicalClassId) => ({
        medicineId: id,
        pharmacologicalClassId,
      }))
    );
  }

  await logOperation({
    entityType: "medicine",
    entityId: id,
    operationType: "update",
    payload: data,
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });
}

export async function archiveMedicine(id: string): Promise<void> {
  const db = await getDb();
  await db.medicines.update(id, {
    archivedAt: new Date(),
    updatedAt: new Date(),
  });

  await logOperation({
    entityType: "medicine",
    entityId: id,
    operationType: "delete",
    payload: { archivedAt: new Date().toISOString() },
    deviceId: typeof window !== "undefined" ? getDeviceId() : undefined,
  });
}

/* ------------------------------------------------------------------ */
/*  List with stock data (for medicine page + search)                 */
/* ------------------------------------------------------------------ */

export async function getMedicineListData(): Promise<{
  items: MedicineListItem[];
  cartons: CartonItem[];
}> {
  const db = await getDb();

  const medicines = await db.medicines.orderBy("tradeName").toArray();
  if (medicines.length === 0) return { items: [], cartons: [] };

  // Attach categories & classes
  const medsRel = await attachRelations(medicines);

  // Batches
  const allBatches = await db.batches.toArray();
  const activeBatches = allBatches.filter((b) => !b.archivedAt);

  // Cartons - use new field names (label, locationNote, sectionId)
  const cartonIds = [
    ...new Set(activeBatches.filter((b) => b.cartonId).map((b) => b.cartonId!)),
  ];
  const cartonRecords: CartonRecord[] =
    cartonIds.length > 0
      ? await db.cartons.where("id").anyOf(cartonIds).toArray()
      : [];
  const cartonMap = new Map(
    cartonRecords.map((c) => [
      c.id!,
      {
        id: c.id!,
        code: c.code,
        name: c.label,
        location: c.locationNote || "",
        categoryId: c.sectionId,
      },
    ])
  );

  // Group batches by medicine
  const batchesByMed = new Map<string, BatchRecord[]>();
  for (const b of activeBatches) {
    const list = batchesByMed.get(b.medicineId) || [];
    list.push(b);
    batchesByMed.set(b.medicineId, list);
  }

  const items: MedicineListItem[] = medsRel.map((med) => {
    const medBatches = batchesByMed.get(med.id) || [];
    const cartonSet = new Set(
      medBatches.filter((b) => b.cartonId).map((b) => b.cartonId)
    );
    const nearestExpiry = getNearestExpiry(medBatches);
    const expiryStatus: ExpiryStatus = nearestExpiry
      ? getExpiryStatus(nearestExpiry)
      : "valid";

    return {
      medicine: med,
      totalQuantity: calculateTotalStock(medBatches),
      batchCount: medBatches.length,
      cartonCount: cartonSet.size,
      nearestExpiry,
      expiryStatus,
      batchNumbers: medBatches.map((b) => b.batchNumber),
      cartonCodes: medBatches
        .filter((b) => b.cartonId)
        .map((b) => cartonMap.get(b.cartonId!)?.code || "")
        .filter(Boolean),
    };
  });

  const allCartons = await db.cartons.toArray();
  const sortedCartons = allCartons.sort((a, b) => a.code.localeCompare(b.code));
  const cartonItems: CartonItem[] = sortedCartons.map((c) => ({
    id: c.id!,
    code: c.code,
    name: c.label,
    categoryId: c.sectionId,
    location: c.locationNote || "",
  }));

  return { items, cartons: cartonItems };
}

/* ------------------------------------------------------------------ */
/*  Lookups                                                           */
/* ------------------------------------------------------------------ */

export async function getAllCategories(): Promise<CategoryItem[]> {
  const db = await getDb();
  const records = await db.categories.orderBy("name").toArray();
  return records.map(toCategoryItem);
}

export async function getAllPharmacologicalClasses(): Promise<PharmacologicalClassItem[]> {
  const db = await getDb();
  const records = await db.pharmacologicalClasses.orderBy("name").toArray();
  return records.map(toClassItem);
}

/* ------------------------------------------------------------------ */
/*  Search & Barcode Lookup                                            */
/* ------------------------------------------------------------------ */

export interface MedicineSearchResult {
  id: string;
  tradeName: string;
  genericName: string;
  manufacturer?: string;
  barcode?: string;
}

/**
 * Normalize Arabic/English text for fuzzy search matching.
 * Handles common Arabic character variations (alef forms, taa marbuta, etc.)
 */
function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ة]/g, "ه")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[ـ]/g, "")
    .trim();
}

/**
 * Search medicines by trade name, generic name, or barcode.
 * Case-insensitive, Arabic-normalized. Returns up to `limit` active (non-archived) results.
 * Runs entirely offline against IndexedDB.
 */
export async function searchMedicines(
  query: string,
  limit = 10
): Promise<MedicineSearchResult[]> {
  if (query.length < 2) return [];

  const db = await getDb();
  const normalizedQuery = normalizeSearchText(query);

  // Using Dexie filter is much faster for 25k+ records than toArray()
  const results = await db.medicines
    .filter((m) => {
      if (m.archivedAt) return false;
      const tradeMatch = normalizeSearchText(m.tradeName).includes(normalizedQuery);
      const genericMatch = normalizeSearchText(m.genericName).includes(normalizedQuery);
      const barcodeMatch = m.barcode ? m.barcode.includes(query) : false;
      return tradeMatch || genericMatch || barcodeMatch;
    })
    .limit(limit)
    .toArray();

  return results.map((m) => ({
    id: m.id!,
    tradeName: m.tradeName,
    genericName: m.genericName,
    manufacturer: m.manufacturer || undefined,
    barcode: m.barcode || undefined,
  }));
}

/**
 * Find a single active medicine by its exact barcode.
 * Uses the IndexedDB barcode index for O(1) lookup.
 */
export async function findMedicineByBarcode(
  barcode: string
): Promise<MedicineSearchResult | null> {
  const db = await getDb();
  const medicine = await db.medicines.where("barcode").equals(barcode).first();

  if (!medicine || medicine.archivedAt) return null;

  return {
    id: medicine.id!,
    tradeName: medicine.tradeName,
    genericName: medicine.genericName,
    manufacturer: medicine.manufacturer || undefined,
    barcode: medicine.barcode || undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

async function attachRelations(
  medicines: MedicineRecord[]
): Promise<MedicineWithRelations[]> {
  const db = await getDb();
  const ids = medicines.map((m) => m.id!);

  const medCats = await db.medicineCategories
    .where("medicineId")
    .anyOf(ids)
    .toArray();
  const medClasses = await db.medicinePharmacologicalClasses
    .where("medicineId")
    .anyOf(ids)
    .toArray();

  const catIds = [...new Set(medCats.map((mc) => mc.categoryId))];
  const classIds = [
    ...new Set(medClasses.map((mc) => mc.pharmacologicalClassId)),
  ];

  const allCats =
    catIds.length > 0
      ? await db.categories.where("id").anyOf(catIds).toArray()
      : [];
  const allClasses =
    classIds.length > 0
      ? await db.pharmacologicalClasses.where("id").anyOf(classIds).toArray()
      : [];

  const catMap = new Map(allCats.map((c) => [c.id, c]));
  const classMap = new Map(allClasses.map((c) => [c.id, c]));

  const catsByMed = new Map<string, CategoryRecord[]>();
  for (const mc of medCats) {
    const cat = catMap.get(mc.categoryId);
    if (cat) {
      const list = catsByMed.get(mc.medicineId) || [];
      list.push(cat);
      catsByMed.set(mc.medicineId, list);
    }
  }

  const classesByMed = new Map<string, PharmacologicalClassRecord[]>();
  for (const mc of medClasses) {
    const cls = classMap.get(mc.pharmacologicalClassId);
    if (cls) {
      const list = classesByMed.get(mc.medicineId) || [];
      list.push(cls);
      classesByMed.set(mc.medicineId, list);
    }
  }

  return medicines.map((m) =>
    toMedicineWithRelations(
      m,
      catsByMed.get(m.id!) || [],
      classesByMed.get(m.id!) || []
    )
  );
}

/**
 * Pulls medicine catalog from server API and stores it in local IndexedDB.
 * This runs on app load to ensure offline availability.
 */
export async function syncMedicinesFromServer(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;

  try {
    const response = await fetch("/api/medicines");
    if (!response.ok) return;
    
    const serverMedicines = await response.json();
    if (!Array.isArray(serverMedicines) || serverMedicines.length === 0) return;

    const db = await getDb();
    const localCount = await db.medicines.count();
    
    // If local count matches server count, assume synced.
    if (localCount === serverMedicines.length) {
      console.log("Medicine catalog already synced.");
      return;
    }

    console.log(`Syncing ${serverMedicines.length} medicines from server to IndexedDB...`);
    
    const dexieMedicines = serverMedicines.map((m: any) => ({
      id: m.id,
      tradeName: m.tradeName,
      genericName: m.genericName,
      manufacturer: m.manufacturer || undefined,
      barcode: m.barcode || undefined,
      notes: m.notes || undefined,
      archivedAt: m.archivedAt ? new Date(m.archivedAt) : undefined,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
    }));

    await db.medicines.bulkPut(dexieMedicines);
    console.log("Medicine catalog sync complete.");
  } catch (error) {
    console.error("Failed to sync medicines from server:", error);
  }
}