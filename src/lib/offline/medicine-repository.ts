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
    barcode: m.barcode || undefined,
    strength: m.strength || undefined,
    dosageForm: m.dosageForm || undefined,
    route: m.route || undefined,
    drugClass: m.drugClass || undefined,
    category: m.category || undefined,
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
    barcode: data.barcode?.trim() || undefined,
    strength: data.strength?.trim() || undefined,
    dosageForm: data.dosageForm?.trim() || undefined,
    route: data.route?.trim() || undefined,
    drugClass: data.drugClass?.trim() || undefined,
    category: data.category?.trim() || undefined,
    notes: data.notes.trim() || undefined,
    isCatalog: false,
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
    barcode: data.barcode?.trim() || undefined,
    strength: data.strength?.trim() || undefined,
    dosageForm: data.dosageForm?.trim() || undefined,
    route: data.route?.trim() || undefined,
    drugClass: data.drugClass?.trim() || undefined,
    category: data.category?.trim() || undefined,
    notes: data.notes.trim() || undefined,
    updatedAt: now,
  });

  await db.medicineCategories.where("medicineId").equals(id).delete();
  if (data.categoryIds.length > 0) {
    await db.medicineCategories.bulkAdd(
      data.categoryIds.map((categoryId) => ({ medicineId: id, categoryId }))
    );
  }

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
/*  PAGINATED LIST (Fixes 5-minute load)                              */
/* ------------------------------------------------------------------ */

export interface PaginatedMedicines {
  items: MedicineListItem[];
  total: number;
}

export async function getMedicinesPaginated({
  page = 1,
  limit = 25,
  search = "",
  filters = {},
}: {
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, any>;
}): Promise<PaginatedMedicines> {
  const db = await getDb();
  
  let collection = db.medicines.orderBy("tradeName");
  
  // 1. Apply Filters (Efficient Dexie filtering before pagination)
  const filteredCollection = collection.filter((m) => {
    // Status filter
    if (filters.status === "active" && m.archivedAt) return false;
    if (filters.status === "archived" && !m.archivedAt) return false;
    
    // Category filter (checks direct string or relation array)
    if (filters.category && filters.category !== "all") {
      if (m.category !== filters.category) return false; // Optimized for imported string
    }
    
    // Search filter
    if (search && search.length >= 2) {
      const q = search.toLowerCase();
      const tMatch = m.tradeName.toLowerCase().includes(q);
      const gMatch = m.genericName.toLowerCase().includes(q);
      const bMatch = m.barcode ? m.barcode.includes(q) : false;
      if (!tMatch && !gMatch && !bMatch) return false;
    }
    
    return true;
  });

  const total = await filteredCollection.count();
  const offset = (page - 1) * limit;
  
  // 2. Fetch ONLY the current page medicines
  const pagedMedicines = await filteredCollection.offset(offset).limit(limit).toArray();
  
  if (pagedMedicines.length === 0) return { items: [], total: 0 };

  // 3. Attach Relations ONLY for the loaded medicines
  const medsRel = await attachRelations(pagedMedicines);

  // 4. Fetch Batches & Stock ONLY for the loaded medicines
  const medIds = pagedMedicines.map(m => m.id!);
  const batches = await db.batches.where("medicineId").anyOf(medIds).toArray();
  const activeBatches = batches.filter(b => !b.archivedAt);

  const items: MedicineListItem[] = medsRel.map((med) => {
    const medBatches = activeBatches.filter(b => b.medicineId === med.id);
    const nearestExpiry = getNearestExpiry(medBatches);
    const expiryStatus: ExpiryStatus = nearestExpiry ? getExpiryStatus(nearestExpiry) : "valid";

    return {
      medicine: med,
      totalQuantity: calculateTotalStock(medBatches),
      batchCount: medBatches.length,
      cartonCount: 0,
      nearestExpiry,
      expiryStatus,
      batchNumbers: medBatches.map(b => b.batchNumber),
      cartonCodes: [],
    };
  });

  return { items, total };
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
/*  Search & Barcode Lookup (Autocomplete)                            */
/* ------------------------------------------------------------------ */

export interface MedicineSearchResult {
  id: string;
  tradeName: string;
  genericName: string;
  manufacturer?: string;
  barcode?: string;
  strength?: string | null;
  dosageForm?: string | null;
  route?: string | null;
  drugClass?: string | null;
  category?: string | null;
}

export async function searchMedicines(
  query: string,
  limit = 10
): Promise<MedicineSearchResult[]> {
  if (query.length < 2) return [];

  const db = await getDb();
  const lowerQuery = query.toLowerCase();

  const results = await db.medicines
    .filter((m) => {
      if (m.archivedAt) return false;
      return (
        m.tradeName.toLowerCase().includes(lowerQuery) ||
        m.genericName.toLowerCase().includes(lowerQuery) ||
        (m.barcode ? m.barcode.includes(query) : false)
      );
    })
    .limit(limit)
    .toArray();

  return results.map((m) => ({
    id: m.id!,
    tradeName: m.tradeName,
    genericName: m.genericName,
    manufacturer: m.manufacturer || undefined,
    barcode: m.barcode || undefined,
    strength: m.strength || undefined,
    dosageForm: m.dosageForm || undefined,
    route: m.route || undefined,
    drugClass: m.drugClass || undefined,
    category: m.category || undefined,
  }));
}

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
    
    if (localCount === serverMedicines.length) {
      console.log("Medicine catalog already synced.");
      return;
    }

    console.log(`Syncing ${serverMedicines.length} medicines from server...`);
    
    const dexieMedicines = serverMedicines.map((m: any) => ({
      id: m.id,
      tradeName: m.tradeName,
      genericName: m.genericName,
      manufacturer: m.manufacturer || undefined,
      barcode: m.barcode || undefined,
      notes: m.notes || undefined,
      strength: m.strength || undefined,
      dosageForm: m.dosageForm || undefined,
      route: m.route || undefined,
      drugClass: m.drugClass || undefined,
      category: m.category || undefined,
      isCatalog: m.isCatalog || false,
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