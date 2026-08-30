import { db, ensureDbReady } from "./db";
import type { UserRecord } from "./db";
import { hashPassword, verifyPassword, validatePassword } from "@/lib/auth/password";
import { logAudit } from "./audit-repository";
import { SYSTEM_ROLES } from "@/lib/permissions";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UserListItem {
  id: string;
  roleId: string;
  name: string;
  username: string;
  roleName: string;
  roleLabel: string;
  isActive: boolean;
  lastActivityAt: Date | null;
  createdAt: Date;
}

export interface UserDetail extends UserListItem {
  updatedAt: Date;
}

export interface CreateUserFormData {
  name: string;
  username: string;
  password: string;
  roleId: string;
}

export interface UpdateUserFormData {
  name?: string;
  roleId?: string;
  password?: string;
  isActive?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Authentication                                                     */
/* ------------------------------------------------------------------ */

export async function authenticateUser(username: string, password: string): Promise<{
  success: boolean;
  error?: string;
  user?: UserRecord;
  roleName?: string;
}> {
  await ensureDbReady();
  
  const user = await db.users.where("username").equals(username.trim()).first();
  if (!user) return { success: false, error: "Invalid username or password." };
  if (!user.isActive) return { success: false, error: "Your account is inactive." };

  const valid = await verifyPassword(password, {
    hash: user.passwordHash,
    salt: user.passwordSalt,
    algorithm: user.passwordAlgorithm,
    iterations: user.passwordIterations,
  });
  if (!valid) return { success: false, error: "Invalid username or password." };

  await db.users.update(user.id!, { lastActivityAt: new Date() });

  const role = await db.roles.get(user.roleId);
  return { success: true, user, roleName: role?.name };
}

export async function createFirstAdmin(data: {
  name: string;
  username: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  await ensureDbReady();
  
  // CRITICAL: Use transaction to prevent race conditions
  let result: { success: boolean; error?: string };
  
  await db.transaction("rw", [db.users, db.rolePermissions, db.roles, db.syncOperations], async () => {
    // Double-check inside transaction
    const count = await db.users.count();
    if (count > 0) {
      result = { success: false, error: "An administrator already exists." };
      return;
    }

    const validation = validatePassword(data.password);
    if (!validation.valid) {
      result = { success: false, error: validation.errors.join(". ") };
      return;
    }

    const existing = await db.users.where("username").equals(data.username.trim()).first();
    if (existing) {
      result = { success: false, error: "Username already exists." };
      return;
    }

    const adminRole = await db.roles.where("name").equals(SYSTEM_ROLES.ADMIN).first();
    if (!adminRole) {
      result = { success: false, error: "System not initialized. Please refresh." };
      return;
    }

    const hashed = await hashPassword(data.password);
    const now = new Date();
    const id = crypto.randomUUID();

    await db.users.add({
      id,
      username: data.username.trim(),
      name: data.name.trim(),
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      passwordAlgorithm: hashed.algorithm,
      passwordIterations: hashed.iterations,
      roleId: adminRole.id!,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await logAudit({
      userId: id,
      action: "USER_CREATED",
      entityType: "user",
      entityId: id,
      metadata: { username: data.username.trim(), role: "ADMIN", firstAdmin: true },
    });

    result = { success: true };
  });
  
  return result!;
}

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */

export async function getAllUsers(): Promise<UserListItem[]> {
  await ensureDbReady();
  
  const users = await db.users.orderBy("createdAt").toArray();
  const roleIds = [...new Set(users.map((u) => u.roleId))];
  const roles = roleIds.length > 0 ? await db.roles.where("id").anyOf(roleIds).toArray() : [];
  const roleMap = new Map(roles.map((r) => [r.id!, r]));

  return users.map((u) => {
    const role = roleMap.get(u.roleId);
    return {
      id: u.id!,
      roleId: u.roleId,
      name: u.name,
      username: u.username,
      roleName: role?.name ?? "UNKNOWN",
      roleLabel: role?.label ?? "Unknown",
      isActive: u.isActive,
      lastActivityAt: u.lastActivityAt ?? null,
      createdAt: u.createdAt,
    };
  });
}

export async function getUserById(id: string): Promise<UserDetail | null> {
  await ensureDbReady();
  
  const user = await db.users.get(id);
  if (!user) return null;

  const role = await db.roles.get(user.roleId);
  return {
    id: user.id!,
    roleId: user.roleId,
    name: user.name,
    username: user.username,
    roleName: role?.name ?? "UNKNOWN",
    roleLabel: role?.label ?? "Unknown",
    isActive: user.isActive,
    lastActivityAt: user.lastActivityAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function createUser(
  data: CreateUserFormData,
  creatorId: string
): Promise<{ success: boolean; error?: string }> {
  await ensureDbReady();
  
  const validation = validatePassword(data.password);
  if (!validation.valid) return { success: false, error: validation.errors.join(". ") };

  if (!data.name.trim()) return { success: false, error: "Name is required." };
  if (!data.username.trim()) return { success: false, error: "Username is required." };
  if (!data.roleId) return { success: false, error: "Role is required." };

  const existing = await db.users.where("username").equals(data.username.trim()).first();
  if (existing) return { success: false, error: "Username already exists." };

  const role = await db.roles.get(data.roleId);
  if (!role) return { success: false, error: "Selected role does not exist." };

  const hashed = await hashPassword(data.password);
  const now = new Date();
  const id = crypto.randomUUID();

  await db.users.add({
    id,
    username: data.username.trim(),
    name: data.name.trim(),
    passwordHash: hashed.hash,
    passwordSalt: hashed.salt,
    passwordAlgorithm: hashed.algorithm,
    passwordIterations: hashed.iterations,
    roleId: data.roleId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit({
    userId: creatorId,
    action: "USER_CREATED",
    entityType: "user",
    entityId: id,
    metadata: { username: data.username.trim(), role: role.name },
  });

  return { success: true };
}

export async function updateUser(
  id: string,
  data: UpdateUserFormData,
  editorId: string
): Promise<{ success: boolean; error?: string }> {
  await ensureDbReady();
  
  const user = await db.users.get(id);
  if (!user) return { success: false, error: "User not found." };

  const updates: Partial<UserRecord> = { updatedAt: new Date() };

  if (data.name !== undefined) {
    if (!data.name.trim()) return { success: false, error: "Name is required." };
    updates.name = data.name.trim();
  }

  if (data.roleId !== undefined) {
    if (data.roleId && data.roleId !== user.roleId) {
      const check = await canChangeRole(id, data.roleId);
      if (!check.allowed) return { success: false, error: check.reason };
      const role = await db.roles.get(data.roleId);
      if (!role) return { success: false, error: "Selected role does not exist." };
      updates.roleId = data.roleId;

      await logAudit({
        userId: editorId,
        action: "ROLE_CHANGED",
        entityType: "user",
        entityId: id,
        metadata: { from: user.roleId, to: data.roleId },
      });
    }
  }

  if (data.password !== undefined && data.password !== "") {
    const validation = validatePassword(data.password);
    if (!validation.valid) return { success: false, error: validation.errors.join(". ") };
    const hashed = await hashPassword(data.password);
    updates.passwordHash = hashed.hash;
    updates.passwordSalt = hashed.salt;
    updates.passwordAlgorithm = hashed.algorithm;
    updates.passwordIterations = hashed.iterations;

    await logAudit({
      userId: editorId,
      action: "PASSWORD_RESET",
      entityType: "user",
      entityId: id,
    });
  }

  if (data.isActive !== undefined && data.isActive !== user.isActive) {
    if (!data.isActive) {
      const check = await canDeactivateUser(id);
      if (!check.allowed) return { success: false, error: check.reason };
    }
    updates.isActive = data.isActive;

    await logAudit({
      userId: editorId,
      action: data.isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
      entityType: "user",
      entityId: id,
      metadata: { username: user.username },
    });
  }

  await db.users.update(id, updates);
  return { success: true };
}

export async function deactivateUser(
  id: string,
  editorId: string
): Promise<{ success: boolean; error?: string }> {
  const check = await canDeactivateUser(id);
  if (!check.allowed) return { success: false, error: check.reason };

  return updateUser(id, { isActive: false }, editorId);
}

/* ------------------------------------------------------------------ */
/*  Permissions                                                        */
/* ------------------------------------------------------------------ */

export async function getUserPermissions(userId: string): Promise<string[]> {
  await ensureDbReady();
  
  const user = await db.users.get(userId);
  if (!user) return [];

  const rolePerms = await db.rolePermissions.where("roleId").equals(user.roleId).toArray();
  return rolePerms.map((rp) => rp.permissionKey);
}

/* ------------------------------------------------------------------ */
/*  Self-Protection Checks                                             */
/* ------------------------------------------------------------------ */

export async function canDeactivateUser(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  await ensureDbReady();
  
  const user = await db.users.get(userId);
  if (!user) return { allowed: false, reason: "User not found." };

  const role = await db.roles.get(user.roleId);
  if (role?.name !== SYSTEM_ROLES.ADMIN) return { allowed: true };

  const activeAdmins = await db.users
    .filter((u) => u.isActive !== false && u.roleId === user.roleId)
    .count();

  if (activeAdmins <= 1) {
    return {
      allowed: false,
      reason: "Cannot deactivate the last active administrator. There must be at least one active admin.",
    };
  }
  return { allowed: true };
}

export async function canChangeRole(
  userId: string,
  newRoleId: string
): Promise<{ allowed: boolean; reason?: string }> {
  await ensureDbReady();
  
  const user = await db.users.get(userId);
  if (!user) return { allowed: false, reason: "User not found." };

  if (user.roleId === newRoleId) return { allowed: true };

  const currentRole = await db.roles.get(user.roleId);
  const newRole = await db.roles.get(newRoleId);

  if (currentRole?.name === SYSTEM_ROLES.ADMIN && newRole?.name !== SYSTEM_ROLES.ADMIN) {
    const activeAdmins = await db.users
      .filter((u) => u.isActive !== false && u.roleId === user.roleId)
      .count();

    if (activeAdmins <= 1) {
      return {
        allowed: false,
        reason: "Cannot remove the last active administrator from the ADMIN role. Promote another user first.",
      };
    }
  }
  return { allowed: true };
}

export async function getActiveAdminCount(): Promise<number> {
  await ensureDbReady();
  
  const adminRole = await db.roles.where("name").equals(SYSTEM_ROLES.ADMIN).first();
  if (!adminRole) return 0;
  return db.users.filter((u) => u.isActive !== false && u.roleId === adminRole.id!).count();
}