import type { SyncOperationRecord } from "./db";
import type { OperationType } from "@/types";

async function getDb() {
  const { db } = await import("./db");
  return db;
}

async function getDeviceIdInternal() {
  const { getDeviceId } = await import("./device-id");
  return getDeviceId();
}

/* ------------------------------------------------------------------ */
/*  Phase 9 Operation Type Constants                                  */
/* ------------------------------------------------------------------ */

export const WAREHOUSE_OPERATION_TYPES = {
  CREATE_STORAGE_SECTION: "CREATE_STORAGE_SECTION",
  UPDATE_STORAGE_SECTION: "UPDATE_STORAGE_SECTION",
  CREATE_CARTON: "CREATE_CARTON",
  UPDATE_CARTON: "UPDATE_CARTON",
  DEACTIVATE_CARTON: "DEACTIVATE_CARTON",
  ASSIGN_BATCH_CARTON: "ASSIGN_BATCH_CARTON",
  MOVE_BATCH_CARTON: "MOVE_BATCH_CARTON",
} as const;

/* ------------------------------------------------------------------ */
/*  Core Operations                                                   */
/* ------------------------------------------------------------------ */

export async function logOperation(params: {
  entityType: string;
  entityId: string;
  operationType: OperationType;
  payload: unknown;
  userId?: string;
  deviceId?: string;
}): Promise<string> {
  const operationId = crypto.randomUUID();
  const resolvedDeviceId = params.deviceId || (typeof window !== "undefined" ? await getDeviceIdInternal() : "");

  const db = await getDb();
  await db.syncOperations.add({
    id: crypto.randomUUID(),
    operationId,
    deviceId: resolvedDeviceId,
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    operationType: params.operationType,
    payload: params.payload as Record<string, unknown>,
    createdAt: new Date(),
    syncStatus: "pending",
    retryCount: 0,
  });

  return operationId;
}

export async function logWarehouseOperation(params: {
  operationType: (typeof WAREHOUSE_OPERATION_TYPES)[keyof typeof WAREHOUSE_OPERATION_TYPES];
  entityId: string;
  payload: unknown;
  deviceId?: string;
}): Promise<string> {
  const operationId = crypto.randomUUID();
  const resolvedDeviceId = params.deviceId || (typeof window !== "undefined" ? await getDeviceIdInternal() : "");

  const db = await getDb();
  await db.syncOperations.add({
    id: crypto.randomUUID(),
    operationId,
    deviceId: resolvedDeviceId,
    entityType: "warehouse",
    entityId: params.entityId,
    operationType: "create",
    payload: {
      warehouseOperationType: params.operationType,
      ...((params.payload as Record<string, unknown>) || {}),
    },
    createdAt: new Date(),
    syncStatus: "pending",
    retryCount: 0,
  });

  return operationId;
}

export async function getPendingOperations(): Promise<SyncOperationRecord[]> {
  const db = await getDb();
  return db.syncOperations.where("syncStatus").equals("pending").sortBy("createdAt");
}

export async function getFailedOperations(): Promise<SyncOperationRecord[]> {
  const db = await getDb();
  return db.syncOperations.where("syncStatus").equals("failed").sortBy("createdAt");
}

export async function markOperationSynced(operationId: string): Promise<void> {
  const db = await getDb();
  await db.syncOperations
    .where("operationId")
    .equals(operationId)
    .modify({ syncStatus: "synced" as const, syncedAt: new Date() });
}

export async function markOperationFailed(operationId: string, error: string): Promise<void> {
  const db = await getDb();
  await db.syncOperations.where("operationId").equals(operationId).modify((op) => {
    op.syncStatus = "failed";
    op.error = error;
    op.retryCount = (op.retryCount || 0) + 1;
  });
}

export async function getPendingOperationsCount(): Promise<number> {
  const db = await getDb();
  return db.syncOperations.where("syncStatus").equals("pending").count();
}