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
/*  Sync Now                                                          */
/* ------------------------------------------------------------------ */

export async function syncNow(): Promise<SyncResult> {
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

function formatOp(op: import("@/lib/offline/db").SyncOperationRecord): SyncOperationUI {
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
  window.addEventListener("online", () => updateConnectionState(true));
  window.addEventListener("offline", () => updateConnectionState(false));
}