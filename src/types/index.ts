import type { LucideIcon } from "lucide-react";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export type SyncStatus = "pending" | "synced" | "failed";
export type OperationType = "create" | "update" | "delete";
export type ExpiryStatus = "expired" | "expiring_soon" | "valid";
export type StockAvailability = "in_stock" | "low_stock" | "out_of_stock";
export type ReconciliationStatus = "PENDING" | "PARTIALLY_RECONCILED" | "RECONCILED";

export interface MedicineFormData {
  id?: string; // أضف هذا السطر
  tradeName: string;
  genericName: string;
  manufacturer: string;
  barcode?: string; // أضف هذا السطر
  pharmacologicalClassIds: string[];
  categoryIds: string[];
  notes: string;
}

export interface MedicineWithRelations {
  id: string;
  tradeName: string;
  genericName: string;
  manufacturer: string;
  barcode?: string; // أضف هذا السطر
  notes: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  categories: CategoryItem[];
  pharmacologicalClasses: PharmacologicalClassItem[];
}

export interface CategoryItem {
  id: string;
  name: string;
}

export interface PharmacologicalClassItem {
  id: string;
  name: string;
}

export interface CategoryFormData {
  name: string;
  description: string;
}

export interface PharmacologicalClassFormData {
  name: string;
  description: string;
}

export interface BatchWithCarton {
  id: string;
  batchNumber: string;
  quantity: number;
  expiryDate: Date;
  cartonId: string | null;
  cartonCode: string | null;
  cartonLabel: string | null;
  sectionName: string | null;
  locationNote: string | null;
  isUnassigned: boolean;
  archivedAt: Date | null;
}

export interface InventoryItem {
  medicine: MedicineWithRelations;
  totalQuantity: number;
  batchCount: number;
  cartonCount: number;
  nearestExpiry: Date | null;
  expiryStatus: ExpiryStatus;
  batchNumbers: string[];
  cartonCodes: string[];
}

export interface MedicineListItem {
  medicine: MedicineWithRelations;
  totalQuantity: number;
  batchCount: number;
  cartonCount: number;
  nearestExpiry: Date | null;
  expiryStatus: ExpiryStatus;
  batchNumbers: string[];
  cartonCodes: string[];
}

export interface BatchFormData {
  batchNumber: string;
  quantity: string;
  expiryDate: string;
  cartonId: string;
}

export interface StockStats {
  totalMedicines: number;
  totalUnits: number;
  expiringSoon: number;
  expired: number;
}

export interface ExpiryAlertData {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  expiresIn: number;
}

export interface MedicineAlternativeItem {
  id: string;
  alternativeMedicineId: string;
  tradeName: string;
  genericName: string;
  totalQuantity: number;
  nearestExpiry: Date | null;
}

export type ConvoyStatus = "DRAFT" | "ACTIVE" | "COMPLETED";

export interface ConvoyFormData {
  name: string;
  date: string;
  location: string;
  responsiblePerson: string;
  notes: string;
}

export interface ConvoyListItem {
  id: string;
  name: string;
  date: string;
  location: string;
  responsiblePerson: string;
  status: ConvoyStatus;
  itemCount: number;
  totalTaken: number;
  totalDispensed: number;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ConvoyItem {
  id: string;
  convoyId: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  batchId: string | null;
  batchNumber: string;
  quantityTaken: number;
  quantityDispensed: number;
  quantityReturned: number;
  quantityMissingOrDamaged: number;
  reconciliationNote: string;
  returnedAt: Date | null;
  reconciledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConvoyDetail {
  id: string;
  name: string;
  date: string;
  location: string;
  responsiblePerson: string;
  notes: string;
  status: ConvoyStatus;
  reconciliationStatus: ReconciliationStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  items: ConvoyItem[];
}

export interface ActiveFilters {
  category: string;
  pharmacologicalClass: string;
  expiry: string;
  carton: string;
  availability: string;
  section: string;
  status: string;
}

/* ================================================================
   Phase 6: Stock Movements & Inventory Control
   ================================================================ */

export type MovementType =
  | "DONATION_IN"
  | "CONVOY_OUT"
  | "RETURN_TO_WAREHOUSE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "DISPENSE"
  | "DISPENSE_ADJUSTMENT";

export type MovementDirection = "IN" | "OUT" | "NEUTRAL";

export const ADJUSTMENT_REASONS = [
  "Physical Count Correction",
  "Damaged",
  "Lost",
  "Found",
  "Data Correction",
  "Other",
] as const;

export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

export interface AdjustmentFormData {
  medicineId: string;
  batchId: string;
  type: "IN" | "OUT";
  quantity: number;
  reason: AdjustmentReason | "";
  customReason: string;
  note: string;
}

export interface StockMovementListItem {
  id: string;
  date: Date;
  medicineName: string;
  genericName: string;
  batchNumber: string | null;
  type: MovementType;
  typeLabel: string;
  quantity: number;
  direction: MovementDirection;
  convoyName: string | null;
  convoyId: string | null;
  userName: string | null;
  reason: string | null;
}

export interface StockMovementDetail extends StockMovementListItem {
  note: string | null;
  deviceId: string;
  batchId: string | null;
  batchExpiry: Date | null;
  cartonCode: string | null;
  convoyItemId: string | null;
  receiptId: string | null;
  receiptNumber: string | null;
}

export interface InventoryBatchRow {
  medicineId: string;
  medicineName: string;
  genericName: string;
  batchId: string;
  batchNumber: string;
  cartonId: string | null;
  cartonCode: string | null;
  cartonLabel: string | null;
  sectionId: string | null;
  sectionName: string | null;
  currentQuantity: number;
  expiryDate: Date;
  expiryStatus: ExpiryStatus;
  stockStatus: StockAvailability;
  lastMovement: { type: string; date: Date } | null;
  categoryIds: string[];
  pharmacologicalClassIds: string[];
}

export interface MovementFilters {
  datePreset: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  medicineSearch: string;
  batchSearch: string;
  type: string;
  convoyId: string;
  section: string;
}

export const DEFAULT_MOVEMENT_FILTERS: MovementFilters = {
  datePreset: "all",
  dateFrom: null,
  dateTo: null,
  medicineSearch: "",
  batchSearch: "",
  type: "all",
  convoyId: "all",
  section: "all",
};

export interface DashboardStats {
  totalMedicines: number;
  totalUnits: number;
  expiringSoon: number;
  expired: number;
  lowStockCount: number;
  outOfStockCount: number;
  activeConvoyCount: number;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  detail: string;
  time: string;
  type: "inbound" | "outbound" | "neutral";
}

export interface LowStockMedicine {
  medicineId: string;
  medicineName: string;
  currentStock: number;
  minimumStock: number;
}

/* ================================================================
   Phase 8: Donations & Stock Receiving
   ================================================================ */

export type ReceiptSourceType = "DONATION" | "SUPPLY" | "OTHER";

export const RECEIPT_SOURCE_TYPES: Array<{ value: ReceiptSourceType; label: string }> = [
  { value: "DONATION", label: "Donation" },
  { value: "SUPPLY", label: "Supply" },
  { value: "OTHER", label: "Other" },
];

export interface ReceiptListItem {
  id: string;
  receiptNumber: string;
  date: string;
  sourceType: ReceiptSourceType;
  sourceName: string | null;
  responsiblePerson: string | null;
  itemCount: number;
  totalUnits: number;
  createdAt: Date;
}

export interface ReceiptDetail {
  id: string;
  receiptNumber: string;
  date: string;
  sourceType: ReceiptSourceType;
  sourceName: string | null;
  responsiblePerson: string | null;
  notes: string | null;
  createdAt: Date;
  items: ReceiptDetailItem[];
}

export interface ReceiptDetailItem {
  id: string;
  medicineName: string;
  genericName: string;
  batchNumber: string;
  batchId: string | null;
  expiryDate: Date;
  quantity: number;
  cartonCode: string | null;
  notes: string | null;
}

/* ================================================================
   Phase 9: Warehouse Organization & Carton Management
   ================================================================ */

export interface StorageSectionItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  organizationType: string;
  isActive: boolean;
  cartonCount: number;
  batchCount: number;
  totalUnits: number;
}

export interface CartonListItem {
  id: string;
  code: string;
  label: string;
  sectionId: string | null;
  sectionName: string | null;
  locationNote: string;
  batchCount: number;
  totalUnits: number;
  isActive: boolean;
}

export interface CartonDetail {
  id: string;
  code: string;
  label: string;
  sectionId: string | null;
  sectionName: string | null;
  locationNote: string;
  isActive: boolean;
  batchCount: number;
  totalUnits: number;
  expiringSoonCount: number;
  expiredCount: number;
  contents: CartonContentItem[];
}

export interface CartonContentItem {
  batchId: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  expiryStatus: ExpiryStatus;
}

export interface LocationHistoryEntry {
  id: string;
  fromCartonCode: string | null;
  toCartonCode: string | null;
  note?: string;
  createdAt: Date;
}

export interface WarehouseOverview {
  totalSections: number;
  totalCartons: number;
  occupiedCartons: number;
  emptyCartons: number;
  totalBatches: number;
  totalUnits: number;
  activeConvoys: number;
}

export interface SectionDetail {
  id: string;
  name: string;
  code: string;
  description: string | null;
  organizationType: string;
  isActive: boolean;
  cartonCount: number;
  batchCount: number;
  totalUnits: number;
  expiringSoonCount: number;
  expiredCount: number;
}

export interface SectionCartonItem {
  id: string;
  code: string;
  label: string;
  locationNote: string;
  isActive: boolean;
  batchCount: number;
  totalUnits: number;
  expiringSoonCount: number;
  expiredCount: number;
}

export interface UnassignedBatch {
  batchId: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
}

export interface CartonFormData {
  code: string;
  label: string;
  sectionId: string;
  locationNote: string;
}

export interface StorageSectionFormData {
  name: string;
  code: string;
  description: string;
  organizationType: string;
}

export interface CartonSearchResult {
  cartonId: string;
  cartonCode: string;
  cartonLabel: string;
  sectionName: string | null;
  matches: Array<{
    batchId: string;
    medicineName: string;
    genericName: string;
    batchNumber: string;
    expiryDate: Date;
    quantity: number;
  }>;
}

export interface BatchLocationInfo {
  sectionName: string | null;
  cartonCode: string | null;
  cartonLabel: string | null;
  locationNote: string | null;
  isUnassigned: boolean;
}

/* ================================================================
   Legacy Types (Backward Compatibility)
   ================================================================ */

/** @deprecated Use CartonListItem from Phase 9 */
export interface CartonItem {
  id: string;
  code: string;
  name: string;
  categoryId?: string;
  location: string;
}

/** @deprecated Use CartonDetail from Phase 9 */
export interface CartonWithContents {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  location: string;
  description: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contents: Array<{
    batchId: string;
    medicineId: string;
    medicineName: string;
    genericName: string;
    batchNumber: string;
    quantity: number;
    expiryDate: Date;
    archivedAt: Date | null;
  }>;
  totalUnits: number;
  batchCount: number;
}

/** Batch availability for receiving flow */
export interface BatchAvailability {
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  availableQuantity: number;
}