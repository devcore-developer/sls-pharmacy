import Dexie, { type Table } from "dexie";

/* ------------------------------------------------------------------ */
/*  Record Types                                                       */
/* ------------------------------------------------------------------ */

export interface MedicineRecord {
  id?: string;
  tradeName: string;
  genericName: string;
  manufacturer?: string;
  barcode?: string;
  notes?: string;
  strength?: string | null;
  dosageForm?: string | null;
  route?: string | null;
  drugClass?: string | null;
  category?: string | null;
  isCatalog?: boolean;
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

    // Phase 10: Users, Roles & Permissions (ORIGINAL - kept for upgrade path)
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

    // Phase 11: Fix primary key types for UUID-based tables
    this.version(11).stores({
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
      // FIX: Changed from ++id to id for UUID-based primary keys
      users: "id, username, roleId, isActive, createdAt",
      roles: "id, name, isSystem, createdAt",
      permissions: "id, key, group",
      rolePermissions: "id, roleId, permissionKey, &[roleId+permissionKey]",
      sessions: "id, userId, expiresAt, createdAt",
      auditLogs: "id, userId, action, entityType, entityId, deviceId, createdAt",
    }).upgrade(async (tx) => {
      // Migrate users table: ensure all records have UUID primary keys
      const users = await tx.table("users").toArray();
      for (const user of users) {
        // If the primary key is a number (auto-generated), generate a UUID
        if (typeof user.id === "number") {
          const newId = crypto.randomUUID();
          const userData = { ...user };
          delete (userData as Record<string, unknown>).id;
          (userData as Record<string, unknown>).id = newId;
          await tx.table("users").delete(user.id as number);
          await tx.table("users").add(userData);
          
          // Update any references in sessions and auditLogs
          const sessions = await tx.table("sessions").where("userId").equals(String(user.id)).toArray();
          for (const session of sessions) {
            await tx.table("sessions").update(session.id as number, { userId: newId });
          }
          
          const auditLogs = await tx.table("auditLogs").where("userId").equals(String(user.id)).toArray();
          for (const log of auditLogs) {
            await tx.table("auditLogs").update(log.id as number, { userId: newId });
          }
        }
      }
      
      // Migrate roles table
      const roles = await tx.table("roles").toArray();
      for (const role of roles) {
        if (typeof role.id === "number") {
          const newId = crypto.randomUUID();
          const oldId = role.id;
          const roleData = { ...role };
          delete (roleData as Record<string, unknown>).id;
          (roleData as Record<string, unknown>).id = newId;
          await tx.table("roles").delete(oldId as number);
          await tx.table("roles").add(roleData);
          
          // Update rolePermissions references
          const rolePerms = await tx.table("rolePermissions").where("roleId").equals(String(oldId)).toArray();
          for (const rp of rolePerms) {
            await tx.table("rolePermissions").update(rp.id as number, { roleId: newId });
          }
          
          // Update users with this roleId
          const usersWithRole = await tx.table("users").where("roleId").equals(String(oldId)).toArray();
          for (const u of usersWithRole) {
            await tx.table("users").update(u.id as string, { roleId: newId });
          }
        }
      }
      
      // Migrate permissions table
      const perms = await tx.table("permissions").toArray();
      for (const perm of perms) {
        if (typeof perm.id === "number") {
          const newId = crypto.randomUUID();
          const permData = { ...perm };
          delete (permData as Record<string, unknown>).id;
          (permData as Record<string, unknown>).id = newId;
          await tx.table("permissions").delete(perm.id as number);
          await tx.table("permissions").add(permData);
        }
      }
      
      // Migrate rolePermissions table
      const rolePerms = await tx.table("rolePermissions").toArray();
      for (const rp of rolePerms) {
        if (typeof rp.id === "number") {
          const newId = crypto.randomUUID();
          const rpData = { ...rp };
          delete (rpData as Record<string, unknown>).id;
          (rpData as Record<string, unknown>).id = newId;
          await tx.table("rolePermissions").delete(rp.id as number);
          await tx.table("rolePermissions").add(rpData);
        }
      }
      
      // Migrate sessions table
      const sessions = await tx.table("sessions").toArray();
      for (const session of sessions) {
        if (typeof session.id === "number") {
          const newId = crypto.randomUUID();
          const sessionData = { ...session };
          delete (sessionData as Record<string, unknown>).id;
          (sessionData as Record<string, unknown>).id = newId;
          await tx.table("sessions").delete(session.id as number);
          await tx.table("sessions").add(sessionData);
        }
      }
      
      // Migrate auditLogs table
      const auditLogs = await tx.table("auditLogs").toArray();
      for (const log of auditLogs) {
        if (typeof log.id === "number") {
          const newId = crypto.randomUUID();
          const logData = { ...log };
          delete (logData as Record<string, unknown>).id;
          (logData as Record<string, unknown>).id = newId;
          await tx.table("auditLogs").delete(log.id as number);
          await tx.table("auditLogs").add(logData);
        }
      }
    });

    // Phase 12: Add barcode to medicines
    this.version(12).stores({
      medicines: "id, tradeName, genericName, barcode, archivedAt, createdAt, updatedAt",
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
      users: "id, username, roleId, isActive, createdAt",
      roles: "id, name, isSystem, createdAt",
      permissions: "id, key, group",
      rolePermissions: "id, roleId, permissionKey, &[roleId+permissionKey]",
      sessions: "id, userId, expiresAt, createdAt",
      auditLogs: "id, userId, action, entityType, entityId, deviceId, createdAt",
    });
  }
}

export const db = new SLSPharmacyDB();

/**
 * Ensures the database is open and ready for operations.
 * This should be called before any critical operations.
 */
export async function ensureDbReady(): Promise<void> {
  if (typeof window === "undefined") return;
  await db.open();
}