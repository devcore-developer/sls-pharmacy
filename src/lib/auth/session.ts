import { db, ensureDbReady } from "@/lib/offline/db";

const SESSION_DURATION_DAYS = 7;
const SESSION_KEY = "sls_session_id";

export interface SessionData {
  id: string;
  userId: string;
  username: string;
  roleName: string;
  permissions: string[];
  createdAt: Date;
  expiresAt: Date;
}

function createExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DURATION_DAYS);
  return d;
}

/**
 * SINGLE SOURCE OF TRUTH: Checks if any administrator exists.
 * This is the ONLY function that should determine if we're in "first run" mode.
 */
export async function isFirstRun(): Promise<boolean> {
  // Ensure DB is fully open before checking
  await ensureDbReady();
  
  // Direct count query - simple and reliable
  const count = await db.users.count();
  return count === 0;
}

export async function createSession(user: {
  id: string;
  username: string;
  roleName: string;
  permissions: string[];
}): Promise<SessionData> {
  await ensureDbReady();
  
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = createExpiry();

  await db.sessions.add({ id, userId: user.id, expiresAt, createdAt: now });

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, id);
  }

  return {
    id,
    userId: user.id,
    username: user.username,
    roleName: user.roleName,
    permissions: user.permissions,
    createdAt: now,
    expiresAt,
  };
}

export async function validateSession(): Promise<SessionData | null> {
  if (typeof window === "undefined") return null;
  
  await ensureDbReady();

  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) return null;

  const record = await db.sessions.get(sessionId);
  if (!record) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  if (new Date(record.expiresAt) < new Date()) {
    await db.sessions.delete(sessionId).catch(() => {});
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  const user = await db.users.get(record.userId);
  if (!user || !user.isActive) {
    await db.sessions.delete(sessionId).catch(() => {});
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  const rolePerms = await db.rolePermissions.where("roleId").equals(user.roleId).toArray();
  const permissions = rolePerms.map((rp) => rp.permissionKey);
  const role = await db.roles.get(user.roleId);

  return {
    id: sessionId,
    userId: user.id!,
    username: user.username,
    roleName: role?.name ?? "UNKNOWN",
    permissions,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  };
}

export async function destroySession(): Promise<void> {
  if (typeof window === "undefined") return;
  
  await ensureDbReady();
  
  const sessionId = localStorage.getItem(SESSION_KEY);
  if (sessionId) {
    await db.sessions.delete(sessionId).catch(() => {});
    localStorage.removeItem(SESSION_KEY);
  }
}