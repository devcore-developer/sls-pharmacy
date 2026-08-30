import { db } from "@/lib/offline/db";
import { getDeviceId } from "@/lib/offline/device-id";
import { APP_VERSION, BACKUP_VERSION } from "@/lib/version";

export interface BackupData {
  backupVersion: number;
  createdAt: string;
  deviceId: string;
  applicationVersion: string;
  data: Record<string, unknown[]>;
}

export interface RestoreResult {
  success: boolean;
  error?: string;
  counts?: Record<string, number>;
  warnings?: string[];
  emergencyBackup?: string;
}

export async function createBackup(): Promise<string> {
  const tables = [
    "medicines", "categories", "pharmacologicalClasses",
    "medicineCategories", "medicinePharmacologicalClasses", "medicineAlternatives",
    "batches", "cartons", "storageSections", "batchLocationTransfers",
    "convoys", "convoyItems", "stockMovements",
    "stockReceipts", "stockReceiptItems",
    "users", "roles", "permissions", "rolePermissions",
    "auditLogs", "syncOperations",
  ] as const;

  const data: Record<string, unknown[]> = {};

  for (const table of tables) {
    const tableRef = db[table] as { toArray: () => Promise<unknown[]> };
    data[table] = await tableRef.toArray();
  }

  const backup: BackupData = {
    backupVersion: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    applicationVersion: APP_VERSION,
    data,
  };

  return JSON.stringify(backup, (_key, value) => {
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Uint8Array) return undefined;
    return value;
  }, 2);
}

export function downloadBackup(jsonString: string): void {
  const date = new Date().toISOString().split("T")[0];
  const filename = "sls-pharmacy-backup-" + date + ".json";
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function validateBackup(json: string): { valid: boolean; error?: string; data?: BackupData } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (_e) {
    return { valid: false, error: "Invalid JSON format." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { valid: false, error: "Backup must be a JSON object." };
  }

  const backup = parsed as BackupData;

  if (typeof backup.backupVersion !== "number" || backup.backupVersion > BACKUP_VERSION) {
    return { valid: false, error: "Unsupported backup version: " + backup.backupVersion };
  }

  if (!backup.applicationVersion || typeof backup.applicationVersion !== "string") {
    return { valid: false, error: "Missing or invalid applicationVersion." };
  }

  if (!backup.deviceId || typeof backup.deviceId !== "string") {
    return { valid: false, error: "Missing or invalid deviceId." };
  }

  if (!backup.createdAt || typeof backup.createdAt !== "string") {
    return { valid: false, error: "Missing or invalid createdAt." };
  }

  if (!backup.data || typeof backup.data !== "object") {
    return { valid: false, error: "Missing or invalid data section." };
  }

  const requiredTables = ["medicines", "batches", "stockMovements", "convoys", "users", "roles"];
  for (let i = 0; i < requiredTables.length; i++) {
    if (!Array.isArray(backup.data[requiredTables[i]])) {
      return { valid: false, error: "Missing required table: " + requiredTables[i] };
    }
  }

  const medicineIds = new Set((backup.data.medicines as Array<{ id?: string }>).map((m) => m.id).filter(Boolean));
  const batchIds = new Set((backup.data.batches as Array<{ id?: string; medicineId?: string }>).map((b) => b.id).filter(Boolean));
  const convoyIds = new Set((backup.data.convoys as Array<{ id?: string }>).map((c) => c.id).filter(Boolean));
  const receiptIds = new Set((backup.data.stockReceipts as Array<{ id?: string }>).map((r) => r.id).filter(Boolean));
  const cartonIds = new Set((backup.data.cartons as Array<{ id?: string }>).map((c) => c.id).filter(Boolean));

  const batches = backup.data.batches as Array<{ id?: string; medicineId?: string; cartonId?: string }>;
  for (let j = 0; j < batches.length; j++) {
    const b = batches[j];
    if (b.medicineId && !medicineIds.has(b.medicineId)) {
      return { valid: false, error: "Batch references non-existent medicine: " + b.medicineId };
    }
    if (b.cartonId && !cartonIds.has(b.cartonId)) {
      return { valid: false, error: "Batch references non-existent carton: " + b.cartonId };
    }
  }

  const convoyItems = (backup.data.convoyItems || []) as Array<{ convoyId?: string; medicineId?: string; batchId?: string }>;
  for (let k = 0; k < convoyItems.length; k++) {
    const ci = convoyItems[k];
    if (ci.convoyId && !convoyIds.has(ci.convoyId)) {
      return { valid: false, error: "Convoy item references non-existent convoy." };
    }
    if (ci.medicineId && !medicineIds.has(ci.medicineId)) {
      return { valid: false, error: "Convoy item references non-existent medicine." };
    }
    if (ci.batchId && !batchIds.has(ci.batchId)) {
      return { valid: false, error: "Convoy item references non-existent batch." };
    }
  }

  const movements = (backup.data.stockMovements || []) as Array<{ medicineId?: string; batchId?: string; convoyId?: string; receiptId?: string }>;
  for (let m = 0; m < movements.length; m++) {
    const mv = movements[m];
    if (mv.medicineId && !medicineIds.has(mv.medicineId)) {
      return { valid: false, error: "Movement references non-existent medicine." };
    }
    if (mv.batchId && !batchIds.has(mv.batchId)) {
      return { valid: false, error: "Movement references non-existent batch." };
    }
    if (mv.convoyId && !convoyIds.has(mv.convoyId)) {
      return { valid: false, error: "Movement references non-existent convoy." };
    }
    if (mv.receiptId && !receiptIds.has(mv.receiptId)) {
      return { valid: false, error: "Movement references non-existent receipt." };
    }
  }

  return { valid: true, data: backup };
}

export async function restoreBackup(backup: BackupData): Promise<RestoreResult> {
  const warnings: string[] = [];
  const counts: Record<string, number> = {};
  let emergencyBackupStr: string | undefined;

  try {
    emergencyBackupStr = await createBackup();
    warnings.push("Emergency backup created. It will be returned if restore fails.");
  } catch (_e) {
    warnings.push("Could not create emergency backup.");
  }

  const allTables = [
    db.medicines, db.categories, db.pharmacologicalClasses,
    db.medicineCategories, db.medicinePharmacologicalClasses, db.medicineAlternatives,
    db.batches, db.cartons, db.storageSections, db.batchLocationTransfers,
    db.convoys, db.convoyItems, db.stockMovements,
    db.stockReceipts, db.stockReceiptItems,
    db.users, db.roles, db.permissions, db.rolePermissions,
    db.auditLogs, db.syncOperations,
  ];

  const clearOrder = [
    "auditLogs", "syncOperations", "rolePermissions",
    "stockReceiptItems", "stockMovements", "convoyItems",
    "stockReceipts", "convoys",
    "batchLocationTransfers", "batches",
    "medicineAlternatives", "medicinePharmacologicalClasses", "medicineCategories",
    "cartons", "storageSections",
    "permissions", "roles", "users",
    "medicines", "categories", "pharmacologicalClasses",
  ];

  const importOrder = [
    "categories", "pharmacologicalClasses",
    "medicines",
    "medicineCategories", "medicinePharmacologicalClasses", "medicineAlternatives",
    "storageSections", "cartons",
    "batches", "batchLocationTransfers",
    "convoys", "convoyItems",
    "stockReceipts", "stockReceiptItems", "stockMovements",
    "users", "roles", "permissions", "rolePermissions",
    "syncOperations", "auditLogs",
  ];

  const tableMap: Record<string, { clear: () => Promise<void>; bulkAdd: (items: unknown[], keys?: unknown[]) => Promise<void> }> = {};
  for (const tableName of clearOrder) {
    const t = db[tableName as keyof typeof db] as unknown as { clear: () => Promise<void>; bulkAdd: (items: unknown[], keys?: unknown[]) => Promise<void> };
    if (t && typeof t.clear === "function") {
      tableMap[tableName] = t;
    }
  }

  try {
    await db.transaction("rw", allTables, async () => {
      for (const tableName of clearOrder) {
        const table = tableMap[tableName];
        if (table) {
          await table.clear();
        }
      }

      for (const tableName of importOrder) {
        const table = tableMap[tableName];
        if (!table) continue;
        const records = backup.data[tableName];
        if (!Array.isArray(records) || records.length === 0) continue;

        const keys = (records as Array<{ id?: unknown }>).map((r) => r.id).filter((k) => k !== undefined);
        if (keys.length === records.length) {
          await table.bulkAdd(records, keys);
        } else {
          await table.bulkAdd(records);
        }
        counts[tableName] = records.length;
      }
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      error: "Restore failed: " + errMsg + ". Original data was rolled back.",
      emergencyBackup: emergencyBackupStr,
      warnings,
    };
  }

  return { success: true, counts, warnings };
}