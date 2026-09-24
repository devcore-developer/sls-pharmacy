import { db } from "@/lib/offline/db";
import { getDeviceId } from "@/lib/offline/device-id";
import type { SyncOperationRecord } from "@/lib/offline/db";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SyncState = "idle" | "syncing" | "error";

export interface SyncStatus {
  isOnline: boolean;
  state: SyncState;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: Date | null;
  currentOperation: string | null;
  errorMessage: string | null;
}

export interface SyncResult {
  synced: number;
  failed: number;
  conflicts: number;
  errors: Array<{ operationId: string; error: string }>;
}

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

const LAST_SYNC_KEY = "sls-last-sync";
const LAST_PULL_KEY = "sls-last-pull-sync";

const status: SyncStatus = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  state: "idle",
  pendingCount: 0,
  failedCount: 0,
  lastSyncAt: null,
  currentOperation: null,
  errorMessage: null,
};

const listeners = new Set<(s: SyncStatus) => void>();

function notify() {
  const snapshot = { ...status };
  listeners.forEach((fn) => fn(snapshot));
}

function loadLastSync() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(LAST_SYNC_KEY);
  if (stored) {
    status.lastSyncAt = new Date(stored);
  }
}

function saveLastSync(date: Date) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_SYNC_KEY, date.toISOString());
  status.lastSyncAt = date;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function getSyncStatus(): SyncStatus {
  return { ...status };
}

export function subscribeSyncStatus(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function updateConnectionState(online: boolean) {
  status.isOnline = online;
  notify();
}

export async function refreshCounts() {
  const [pending, failed] = await Promise.all([
    db.syncOperations.where("syncStatus").equals("pending").count(),
    db.syncOperations.where("syncStatus").equals("failed").count(),
  ]);
  status.pendingCount = pending;
  status.failedCount = failed;
  notify();
}

/* ------------------------------------------------------------------ */
/*  Reconciliation (Fix Stale Cursors)                                 */
/* ------------------------------------------------------------------ */

export async function reconcileData(): Promise<void> {
  if (status.state === "syncing") return;
  
  console.log("[SYNC] Starting data reconciliation. Resetting cursors...");
  
  // 1. تصفير الـ Cursors لإجبار المحرك على سحب البيانات من عام 1970
  localStorage.removeItem("sls-med-lastSync");
  localStorage.removeItem("sls-bat-lastSync");
  localStorage.removeItem("sls-mov-lastSync");
  localStorage.removeItem("sls-car-lastSync");
  localStorage.removeItem("sls-last-pull-sync");
  localStorage.removeItem("sls-last-sync");
  
  // 2. تشغيل المزامنة العادية التي ستقوم بسحب كل شيء من جديد
  await syncNow();
}

/* ------------------------------------------------------------------ */
/*  Pull Sync (Fetch server changes)                                   */
/* ------------------------------------------------------------------ */

async function pullServerChanges() {
  if (!navigator.onLine) return;
  
  let medLastSync = localStorage.getItem("sls-med-lastSync") || new Date(0).toISOString();
  let batLastSync = localStorage.getItem("sls-bat-lastSync") || new Date(0).toISOString();
  let movLastSync = localStorage.getItem("sls-mov-lastSync") || new Date(0).toISOString();
  let carLastSync = localStorage.getItem("sls-car-lastSync") || new Date(0).toISOString();
  let conLastSync = localStorage.getItem("sls-con-lastSync") || new Date(0).toISOString();
  let conItemLastSync = localStorage.getItem("sls-conItem-lastSync") || new Date(0).toISOString();
  
  let medCursor = "";
  let batCursor = "";
  let movCursor = "";
  let carCursor = "";
  let conCursor = "";
  let conItemCursor = "";
  
  try {
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
      const params = new URLSearchParams({
        medLastSync, batLastSync, movLastSync, carLastSync, conLastSync, conItemLastSync,
        medCursor, batCursor, movCursor, carCursor, conCursor, conItemCursor,
      });

      const res = await fetch(`/api/sync?${params.toString()}`, { credentials: "include" });
      
      if (!res.ok) {
        console.error("[SYNC] Pull failed:", res.status);
        status.state = "error";
        status.errorMessage = `Sync failed: ${res.statusText}`;
        notify();
        return;
      }
      
      const data = await res.json();

      try {
        if (data.medicines?.length > 0) {
          await db.medicines.bulkPut(data.medicines.map((m: any) => ({
            id: m.id, tradeName: m.tradeName, genericName: m.genericName,
            manufacturer: m.manufacturer || undefined, barcode: m.barcode || undefined,
            notes: m.notes || undefined, strength: m.strength || undefined,
            dosageForm: m.dosageForm || undefined, route: m.route || undefined,
            drugClass: m.drugClass || undefined, category: m.category || undefined,
            isCatalog: m.isCatalog || false,
            archivedAt: m.archivedAt ? new Date(m.archivedAt) : undefined,
            createdAt: new Date(m.createdAt), updatedAt: new Date(m.updatedAt),
          })));
          totalSynced += data.medicines.length;
        }

        if (data.batches?.length > 0) {
          await db.batches.bulkPut(data.batches.map((b: any) => ({
            id: b.id, medicineId: b.medicineId, batchNumber: b.batchNumber,
            quantity: b.quantity, expiryDate: new Date(b.expiryDate),
            cartonId: b.cartonId || undefined,
            archivedAt: b.archivedAt ? new Date(b.archivedAt) : undefined,
            createdAt: new Date(b.createdAt), updatedAt: new Date(b.updatedAt),
          })));
          totalSynced += data.batches.length;
        }

        if (data.stockMovements?.length > 0) {
          await db.stockMovements.bulkPut(data.stockMovements.map((m: any) => ({
            id: m.id, medicineId: m.medicineId, batchId: m.batchId || undefined,
            convoyId: m.convoyId || undefined, convoyItemId: m.convoyItemId || undefined,
            receiptId: m.receiptId || undefined, receiptItemId: m.receiptItemId || undefined,
            type: m.type, quantity: m.quantity, reason: m.reason || undefined,
            notes: m.notes || undefined, createdAt: new Date(m.createdAt),
            deviceId: m.deviceId || undefined, userId: m.userId || undefined,
          })));
          totalSynced += data.stockMovements.length;
        }

        if (data.cartons?.length > 0) {
          await db.cartons.bulkPut(data.cartons.map((c: any) => ({
            id: c.id, code: c.code, label: c.label || undefined,
            specialty: c.specialty || undefined, category: c.category || undefined,
            sectionId: c.sectionId || undefined, locationNote: c.locationNote || undefined,
            isActive: c.isActive ?? true,
            createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt),
          })));
          totalSynced += data.cartons.length;
        }

        if (data.convoys?.length > 0) {
          await db.convoys.bulkPut(data.convoys.map((c: any) => ({
            id: c.id, name: c.name, date: c.date,
            location: c.location || "", responsiblePerson: c.responsiblePerson || "",
            notes: c.notes || "", status: c.status,
            createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt),
            completedAt: c.completedAt ? new Date(c.completedAt) : undefined,
          })));
          totalSynced += data.convoys.length;
        }

        if (data.convoyItems?.length > 0) {
          await db.convoyItems.bulkPut(data.convoyItems.map((i: any) => ({
            id: i.id, convoyId: i.convoyId, medicineId: i.medicineId,
            batchId: i.batchId || undefined, sourceCartonId: i.sourceCartonId || undefined,
            quantityTaken: i.quantityTaken, quantityDispensed: i.quantityDispensed,
            quantityReturned: i.quantityReturned || 0, quantityMissingOrDamaged: i.quantityMissingOrDamaged || 0,
            reconciliationNote: i.reconciliationNote || "",
            returnedAt: i.returnedAt ? new Date(i.returnedAt) : undefined,
            reconciledAt: i.reconciledAt ? new Date(i.reconciledAt) : undefined,
            createdAt: new Date(i.createdAt), updatedAt: new Date(i.updatedAt),
          })));
          totalSynced += data.convoyItems.length;
        }
      } catch (dbErr) {
        console.error("[SYNC] IndexedDB transaction failed:", dbErr);
        status.state = "error";
        status.errorMessage = "Storage limit reached or DB error.";
        notify();
        return; 
      }

      medCursor = data.nextCursors.medicines;
      batCursor = data.nextCursors.batches;
      movCursor = data.nextCursors.stockMovements;
      carCursor = data.nextCursors.cartons;
      conCursor = data.nextCursors.convoys;
      conItemCursor = data.nextCursors.convoyItems;

      medLastSync = data.nextLastSync.medicines;
      batLastSync = data.nextLastSync.batches;
      movLastSync = data.nextLastSync.stockMovements;
      carLastSync = data.nextLastSync.cartons;
      conLastSync = data.nextLastSync.convoys;
      conItemLastSync = data.nextLastSync.convoyItems;

      hasMore = data.hasMore;
    }

    localStorage.setItem("sls-med-lastSync", medLastSync);
    localStorage.setItem("sls-bat-lastSync", batLastSync);
    localStorage.setItem("sls-mov-lastSync", movLastSync);
    localStorage.setItem("sls-car-lastSync", carLastSync);
    localStorage.setItem("sls-con-lastSync", conLastSync);
    localStorage.setItem("sls-conItem-lastSync", conItemLastSync);
    
    localStorage.removeItem("sls-last-pull-sync");
    localStorage.removeItem("sls-last-sync");

    console.log(`[SYNC] Pulled server changes successfully. Total records synced: ${totalSynced}`);
    
    if (totalSynced > 0 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app-data-synced"));
    }
  } catch (err) {
    console.error("[SYNC] Pull network error:", err);
    status.state = "error";
    status.errorMessage = "Network error during sync.";
    notify();
  }
}

/* ------------------------------------------------------------------ */
/*  Sync Now (Push + Pull) with Promise Lock                          */
/* ------------------------------------------------------------------ */

let syncPromise: Promise<SyncResult> | null = null;

export async function syncNow(): Promise<SyncResult> {
  if (syncPromise) return syncPromise;
  
  syncPromise = actualSyncNow();
  const result = await syncPromise;
  syncPromise = null;
  return result;
}

async function actualSyncNow(): Promise<SyncResult> {
  if (status.state === "syncing") return { synced: 0, failed: 0, conflicts: 0, errors: [] };

  if (!navigator.onLine) {
    status.state = "error";
    status.errorMessage = "You're offline. Changes will sync when you're back online.";
    notify();
    return { synced: 0, failed: 0, conflicts: 0, errors: [] };
  }

  status.state = "syncing";
  status.errorMessage = null;
  notify();

  const result: SyncResult = { synced: 0, failed: 0, conflicts: 0, errors: [] };

  try {
    const pending = await db.syncOperations.where("syncStatus").equals("pending").sortBy("createdAt");

    for (const op of pending) {
      status.currentOperation = `${op.operationType} ${op.entityType}`;
      notify();

      try {
        const response = await fetch("/api/sync", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operationId: op.operationId,
            deviceId: op.deviceId,
            userId: op.userId,
            timestamp: op.createdAt.toISOString(),
            operationType: op.operationType,
            entityType: op.entityType,
            entityId: op.entityId,
            payload: op.payload,
          }),
        });

        if (response.ok) {
          const body = await response.json();
          if (body.status === "CONFLICT") {
            await db.syncOperations.where("operationId").equals(op.operationId).modify({
              syncStatus: "failed" as const,
              error: body.message || "Conflict detected",
              retryCount: (op.retryCount || 0) + 1,
            });
            result.conflicts++;
          } else {
            await db.syncOperations.where("operationId").equals(op.operationId).modify({
              syncStatus: "synced" as const,
              syncedAt: new Date(),
            });
            result.synced++;
          }
        } else if (response.status === 409) {
          await db.syncOperations.where("operationId").equals(op.operationId).modify({
            syncStatus: "synced" as const,
            syncedAt: new Date(),
          });
          result.synced++;
        } else {
          const errText = await response.text().catch(() => "Unknown error");
          await db.syncOperations.where("operationId").equals(op.operationId).modify({
            syncStatus: "failed" as const,
            error: errText.slice(0, 500),
            retryCount: (op.retryCount || 0) + 1,
          });
          result.failed++;
          result.errors.push({ operationId: op.operationId, error: errText.slice(0, 200) });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        await db.syncOperations.where("operationId").equals(op.operationId).modify({
          syncStatus: "failed" as const,
          error: msg.slice(0, 500),
          retryCount: (op.retryCount || 0) + 1,
        });
        result.failed++;
        result.errors.push({ operationId: op.operationId, error: msg.slice(0, 200) });
        break;
      }
    }

    if (result.synced > 0) {
      saveLastSync(new Date());
    }
  } catch (err) {
    status.errorMessage = err instanceof Error ? err.message : "Sync failed";
  } finally {
    status.state = (result.errors.length > 0 && result.synced === 0) ? "error" : "idle";
    status.currentOperation = null;
    await refreshCounts();
    notify();
  }

  await pullServerChanges();

  return result;
}

/* ------------------------------------------------------------------ */
/*  Retry                                                              */
/* ------------------------------------------------------------------ */

export async function retryFailed(operationId?: string): Promise<void> {
  if (operationId) {
    await db.syncOperations.where("operationId").equals(operationId).modify({
      syncStatus: "pending" as const,
      error: undefined,
    });
  } else {
    await db.syncOperations.where("syncStatus").equals("failed").modify({
      syncStatus: "pending" as const,
      error: undefined,
    });
  }
  await refreshCounts();
}

/* ------------------------------------------------------------------ */
/*  Query helpers for UI                                               */
/* ------------------------------------------------------------------ */

export interface SyncOperationUI {
  operationId: string;
  entityType: string;
  entityId: string;
  operationType: string;
  syncStatus: string;
  createdAt: Date;
  error?: string;
  retryCount: number;
}

export async function getPendingOperationsUI(): Promise<SyncOperationUI[]> {
  const ops = await db.syncOperations.where("syncStatus").equals("pending").sortBy("createdAt");
  return ops.map(formatOp);
}

export async function getFailedOperationsUI(): Promise<SyncOperationUI[]> {
  const ops = await db.syncOperations.where("syncStatus").equals("failed").sortBy("createdAt");
  return ops.map(formatOp);
}

export async function getSyncedOperationsUI(limit = 20): Promise<SyncOperationUI[]> {
  const ops = await db.syncOperations.where("syncStatus").equals("synced").reverse().sortBy("createdAt");
  return ops.slice(0, limit).map(formatOp);
}

function formatOp(op: SyncOperationRecord): SyncOperationUI {
  return {
    operationId: op.operationId,
    entityType: op.entityType,
    entityId: op.entityId,
    operationType: op.operationType,
    syncStatus: op.syncStatus,
    createdAt: op.createdAt,
    error: op.error,
    retryCount: op.retryCount,
  };
}

function getEntityLabel(entityType: string): string {
  const labels: Record<string, string> = {
    medicine: "Medicine",
    batch: "Batch",
    carton: "Carton",
    convoy: "Convoy",
    convoyItem: "Convoy Item",
    stockMovement: "Stock Movement",
    stockReceipt: "Stock Receipt",
    stockReceiptItem: "Receipt Item",
    user: "User",
    warehouse: "Warehouse",
  };
  return labels[entityType] || entityType;
}

export function formatOperationLabel(op: SyncOperationUI): string {
  const entity = getEntityLabel(op.entityType);
  const type = op.operationType === "create" ? "Create" : op.operationType === "update" ? "Update" : op.operationType === "delete" ? "Delete" : op.operationType;
  return `${type} ${entity}`;
}

export const retryAllFailed = () => retryFailed();

/* ------------------------------------------------------------------ */
/*  Init                                                               */
/* ------------------------------------------------------------------ */

if (typeof window !== "undefined") {
  loadLastSync();
  refreshCounts();
  
  window.addEventListener("online", () => {
    updateConnectionState(true);
    setTimeout(() => syncNow(), 1000);
  });
  
  window.addEventListener("offline", () => updateConnectionState(false));

  // Immediate Pull when the user returns to the tab
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      syncNow().catch(console.error);
    }
  });

  if (navigator.onLine) {
    setTimeout(() => syncNow(), 2000);
  }

  // Fallback polling reduced to 30s
  setInterval(() => {
    if (navigator.onLine) {
      syncNow().catch(console.error);
    }
  }, 30000);
}