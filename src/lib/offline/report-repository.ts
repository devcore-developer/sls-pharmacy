// src/lib/offline/report-repository.ts

import { db } from "./db";
import { getInventoryBatchData } from "./inventory-repository";
import { getDateRange, isDateInRange } from "@/lib/date-utils";
import { getExpiryStatus, daysUntil, EXPIRY_SOON_DAYS, LOW_STOCK_THRESHOLD, getStockAvailability } from "./stock-utils";
import type { DatePreset } from "@/lib/date-utils";
import type { ExpiryStatus } from "@/types";
import type { InventoryBatchRow } from "@/types";

/* ------------------------------------------------------------------ */
/*  Filter Options                                                     */
/* ------------------------------------------------------------------ */

export interface ReportFilterOptions {
  medicines: Array<{ id: string; tradeName: string; genericName: string }>;
  categories: Array<{ id: string; name: string }>;
  pharmacologicalClasses: Array<{ id: string; name: string }>;
  cartons: Array<{ id: string; code: string; label: string }>;
  sections: Array<{ id: string; name: string }>;
  convoys: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
}

export async function getReportFilterOptions(): Promise<ReportFilterOptions> {
  const [medicines, categories, pharmacologicalClasses, cartons, sections, convoys, users] = await Promise.all([
    db.medicines.toArray(),
    db.categories.toArray(),
    db.pharmacologicalClasses.toArray(),
    db.cartons.toArray(),
    db.storageSections.toArray(),
    db.convoys.toArray(),
    db.users.toArray(),
  ]);

  const activeMeds = medicines.filter((m) => !m.archivedAt);
  const activeCartons = cartons.filter((c) => c.isActive !== false);
  const activeSections = sections.filter((s) => s.isActive !== false);
  const activeUsers = users.filter((u) => u.isActive);

  return {
    medicines: activeMeds
      .map((m) => ({ id: m.id!, tradeName: m.tradeName, genericName: m.genericName }))
      .sort((a, b) => a.tradeName.localeCompare(b.tradeName)),
    categories: categories.map((c) => ({ id: c.id!, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
    pharmacologicalClasses: pharmacologicalClasses.map((c) => ({ id: c.id!, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
    cartons: activeCartons.map((c) => ({ id: c.id!, code: c.code, label: c.label })).sort((a, b) => a.code.localeCompare(b.code)),
    sections: activeSections.map((s) => ({ id: s.id!, name: s.name })).sort((a, b) => a.name.localeCompare(b.name)),
    convoys: convoys.map((c) => ({ id: c.id!, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
    users: activeUsers.map((u) => ({ id: u.id!, name: u.name })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
/* ------------------------------------------------------------------ */
/*  Inventory Report                                                   */
/* ------------------------------------------------------------------ */

export interface InventoryReportRow extends InventoryBatchRow {
  categoryNames: string[];
  classNames: string[];
}

export interface InventoryReportFilters {
  search: string;
  categoryId: string;
  pharmacologicalClassId: string;
  batchSearch: string;
  sectionId: string;
  cartonId: string;
  stockStatus: string;
  expiryStatus: string;
}

export function getDefaultInventoryFilters(): InventoryReportFilters {
  return {
    search: "",
    categoryId: "all",
    pharmacologicalClassId: "all",
    batchSearch: "",
    sectionId: "all",
    cartonId: "all",
    stockStatus: "all",
    expiryStatus: "all",
  };
}

export async function getInventoryReportData(filters: InventoryReportFilters): Promise<InventoryReportRow[]> {
  const { rows, categories, pharmacologicalClasses } = await getInventoryBatchData();
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const classMap = new Map(pharmacologicalClasses.map((c) => [c.id, c.name]));

  let filtered: InventoryReportRow[] = rows.map((r) => ({
    ...r,
    categoryNames: r.categoryIds.map((id) => catMap.get(id)).filter(Boolean) as string[],
    classNames: r.pharmacologicalClassIds.map((id) => classMap.get(id)).filter(Boolean) as string[],
  }));

  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.medicineName.toLowerCase().includes(q) ||
        r.genericName.toLowerCase().includes(q)
    );
  }
  if (filters.categoryId !== "all") {
    filtered = filtered.filter((r) => r.categoryIds.includes(filters.categoryId));
  }
  if (filters.pharmacologicalClassId !== "all") {
    filtered = filtered.filter((r) => r.pharmacologicalClassIds.includes(filters.pharmacologicalClassId));
  }
  if (filters.batchSearch) {
    const q = filters.batchSearch.toLowerCase();
    filtered = filtered.filter((r) => r.batchNumber.toLowerCase().includes(q));
  }
  if (filters.sectionId !== "all") {
    filtered = filtered.filter((r) => r.sectionId === filters.sectionId);
  }
  if (filters.cartonId !== "all") {
    filtered = filtered.filter((r) => r.cartonId === filters.cartonId);
  }
  if (filters.stockStatus !== "all") {
    filtered = filtered.filter((r) => r.stockStatus === filters.stockStatus);
  }
  if (filters.expiryStatus !== "all") {
    filtered = filtered.filter((r) => r.expiryStatus === filters.expiryStatus);
  }

  return filtered;
}

export function getInventorySummary(rows: InventoryReportRow[]) {
  const medSet = new Set(rows.map((r) => r.medicineId));
  return {
    totalMedicines: medSet.size,
    totalBatches: rows.length,
    totalUnits: rows.reduce((s, r) => s + r.currentQuantity, 0),
    lowStock: rows.filter((r) => r.stockStatus === "low_stock").length,
    outOfStock: rows.filter((r) => r.stockStatus === "out_of_stock").length,
    expiringSoon: rows.filter((r) => r.expiryStatus === "expiring_soon").length,
    expired: rows.filter((r) => r.expiryStatus === "expired").length,
  };
}

/* ------------------------------------------------------------------ */
/*  Expiry Report                                                      */
/* ------------------------------------------------------------------ */

export interface ExpiryReportRow {
  medicineId: string;
  medicineName: string;
  genericName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  daysRemaining: number;
  currentQuantity: number;
  cartonCode: string | null;
  sectionName: string | null;
  status: "expired" | "expiring_soon" | "valid";
}

export type ExpiryFilterPreset = "expired" | "within_7" | "within_30" | "within_60" | "within_90" | "all" | "custom";

export interface ExpiryReportFilters {
  search: string;
  preset: ExpiryFilterPreset;
  customDays: number;
  sectionId: string;
  cartonId: string;
}

export function getDefaultExpiryFilters(): ExpiryReportFilters {
  return { search: "", preset: "all", customDays: 90, sectionId: "all", cartonId: "all" };
}

export async function getExpiryReportData(filters: ExpiryReportFilters): Promise<ExpiryReportRow[]> {
  const { rows } = await getInventoryBatchData();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let results: ExpiryReportRow[] = rows.map((r) => {
    const expDate = new Date(r.expiryDate);
    expDate.setHours(0, 0, 0, 0);
    const days = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const status = days <= 0 ? "expired" as const : days <= EXPIRY_SOON_DAYS ? "expiring_soon" as const : "valid" as const;
    return {
      medicineId: r.medicineId,
      medicineName: r.medicineName,
      genericName: r.genericName,
      batchId: r.batchId,
      batchNumber: r.batchNumber,
      expiryDate: r.expiryDate,
      daysRemaining: days,
      currentQuantity: r.currentQuantity,
      cartonCode: r.cartonCode,
      sectionName: r.sectionName,
      status,
    };
  });

  // Apply preset filter
  switch (filters.preset) {
    case "expired":
      results = results.filter((r) => r.status === "expired");
      break;
    case "within_7":
      results = results.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 7);
      break;
    case "within_30":
      results = results.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 30);
      break;
    case "within_60":
      results = results.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 60);
      break;
    case "within_90":
      results = results.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 90);
      break;
    case "custom":
      results = results.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= filters.customDays);
      break;
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (r) => r.medicineName.toLowerCase().includes(q) || r.genericName.toLowerCase().includes(q) || r.batchNumber.toLowerCase().includes(q)
    );
  }
  if (filters.sectionId !== "all") {
    results = results.filter((r) => r.sectionName === filters.sectionId);
  }
  if (filters.cartonId !== "all") {
    results = results.filter((r) => r.cartonCode === filters.cartonId);
  }

  // Sort: expired first, then by days remaining ascending
  results.sort((a, b) => {
    if (a.status === "expired" && b.status !== "expired") return -1;
    if (a.status !== "expired" && b.status === "expired") return 1;
    return a.daysRemaining - b.daysRemaining;
  });

  return results;
}

export function getExpirySummary(rows: ExpiryReportRow[]) {
  return {
    expired: rows.filter((r) => r.status === "expired").length,
    within7: rows.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 7).length,
    within30: rows.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 30).length,
    within60: rows.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 60).length,
    within90: rows.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 90).length,
    totalUnits: rows.reduce((s, r) => s + r.currentQuantity, 0),
  };
}

/* ------------------------------------------------------------------ */
/*  Movement Report                                                    */
/* ------------------------------------------------------------------ */

export interface MovementReportRow {
  id: string;
  date: Date;
  medicineName: string;
  genericName: string;
  batchNumber: string | null;
  movementType: string;
  typeLabel: string;
  quantity: number;
  direction: string;
  convoyName: string | null;
  convoyId: string | null;
  receiptNumber: string | null;
  receiptId: string | null;
  userName: string | null;
  reason: string | null;
}

export interface MovementReportFilters {
  datePreset: DatePreset;
  dateFrom: Date | null;
  dateTo: Date | null;
  search: string;
  batchSearch: string;
  type: string;
  convoyId: string;
  userId: string;
}

export function getDefaultMovementFilters(): MovementReportFilters {
  return {
    datePreset: "all",
    dateFrom: null,
    dateTo: null,
    search: "",
    batchSearch: "",
    type: "all",
    convoyId: "all",
    userId: "all",
  };
}

export async function getMovementReportData(filters: MovementReportFilters): Promise<MovementReportRow[]> {
  const { from, to } = getDateRange(filters.datePreset, filters.dateFrom ?? undefined, filters.dateTo ?? undefined);

  let movements = await db.stockMovements.orderBy("createdAt").reverse().toArray();

  if (from || to) {
    movements = movements.filter((m) => isDateInRange(m.createdAt, from, to));
  }
  if (filters.type !== "all") {
    movements = movements.filter((m) => m.type === filters.type);
  }
  if (filters.convoyId !== "all") {
    movements = movements.filter((m) => m.convoyId === filters.convoyId);
  }
  if (filters.userId !== "all") {
    movements = movements.filter((m) => m.userId === filters.userId);
  }

  if (movements.length === 0) return [];

  const medIds = [...new Set(movements.map((m) => m.medicineId))];
  const batchIds = [...new Set(movements.filter((m) => m.batchId).map((m) => m.batchId!))];
  const convoyIds = [...new Set(movements.filter((m) => m.convoyId).map((m) => m.convoyId!))];
  const receiptIds = [...new Set(movements.filter((m) => m.receiptId).map((m) => m.receiptId!))];
  const userIds = [...new Set(movements.filter((m) => m.userId).map((m) => m.userId!))];

  const [meds, batches, convoys, receipts, users] = await Promise.all([
    medIds.length > 0 ? db.medicines.where("id").anyOf(medIds).toArray() : [],
    batchIds.length > 0 ? db.batches.where("id").anyOf(batchIds).toArray() : [],
    convoyIds.length > 0 ? db.convoys.where("id").anyOf(convoyIds).toArray() : [],
    receiptIds.length > 0 ? db.stockReceipts.where("id").anyOf(receiptIds).toArray() : [],
    userIds.length > 0 ? db.users.where("id").anyOf(userIds).toArray() : [],
  ]);

  const medMap = new Map(meds.map((m) => [m.id!, m]));
  const batchMap = new Map(batches.map((b) => [b.id!, b]));
  const convoyMap = new Map(convoys.map((c) => [c.id!, c]));
  const receiptMap = new Map(receipts.map((r) => [r.id!, r]));
  const userMap = new Map(users.map((u) => [u.id!, u]));

  let results: MovementReportRow[] = movements.map((m) => {
    const med = medMap.get(m.medicineId);
    const batch = m.batchId ? batchMap.get(m.batchId) : null;
    const convoy = m.convoyId ? convoyMap.get(m.convoyId) : null;
    const receipt = m.receiptId ? receiptMap.get(m.receiptId) : null;
    const user = m.userId ? userMap.get(m.userId) : null;
    const direction = getMovementDirection(m.type);

    return {
      id: m.id!,
      date: m.createdAt,
      medicineName: med?.tradeName || "Unknown",
      genericName: med?.genericName || "",
      batchNumber: batch?.batchNumber || null,
      movementType: m.type,
      typeLabel: getMovementTypeLabel(m.type),
      quantity: m.quantity,
      direction,
      convoyName: convoy?.name || null,
      convoyId: m.convoyId ?? null,
      receiptNumber: receipt?.receiptNumber || null,
      receiptId: m.receiptId ?? null,
      userName: user?.name || null,
      reason: m.reason || null,
    };
  });

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (r) => r.medicineName.toLowerCase().includes(q) || r.genericName.toLowerCase().includes(q)
    );
  }
  if (filters.batchSearch) {
    const q = filters.batchSearch.toLowerCase();
    results = results.filter((r) => r.batchNumber?.toLowerCase().includes(q));
  }

  return results;
}

function getMovementDirection(type: string): string {
  const outTypes = ["CONVOY_OUT", "ADJUSTMENT_OUT", "DISPENSE", "DISPENSE_ADJUSTMENT"];
  const inTypes = ["DONATION_IN", "RETURN_TO_WAREHOUSE", "ADJUSTMENT_IN"];
  if (outTypes.includes(type)) return "OUT";
  if (inTypes.includes(type)) return "IN";
  return "NEUTRAL";
}

function getMovementTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    DONATION_IN: "Donation In",
    CONVOY_OUT: "Convoy Out",
    RETURN_TO_WAREHOUSE: "Return to Warehouse",
    ADJUSTMENT_IN: "Adjustment In",
    ADJUSTMENT_OUT: "Adjustment Out",
    DISPENSE: "Dispensed",
    DISPENSE_ADJUSTMENT: "Dispense Adjustment",
  };
  return labels[type] || type;
}

export function getMovementSummary(rows: MovementReportRow[]) {
  return {
    totalMovements: rows.length,
    totalIn: rows.filter((r) => r.direction === "IN").reduce((s, r) => s + r.quantity, 0),
    totalOut: rows.filter((r) => r.direction === "OUT").reduce((s, r) => s + r.quantity, 0),
    uniqueMedicines: new Set(rows.map((r) => r.medicineName)).size,
  };
}

/* ------------------------------------------------------------------ */
/*  Convoy Report                                                      */
/* ------------------------------------------------------------------ */

export interface ConvoyReportRow {
  id: string;
  name: string;
  date: string;
  location: string;
  status: string;
  medicineCount: number;
  unitsTaken: number;
  unitsDispensed: number;
  unitsReturned: number;
  remaining: number;
  reconciliationStatus: string;
}

export interface ConvoyReportFilters {
  datePreset: DatePreset;
  dateFrom: Date | null;
  dateTo: Date | null;
  status: string;
  location: string;
}

export function getDefaultConvoyFilters(): ConvoyReportFilters {
  return { datePreset: "all", dateFrom: null, dateTo: null, status: "all", location: "" };
}

export async function getConvoyReportData(filters: ConvoyReportFilters): Promise<ConvoyReportRow[]> {
  let convoys = await db.convoys.orderBy("createdAt").reverse().toArray();
  const allItems = await db.convoyItems.toArray();

  const { from, to } = getDateRange(filters.datePreset, filters.dateFrom ?? undefined, filters.dateTo ?? undefined);

  if (from || to) {
    convoys = convoys.filter((c) => isDateInRange(new Date(c.date), from, to));
  }
  if (filters.status !== "all") {
    convoys = convoys.filter((c) => c.status === filters.status);
  }
  if (filters.location) {
    const q = filters.location.toLowerCase();
    convoys = convoys.filter((c) => c.location.toLowerCase().includes(q));
  }

  const itemsByConvoy = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const list = itemsByConvoy.get(item.convoyId) || [];
    list.push(item);
    itemsByConvoy.set(item.convoyId, list);
  }

  return convoys.map((c) => {
    const items = itemsByConvoy.get(c.id!) || [];
    const taken = items.reduce((s, i) => s + i.quantityTaken, 0);
    const dispensed = items.reduce((s, i) => s + i.quantityDispensed, 0);
    const returned = items.reduce((s, i) => s + i.quantityReturned, 0);
    const reconciledCount = items.filter((i) => i.reconciledAt).length;
    let recStatus = "PENDING";
    if (reconciledCount === items.length && items.length > 0) recStatus = "RECONCILED";
    else if (reconciledCount > 0) recStatus = "PARTIALLY_RECONCILED";

    return {
      id: c.id!,
      name: c.name,
      date: c.date,
      location: c.location,
      status: c.status,
      medicineCount: items.length,
      unitsTaken: taken,
      unitsDispensed: dispensed,
      unitsReturned: returned,
      remaining: taken - dispensed - returned,
      reconciliationStatus: recStatus,
    };
  });
}

export function getConvoySummary(rows: ConvoyReportRow[]) {
  return {
    totalConvoys: rows.length,
    active: rows.filter((r) => r.status === "ACTIVE").length,
    completed: rows.filter((r) => r.status === "COMPLETED").length,
    draft: rows.filter((r) => r.status === "DRAFT").length,
    totalTaken: rows.reduce((s, r) => s + r.unitsTaken, 0),
    totalDispensed: rows.reduce((s, r) => s + r.unitsDispensed, 0),
    totalReturned: rows.reduce((s, r) => s + r.unitsReturned, 0),
  };
}

/* ------------------------------------------------------------------ */
/*  Receiving Report                                                   */
/* ------------------------------------------------------------------ */

export interface ReceivingReportRow {
  id: string;
  receiptNumber: string;
  date: string;
  sourceType: string;
  sourceName: string | null;
  responsiblePerson: string | null;
  medicineCount: number;
  batchCount: number;
  totalUnits: number;
}

export interface ReceivingReportFilters {
  datePreset: DatePreset;
  dateFrom: Date | null;
  dateTo: Date | null;
  sourceType: string;
  search: string;
}

export function getDefaultReceivingFilters(): ReceivingReportFilters {
  return { datePreset: "all", dateFrom: null, dateTo: null, sourceType: "all", search: "" };
}

export async function getReceivingReportData(filters: ReceivingReportFilters): Promise<ReceivingReportRow[]> {
  let receipts = await db.stockReceipts.orderBy("createdAt").reverse().toArray();
  const allItems = await db.stockReceiptItems.toArray();

  const { from, to } = getDateRange(filters.datePreset, filters.dateFrom ?? undefined, filters.dateTo ?? undefined);

  if (from || to) {
    receipts = receipts.filter((r) => isDateInRange(new Date(r.date), from, to));
  }
  if (filters.sourceType !== "all") {
    receipts = receipts.filter((r) => r.sourceType === filters.sourceType);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    receipts = receipts.filter(
      (r) =>
        r.receiptNumber.toLowerCase().includes(q) ||
        (r.sourceName && r.sourceName.toLowerCase().includes(q)) ||
        (r.responsiblePerson && r.responsiblePerson.toLowerCase().includes(q))
    );
  }

  const itemsByReceipt = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const list = itemsByReceipt.get(item.receiptId) || [];
    list.push(item);
    itemsByReceipt.set(item.receiptId, list);
  }

  return receipts.map((r) => {
    const items = itemsByReceipt.get(r.id!) || [];
    const batchIds = new Set(items.filter((i) => i.batchId).map((i) => i.batchId!));
    return {
      id: r.id!,
      receiptNumber: r.receiptNumber,
      date: r.date,
      sourceType: r.sourceType,
      sourceName: r.sourceName ?? null,
      responsiblePerson: r.responsiblePerson ?? null,
      medicineCount: new Set(items.map((i) => i.medicineId)).size,
      batchCount: batchIds.size,
      totalUnits: items.reduce((s, i) => s + i.quantity, 0),
    };
  });
}

export function getReceivingSummary(rows: ReceivingReportRow[]) {
  const now = new Date();
  const thisMonth = rows.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  return {
    totalReceipts: rows.length,
    totalUnits: rows.reduce((s, r) => s + r.totalUnits, 0),
    totalBatches: rows.reduce((s, r) => s + r.batchCount, 0),
    thisMonth: thisMonth.length,
  };
}

/* ------------------------------------------------------------------ */
/*  Dispensing Report                                                  */
/* ------------------------------------------------------------------ */

export interface DispensingReportRow {
  id: string;
  date: Date;
  convoyName: string | null;
  convoyId: string | null;
  medicineName: string;
  genericName: string;
  batchNumber: string | null;
  quantity: number;
}

export interface DispensingReportFilters {
  datePreset: DatePreset;
  dateFrom: Date | null;
  dateTo: Date | null;
  convoyId: string;
  search: string;
}

export function getDefaultDispensingFilters(): DispensingReportFilters {
  return { datePreset: "all", dateFrom: null, dateTo: null, convoyId: "all", search: "" };
}

export async function getDispensingReportData(filters: DispensingReportFilters): Promise<DispensingReportRow[]> {
  let movements = await db.stockMovements
    .where("type")
    .anyOf(["DISPENSE", "DISPENSE_ADJUSTMENT"])
    .toArray();

  const { from, to } = getDateRange(filters.datePreset, filters.dateFrom ?? undefined, filters.dateTo ?? undefined);

  if (from || to) {
    movements = movements.filter((m) => isDateInRange(m.createdAt, from, to));
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

  let results: DispensingReportRow[] = movements
    .map((m) => ({
      id: m.id!,
      date: m.createdAt,
      convoyName: m.convoyId ? convoyMap.get(m.convoyId)?.name ?? null : null,
      convoyId: m.convoyId ?? null,
      medicineName: medMap.get(m.medicineId)?.tradeName || "Unknown",
      genericName: medMap.get(m.medicineId)?.genericName || "",
      batchNumber: m.batchId ? batchMap.get(m.batchId)?.batchNumber ?? null : null,
      quantity: m.quantity,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (r) => r.medicineName.toLowerCase().includes(q) || r.genericName.toLowerCase().includes(q)
    );
  }

  return results;
}

export function getDispensingSummary(rows: DispensingReportRow[]) {
  return {
    totalDispensed: rows.reduce((s, r) => s + r.quantity, 0),
    medicineCount: new Set(rows.map((r) => r.medicineName)).size,
    convoyCount: new Set(rows.filter((r) => r.convoyId).map((r) => r.convoyId)).size,
  };
}

/* ------------------------------------------------------------------ */
/*  Returns Report                                                     */
/* ------------------------------------------------------------------ */

export interface ReturnReportRow {
  id: string;
  date: Date;
  convoyName: string | null;
  convoyId: string | null;
  medicineName: string;
  genericName: string;
  batchNumber: string | null;
  quantity: number;
  destinationCarton: string | null;
  userName: string | null;
}

export interface ReturnReportFilters {
  datePreset: DatePreset;
  dateFrom: Date | null;
  dateTo: Date | null;
  convoyId: string;
  search: string;
}

export function getDefaultReturnFilters(): ReturnReportFilters {
  return { datePreset: "all", dateFrom: null, dateTo: null, convoyId: "all", search: "" };
}

export async function getReturnReportData(filters: ReturnReportFilters): Promise<ReturnReportRow[]> {
  let movements = await db.stockMovements
    .where("type")
    .equals("RETURN_TO_WAREHOUSE")
    .toArray();

  const { from, to } = getDateRange(filters.datePreset, filters.dateFrom ?? undefined, filters.dateTo ?? undefined);

  if (from || to) {
    movements = movements.filter((m) => isDateInRange(m.createdAt, from, to));
  }
  if (filters.convoyId !== "all") {
    movements = movements.filter((m) => m.convoyId === filters.convoyId);
  }

  if (movements.length === 0) return [];

  const medIds = [...new Set(movements.map((m) => m.medicineId))];
  const batchIds = [...new Set(movements.filter((m) => m.batchId).map((m) => m.batchId!))];
  const convoyIds = [...new Set(movements.filter((m) => m.convoyId).map((m) => m.convoyId!))];
  const userIds = [...new Set(movements.filter((m) => m.userId).map((m) => m.userId!))];

  const [meds, batches, convoys, users] = await Promise.all([
    medIds.length > 0 ? db.medicines.where("id").anyOf(medIds).toArray() : [],
    batchIds.length > 0 ? db.batches.where("id").anyOf(batchIds).toArray() : [],
    convoyIds.length > 0 ? db.convoys.where("id").anyOf(convoyIds).toArray() : [],
    userIds.length > 0 ? db.users.where("id").anyOf(userIds).toArray() : [],
  ]);

  const medMap = new Map(meds.map((m) => [m.id!, m]));
  const batchMap = new Map(batches.map((b) => [b.id!, b]));
  const convoyMap = new Map(convoys.map((c) => [c.id!, c]));
  const userMap = new Map(users.map((u) => [u.id!, u]));

  // Get destination carton from batch after return
  const batchCartonIds = [...new Set(batches.filter((b) => b.cartonId).map((b) => b.cartonId!))];
  const cartonRecords = batchCartonIds.length > 0 ? await db.cartons.where("id").anyOf(batchCartonIds).toArray() : [];
  const cartonMap = new Map(cartonRecords.map((c) => [c.id!, c.code]));

  let results: ReturnReportRow[] = movements
    .map((m) => {
      const batch = m.batchId ? batchMap.get(m.batchId) : null;
      return {
        id: m.id!,
        date: m.createdAt,
        convoyName: m.convoyId ? convoyMap.get(m.convoyId)?.name ?? null : null,
        convoyId: m.convoyId ?? null,
        medicineName: medMap.get(m.medicineId)?.tradeName || "Unknown",
        genericName: medMap.get(m.medicineId)?.genericName || "",
        batchNumber: batch?.batchNumber ?? null,
        quantity: m.quantity,
        destinationCarton: batch?.cartonId ? cartonMap.get(batch.cartonId) ?? null : null,
        userName: m.userId ? userMap.get(m.userId)?.name ?? null : null,
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (r) => r.medicineName.toLowerCase().includes(q) || r.genericName.toLowerCase().includes(q)
    );
  }

  return results;
}

export function getReturnSummary(rows: ReturnReportRow[]) {
  return {
    totalReturned: rows.reduce((s, r) => s + r.quantity, 0),
    returnCount: rows.length,
    convoyCount: new Set(rows.filter((r) => r.convoyId).map((r) => r.convoyId)).size,
  };
}

/* ------------------------------------------------------------------ */
/*  Medicine Activity Report                                           */
/* ------------------------------------------------------------------ */

export interface MedicineActivityData {
  medicineId: string;
  medicineName: string;
  genericName: string;
  currentStock: number;
  batchCount: number;
  batches: Array<{
    batchId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: Date;
    cartonCode: string | null;
    sectionName: string | null;
    expiryStatus: ExpiryStatus;
  }>;
  receipts: Array<{
    id: string;
    date: Date;
    receiptNumber: string;
    quantity: number;
    batchNumber: string | null;
  }>;
  convoyTransfers: Array<{
    id: string;
    date: Date;
    convoyName: string;
    convoyId: string;
    quantity: number;
    batchNumber: string | null;
  }>;
  dispensing: Array<{
    id: string;
    date: Date;
    convoyName: string | null;
    quantity: number;
    batchNumber: string | null;
  }>;
  returns: Array<{
    id: string;
    date: Date;
    convoyName: string | null;
    quantity: number;
    batchNumber: string | null;
  }>;
  adjustments: Array<{
    id: string;
    date: Date;
    type: string;
    quantity: number;
    reason: string | null;
    batchNumber: string | null;
  }>;
  timeline: Array<{
    id: string;
    date: Date;
    type: string;
    typeLabel: string;
    direction: string;
    quantity: number;
    details: string;
    batchNumber: string | null;
    convoyId: string | null;
    receiptId: string | null;
  }>;
}

export async function getMedicineActivityData(medicineId: string): Promise<MedicineActivityData | null> {
  const med = await db.medicines.get(medicineId);
  if (!med) return null;

  const [batches, movements] = await Promise.all([
    db.batches.where("medicineId").equals(medicineId).toArray(),
    db.stockMovements.where("medicineId").equals(medicineId).toArray(),
  ]);

  const activeBatches = batches.filter((b) => !b.archivedAt);
  const cartonIds = [...new Set(activeBatches.filter((b) => b.cartonId).map((b) => b.cartonId!))];

  const cartonRecords = cartonIds.length > 0 ? await db.cartons.where("id").anyOf(cartonIds).toArray() : [];
  const cartonMap = new Map(cartonRecords.map((c) => [c.id!, c]));
  const allSectionIds = [...new Set(cartonRecords.filter((c) => c.sectionId).map((c) => c.sectionId!))];
  const sections = allSectionIds.length > 0 ? await db.storageSections.where("id").anyOf(allSectionIds).toArray() : [];
  const sectionMap = new Map(sections.map((s) => [s.id!, s.name]));

  const batchMap = new Map(batches.map((b) => [b.id!, b]));

  // Get convoy and receipt info
  const convoyIds = [...new Set(movements.filter((m) => m.convoyId).map((m) => m.convoyId!))];
  const receiptIds = [...new Set(movements.filter((m) => m.receiptId).map((m) => m.receiptId!))];
  const [convoys, receipts] = await Promise.all([
    convoyIds.length > 0 ? db.convoys.where("id").anyOf(convoyIds).toArray() : [],
    receiptIds.length > 0 ? db.stockReceipts.where("id").anyOf(receiptIds).toArray() : [],
  ]);
  const convoyMap = new Map(convoys.map((c) => [c.id!, c]));
  const receiptMap = new Map(receipts.map((r) => [r.id!, r]));

  const currentStock = activeBatches.reduce((s, b) => s + b.quantity, 0);

  const batchDetails = activeBatches.map((b) => ({
    batchId: b.id!,
    batchNumber: b.batchNumber,
    quantity: b.quantity,
    expiryDate: b.expiryDate,
    cartonCode: b.cartonId ? cartonMap.get(b.cartonId)?.code ?? null : null,
    sectionName: b.cartonId ? (cartonMap.get(b.cartonId)?.sectionId ? sectionMap.get(cartonMap.get(b.cartonId)!.sectionId!) ?? null : null) : null,
    expiryStatus: getExpiryStatus(b.expiryDate),
  }));

  const sortedMovements = [...movements].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const receiptMovements = sortedMovements.filter((m) => m.type === "DONATION_IN");
  const convoyOutMovements = sortedMovements.filter((m) => m.type === "CONVOY_OUT");
  const dispenseMovements = sortedMovements.filter((m) => m.type === "DISPENSE" || m.type === "DISPENSE_ADJUSTMENT");
  const returnMovements = sortedMovements.filter((m) => m.type === "RETURN_TO_WAREHOUSE");
  const adjustMovements = sortedMovements.filter((m) => m.type.startsWith("ADJUSTMENT"));

  const timeline = sortedMovements.map((m) => {
    const batch = m.batchId ? batchMap.get(m.batchId) : null;
    const convoy = m.convoyId ? convoyMap.get(m.convoyId) : null;
    const receipt = m.receiptId ? receiptMap.get(m.receiptId) : null;
    const dir = getMovementDirection(m.type);

    let details = "";
    if (m.type === "DONATION_IN" && receipt) details = `Receipt ${receipt.receiptNumber}`;
    else if (m.type === "CONVOY_OUT" && convoy) details = `Convoy: ${convoy.name}`;
    else if (m.type === "DISPENSE" && convoy) details = `Convoy: ${convoy.name}`;
    else if (m.type === "RETURN_TO_WAREHOUSE" && convoy) details = `From: ${convoy.name}`;
    else if (m.type.startsWith("ADJUSTMENT")) details = m.reason || "Adjustment";

    return {
      id: m.id!,
      date: m.createdAt,
      type: m.type,
      typeLabel: getMovementTypeLabel(m.type),
      direction: dir,
      quantity: m.quantity,
      details,
      batchNumber: m.batchId ? batchMap.get(m.batchId)?.batchNumber ?? null : null,
      convoyId: m.convoyId ?? null,
      receiptId: m.receiptId ?? null,
    };
  });

  return {
    medicineId,
    medicineName: med.tradeName,
    genericName: med.genericName,
    currentStock,
    batchCount: activeBatches.length,
    batches: batchDetails,
    receipts: receiptMovements.map((m) => ({
      id: m.id!,
      date: m.createdAt,
      receiptNumber: m.receiptId ? receiptMap.get(m.receiptId)?.receiptNumber ?? "" : "",
      quantity: m.quantity,
      batchNumber: m.batchId ? batchMap.get(m.batchId)?.batchNumber ?? null : null,
    })),
    convoyTransfers: convoyOutMovements.map((m) => ({
      id: m.id!,
      date: m.createdAt,
      convoyName: m.convoyId ? convoyMap.get(m.convoyId)?.name ?? "" : "",
      convoyId: m.convoyId!,
      quantity: m.quantity,
      batchNumber: m.batchId ? batchMap.get(m.batchId)?.batchNumber ?? null : null,
    })),
    dispensing: dispenseMovements.map((m) => ({
      id: m.id!,
      date: m.createdAt,
      convoyName: m.convoyId ? convoyMap.get(m.convoyId)?.name ?? null : null,
      quantity: m.quantity,
      batchNumber: m.batchId ? batchMap.get(m.batchId)?.batchNumber ?? null : null,
    })),
    returns: returnMovements.map((m) => ({
      id: m.id!,
      date: m.createdAt,
      convoyName: m.convoyId ? convoyMap.get(m.convoyId)?.name ?? null : null,
      quantity: m.quantity,
      batchNumber: m.batchId ? batchMap.get(m.batchId)?.batchNumber ?? null : null,
    })),
    adjustments: adjustMovements.map((m) => ({
      id: m.id!,
      date: m.createdAt,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason ?? null,
      batchNumber: m.batchId ? batchMap.get(m.batchId)?.batchNumber ?? null : null,
    })),
    timeline,
  };
}