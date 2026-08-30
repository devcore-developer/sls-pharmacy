import { db, ensureDbReady } from "./db";
import { PERMISSIONS, SYSTEM_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/permissions";
import type { SystemRole, PermissionKey } from "@/lib/permissions";
import { logAudit } from "./audit-repository";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RoleListItem {
  id: string;
  name: string;
  label: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
}

export interface RoleDetail extends RoleListItem {
  permissions: PermissionKey[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoleFormData {
  name: string;
  label: string;
  description: string;
  permissions: PermissionKey[];
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export async function getAllRoles(): Promise<RoleListItem[]> {
  await ensureDbReady();
  
  const roles = await db.roles.orderBy("name").toArray();
  const users = await db.users.toArray();

  const results: RoleListItem[] = [];
  for (const role of roles) {
    const permCount = await db.rolePermissions.where("roleId").equals(role.id!).count();
    const userCount = users.filter((u) => u.roleId === role.id).length;
    results.push({
      id: role.id!,
      name: role.name,
      label: role.label,
      description: role.description,
      isSystem: role.isSystem,
      userCount,
      permissionCount: permCount,
    });
  }
  return results;
}

export async function getRoleById(id: string): Promise<RoleDetail | null> {
  await ensureDbReady();
  
  const role = await db.roles.get(id);
  if (!role) return null;

  const rolePerms = await db.rolePermissions.where("roleId").equals(id).toArray();
  const permissions = rolePerms.map((rp) => rp.permissionKey as PermissionKey);
  const users = await db.users.toArray();
  const userCount = users.filter((u) => u.roleId === id).length;

  return {
    id: role.id!,
    name: role.name,
    label: role.label,
    description: role.description,
    isSystem: role.isSystem,
    userCount,
    permissionCount: permissions.length,
    permissions,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

export async function getRolePermissions(roleId: string): Promise<PermissionKey[]> {
  await ensureDbReady();
  
  const rolePerms = await db.rolePermissions.where("roleId").equals(roleId).toArray();
  return rolePerms.map((rp) => rp.permissionKey as PermissionKey);
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export async function updateRolePermissions(
  roleId: string,
  permissionKeys: PermissionKey[],
  editorId: string
): Promise<{ success: boolean; error?: string }> {
  await ensureDbReady();
  
  const role = await db.roles.get(roleId);
  if (!role) return { success: false, error: "Role not found." };

  await db.transaction("rw", [db.rolePermissions, db.syncOperations], async () => {
    await db.rolePermissions.where("roleId").equals(roleId).delete();
    if (permissionKeys.length > 0) {
      await db.rolePermissions.bulkAdd(
        permissionKeys.map((key) => ({
          id: crypto.randomUUID(),
          roleId,
          permissionKey: key,
        }))
      );
    }
  });

  await logAudit({
    userId: editorId,
    action: "ROLE_PERMISSIONS_UPDATED",
    entityType: "role",
    entityId: roleId,
    metadata: { roleName: role.name, permissionCount: permissionKeys.length },
  });

  return { success: true };
}

export async function createCustomRole(
  data: CreateRoleFormData,
  creatorId: string
): Promise<{ success: boolean; error?: string }> {
  await ensureDbReady();
  
  if (!data.name.trim()) return { success: false, error: "Role name is required." };
  if (!data.label.trim()) return { success: false, error: "Role display name is required." };

  const existing = await db.roles.where("name").equals(data.name.trim().toUpperCase()).first();
  if (existing) return { success: false, error: "A role with this name already exists." };

  const now = new Date();
  const id = crypto.randomUUID();

  await db.transaction("rw", [db.roles, db.rolePermissions], async () => {
    await db.roles.add({
      id,
      name: data.name.trim().toUpperCase(),
      label: data.label.trim(),
      description: data.description.trim(),
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    });

    if (data.permissions.length > 0) {
      await db.rolePermissions.bulkAdd(
        data.permissions.map((key) => ({
          id: crypto.randomUUID(),
          roleId: id,
          permissionKey: key,
        }))
      );
    }
  });

  await logAudit({
    userId: creatorId,
    action: "ROLE_CREATED",
    entityType: "role",
    entityId: id,
    metadata: { name: data.name.trim(), permissionCount: data.permissions.length },
  });

  return { success: true };
}