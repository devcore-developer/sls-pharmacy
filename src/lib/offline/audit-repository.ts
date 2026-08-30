import { db } from "./db";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  deviceId: string;
  createdAt: Date;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
}

export const AUDIT_ACTIONS = [
  "USER_CREATED",
  "USER_DEACTIVATED",
  "USER_REACTIVATED",
  "USER_UPDATED",
  "ROLE_CHANGED",
  "PASSWORD_RESET",
  "ROLE_CREATED",
  "ROLE_PERMISSIONS_UPDATED",
  "STOCK_ADJUSTED",
  "RECEIPT_CREATED",
  "CONVOY_CREATED",
  "CONVOY_DISPENSED",
  "CONVOY_RETURNED",
  "BATCH_MOVED",
  "LOGIN",
  "LOGOUT",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

export async function logAudit(data: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { getDeviceId } = await import("./device-id");
  const deviceId = await getDeviceId();

  const safeMetadata = data.metadata ? { ...data.metadata } : undefined;
  if (safeMetadata) {
    delete safeMetadata.password;
    delete safeMetadata.passwordHash;
    delete safeMetadata.passwordSalt;
  }

  await db.auditLogs.add({
    id: crypto.randomUUID(),
    userId: data.userId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    metadata: safeMetadata,
    deviceId,
    createdAt: new Date(),
  });
}

/* ------------------------------------------------------------------ */
/*  Query                                                              */
/* ------------------------------------------------------------------ */

export async function getAuditLogs(
  filters?: AuditLogFilters,
  opts?: { limit?: number; offset?: number }
): Promise<{ items: AuditLogEntry[]; total: number }> {
  const collection = db.auditLogs.orderBy("createdAt").reverse();

  let all = await collection.toArray();

  if (filters?.userId) {
    all = all.filter((l) => l.userId === filters.userId);
  }
  if (filters?.action) {
    all = all.filter((l) => l.action === filters.action);
  }
  if (filters?.dateFrom) {
    const from = new Date(filters.dateFrom);
    from.setHours(0, 0, 0, 0);
    all = all.filter((l) => l.createdAt >= from);
  }
  if (filters?.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    all = all.filter((l) => l.createdAt <= to);
  }

  const total = all.length;

  if (opts?.offset) all = all.slice(opts.offset);
  if (opts?.limit) all = all.slice(0, opts.limit);

  const userIds = [...new Set(all.map((l) => l.userId))];
  const users = userIds.length > 0 ? await db.users.where("id").anyOf(userIds).toArray() : [];
  const userMap = new Map(users.map((u) => [u.id!, u.name]));

  const items: AuditLogEntry[] = all.map((l) => ({
    id: l.id!,
    userId: l.userId,
    userName: userMap.get(l.userId) ?? "Unknown",
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    metadata: l.metadata,
    deviceId: l.deviceId,
    createdAt: l.createdAt,
  }));

  return { items, total };
}

export async function getAuditLogUsers(): Promise<Array<{ id: string; name: string }>> {
  const logs = await db.auditLogs.toArray();
  const userIds = [...new Set(logs.map((l) => l.userId))];
  const users = userIds.length > 0 ? await db.users.where("id").anyOf(userIds).toArray() : [];
  return users.map((u) => ({ id: u.id!, name: u.name }));
}