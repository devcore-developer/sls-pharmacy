import Dexie, { type Table } from "dexie";

/* ------------------------------------------------------------------ */
/*  Record Types                                                       */
/* ------------------------------------------------------------------ */

export interface MedicineRecord {
  id?: string;
  tradeName: string;
  genericName: string;
  manufacturer?: string;
  notes?: string;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryRecord {
  id?: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PharmacologicalClassRecord {
  id?: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicineCategoryRecord {
  medicineId: string;
  categoryId: string;
}

export interface MedicinePharmacologicalClassRecord {
  medicineId: string;
  pharmacologicalClassId: string;
}

export interface MedicineAlternativeRecord {
  id?: string;
  medicineId: string;
  alternativeMedicineId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchRecord {
  id?: string;
  medicineId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: Date;
  cartonId?: string;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartonRecord {
  id?: string;
  code: string;
  label: string;
  sectionId?: string;
  locationNote?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StorageSectionRecord {
  id?: string;
  name: string;
  code: string;
  description?: string;
  organizationType: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchLocationTransferRecord {
  id?: string;
  batchId: string;
  fromCartonId?: string;
  toCartonId?: string;
  note?: string;
  createdAt: Date;
  deviceId: string;
  userId?: string;
}

export interface ConvoyRecord {
  id?: string;
  name: string;
  date: string;
  location: string;
  responsiblePerson: string;
  notes: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ConvoyItemRecord {
  id?: string;
  convoyId: string;
  medicineId: string;
  batchId?: string;
  quantityTaken: number;
  quantityDispensed: number;
  quantityReturned: number;
  quantityMissingOrDamaged: number;
  reconciliationNote: string;
  returnedAt?: Date;
  reconciledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovementRecord {
  id?: string;
  medicineId: string;
  batchId?: string;
  convoyId?: string;
  convoyItemId?: string;
  receiptId?: string;
  receiptItemId?: string;
  type: string;
  quantity: number;
  reason?: string;
  notes?: string;
  createdAt: Date;
  deviceId?: string;
  userId?: string;
}

export interface CartonRecordOld {
  id?: string;
  medicineId: string;
  batchId?: string;
  cartonNumber: string;
  unitsPerCarton: number;
  remainingUnits: number;
  location?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncOperationRecord {
  id?: string;
  operationId: string;
  deviceId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  operationType: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  createdAt: Date;
  syncStatus: "pending" | "synced" | "failed";
  syncedAt?: Date;
  error?: string;
  retryCount: number;
}

export interface StockReceiptRecord {
  id?: string;
  receiptNumber: string;
  date: string;
  sourceType: string;
  sourceName?: string;
  responsiblePerson?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockReceiptItemRecord {
  id?: string;
  receiptId: string;
  medicineId: string;
  batchId?: string;
  quantity: number;
  cartonId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRecord {
  id?: string;
  username: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  passwordAlgorithm: string;
  passwordIterations: number;
  roleId: string;
  isActive: boolean;
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleRecord {
  id?: string;
  name: string;
  label: string;
  description: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionRecord {
  id?: string;
  key: string;
  group: string;
  label: string;
  description: string;
}

export interface RolePermissionRecord {
  id?: string;
  roleId: string;
  permissionKey: string;
}

export interface SessionRecord {
  id?: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuditLogRecord {
  id?: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  deviceId: string;
  createdAt: Date;
}

/* ------------------------------------------------------------------ */
/*  Database Class                                                     */
/* ------------------------------------------------------------------ */

class SLSPharmacyDB extends Dexie {
  medicines!: Table<MedicineRecord>;
  categories!: Table<CategoryRecord>;
  pharmacologicalClasses!: Table<PharmacologicalClassRecord>;
  medicineCategories!: Table<MedicineCategoryRecord>;
  medicinePharmacologicalClasses!: Table<MedicinePharmacologicalClassRecord>;
  medicineAlternatives!: Table<MedicineAlternativeRecord>;
  batches!: Table<BatchRecord>;
  cartons!: Table<CartonRecord>;
  storageSections!: Table<StorageSectionRecord>;
  batchLocationTransfers!: Table<BatchLocationTransferRecord>;
  convoys!: Table<ConvoyRecord>;
  convoyItems!: Table<ConvoyItemRecord>;
  stockMovements!: Table<StockMovementRecord>;
  cartonsOld!: Table<CartonRecordOld>;
  syncOperations!: Table<SyncOperationRecord>;
  stockReceipts!: Table<StockReceiptRecord>;
  stockReceiptItems!: Table<StockReceiptItemRecord>;
  users!: Table<UserRecord, string>;
  roles!: Table<RoleRecord, string>;
  permissions!: Table<PermissionRecord, string>;
  rolePermissions!: Table<RolePermissionRecord, string>;
  sessions!: Table<SessionRecord, string>;
  auditLogs!: Table<AuditLogRecord, string>;

  constructor() {
    super("sls-pharmacy-db");

    this.version(1).stores({
      medicines: "id, name, categoryId, createdAt",
      batches: "id, medicineId, batchNumber, expiryDate, receivedDate",
      cartons: "id, medicineId, batchId, cartonNumber, location",
      categories: "id, name, parentId, createdAt",
      convoys: "id, status, scheduledDate, createdAt",
      stockMovements: "id, medicineId, batchId, convoyId, type, createdAt",
      syncOperations:
        "id, operationId, deviceId, entityType, entityId, operationType, syncStatus, createdAt",
    });

    this.version(2).stores({
      medicines: "id, tradeName, genericName, archivedAt, createdAt, updatedAt",
      categories: "id, name, createdAt",
      pharmacologicalClasses: "id, name, createdAt",
      medicineCategories: "[medicineId+categoryId], medicineId, categoryId",
      medicinePharmacologicalClasses:
        "[medicineId+pharmacologicalClassId], medicineId, pharmacologicalClassId",
    });

    this.version(3).stores({
      batches: "id, medicineId, batchNumber, expiryDate, cartonId, archivedAt, createdAt, updatedAt",
      cartons: "id, code, categoryId, archivedAt, createdAt",
    });

    this.version(4).stores({
      medicineAlternatives: "id, medicineId, alternativeMedicineId",
    });

    this.version(5).stores({
      convoys: "id, status, date, createdAt",
      convoyItems: "id, convoyId, medicineId, batchId, createdAt",
      stockMovements: "id, medicineId, batchId, convoyId, convoyItemId, type, createdAt",
    }).upgrade((tx) => {
      return tx
        .table("convoys")
        .toCollection()
        .modify((convoy: Record<string, unknown>) => {
          if (!convoy.date && convoy.scheduledDate) {
            convoy.date = convoy.scheduledDate;
          }
          if (!convoy.location && convoy.destination) {
            convoy.location = convoy.destination;
          }
          if (convoy.responsiblePerson === undefined) {
            convoy.responsiblePerson = "";
          }
          if (convoy.notes === undefined) {
            convoy.notes = "";
          }
        });
    });

    this.version(6).stores({
      medicines: "id, tradeName, genericName, archivedAt, createdAt, updatedAt",
      categories: "id, name, createdAt",
      pharmacologicalClasses: "id, name, createdAt",
      medicineCategories: "[medicineId+categoryId], medicineId, categoryId",
      medicinePharmacologicalClasses: "[medicineId+pharmacologicalClassId], medicineId, pharmacologicalClassId",
      medicineAlternatives: "id, medicineId, alternativeMedicineId",
      batches: "id, medicineId, batchNumber, expiryDate, cartonId, archivedAt, createdAt, updatedAt",
      cartons: "id, code, categoryId, archivedAt, createdAt",
      convoys: "id, status, date, createdAt",
      convoyItems: "id, convoyId, medicineId, batchId, createdAt",
      stockMovements: "id, medicineId, batchId, convoyId, convoyItemId, type, createdAt",
      cartonsOld: "id, medicineId, batchId, cartonNumber, location",
      syncOperations: "id, operationId, deviceId, entityType, entityId, operationType, syncStatus, createdAt",
    }).upgrade((tx) => {
      return tx
        .table("convoyItems")
        .toCollection()
        .modify((item: Record<string, unknown>) => {
          if (item.quantityReturned === undefined) item.quantityReturned = 0;
          if (item.quantityMissingOrDamaged === undefined) item.quantityMissingOrDamaged = 0;
          if (item.reconciliationNote === undefined) item.reconciliationNote = "";
        });
    });

    this.version(8).stores({
      medicines: "id, tradeName, genericName, archivedAt, createdAt, updatedAt",
      categories: "id, name, createdAt",
      pharmacologicalClasses: "id, name, createdAt",
      medicineCategories: "[medicineId+categoryId], medicineId, categoryId",
      medicinePharmacologicalClasses: "[medicineId+pharmacologicalClassId], medicineId, pharmacologicalClassId",
      medicineAlternatives: "id, medicineId, alternativeMedicineId",
      batches: "id, medicineId, batchNumber, expiryDate, cartonId, archivedAt, createdAt, updatedAt",
      cartons: "id, code, categoryId, archivedAt, createdAt",
      convoys: "id, status, date, createdAt",
      convoyItems: "id, convoyId, medicineId, batchId, createdAt",
      stockMovements: "id, medicineId, batchId, convoyId, convoyItemId, receiptId, receiptItemId, type, createdAt",
      cartonsOld: "id, medicineId, batchId, cartonNumber, location",
      syncOperations: "id, operationId, deviceId, entityType, entityId, operationType, syncStatus, createdAt",
      stockReceipts: "id, receiptNumber, sourceType, date, createdAt",
      stockReceiptItems: "id, receiptId, medicineId, batchId, createdAt",
    });

    this.version(9).stores({
      medicines: "id, tradeName, genericName, archivedAt, createdAt, updatedAt",
      categories: "id, name, createdAt",
      pharmacologicalClasses: "id, name, createdAt",
      medicineCategories: "[medicineId+categoryId], medicineId, categoryId",
      medicinePharmacologicalClasses: "[medicineId+pharmacologicalClassId], medicineId, pharmacologicalClassId",
      medicineAlternatives: "id, medicineId, alternativeMedicineId",
      batches: "id, medicineId, batchNumber, expiryDate, cartonId, archivedAt, createdAt, updatedAt",
      cartons: "id, code, sectionId, isActive, createdAt",
      storageSections: "id, name, code, isActive, createdAt",
      batchLocationTransfers: "id, batchId, fromCartonId, toCartonId, createdAt",
      convoys: "id, status, date, createdAt",
      convoyItems: "id, convoyId, medicineId, batchId, createdAt",
      stockMovements: "id, medicineId, batchId, convoyId, convoyItemId, receiptId, receiptItemId, type, createdAt",
      cartonsOld: "id, medicineId, batchId, cartonNumber, location",
      syncOperations: "id, operationId, deviceId, entityType, entityId, operationType, syncStatus, createdAt",
      stockReceipts: "id, receiptNumber, sourceType, date, createdAt",
      stockReceiptItems: "id, receiptId, medicineId, batchId, createdAt",
    }).upgrade((tx) => {
      return tx
        .table("cartons")
        .toCollection()
        .modify((carton: Record<string, unknown>) => {
          if (carton.name && !carton.label) {
            carton.label = carton.name;
            delete carton.name;
          }
          if (carton.location && !carton.locationNote) {
            carton.locationNote = carton.location;
            delete carton.location;
          }
          if (carton.isActive === undefined) {
            carton.isActive = true;
          }
        });
    });

    // Phase 10: Users, Roles & Permissions
    this.version(10).stores({
      medicines: "id, tradeName, genericName, archivedAt, createdAt, updatedAt",
      categories: "id, name, createdAt",
      pharmacologicalClasses: "id, name, createdAt",
      medicineCategories: "[medicineId+categoryId], medicineId, categoryId",
      medicinePharmacologicalClasses: "[medicineId+pharmacologicalClassId], medicineId, pharmacologicalClassId",
      medicineAlternatives: "id, medicineId, alternativeMedicineId",
      batches: "id, medicineId, batchNumber, expiryDate, cartonId, archivedAt, createdAt, updatedAt",
      cartons: "id, code, sectionId, isActive, createdAt",
      storageSections: "id, name, code, isActive, createdAt",
      batchLocationTransfers: "id, batchId, fromCartonId, toCartonId, createdAt",
      convoys: "id, status, date, createdAt",
      convoyItems: "id, convoyId, medicineId, batchId, createdAt",
      stockMovements: "id, medicineId, batchId, convoyId, convoyItemId, receiptId, receiptItemId, type, createdAt",
      cartonsOld: "id, medicineId, batchId, cartonNumber, location",
      syncOperations: "id, operationId, deviceId, entityType, entityId, operationType, syncStatus, createdAt",
      stockReceipts: "id, receiptNumber, sourceType, date, createdAt",
      stockReceiptItems: "id, receiptId, medicineId, batchId, createdAt",
      users: "++id, username, roleId, isActive, createdAt",
      roles: "++id, name, isSystem, createdAt",
      permissions: "++id, key, group",
      rolePermissions: "++id, roleId, permissionKey, &[roleId+permissionKey]",
      sessions: "++id, userId, expiresAt, createdAt",
      auditLogs: "++id, userId, action, entityType, entityId, deviceId, createdAt",
    });
  }
}

export const db = new SLSPharmacyDB();