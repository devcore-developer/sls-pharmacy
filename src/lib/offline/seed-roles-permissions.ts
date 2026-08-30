import { db, ensureDbReady } from "./db";
import { PERMISSIONS, ROLE_PERMISSIONS, SYSTEM_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/permissions";
import type { SystemRole } from "@/lib/permissions";
import { logAudit } from "./audit-repository";

let seeded = false;

export async function seedRolesAndPermissions(): Promise<void> {
  if (seeded) return;
  
  // Ensure DB is ready before seeding
  await ensureDbReady();

  const permCount = await db.permissions.count();
  if (permCount === 0) {
    await db.permissions.bulkAdd(
      PERMISSIONS.map((p) => ({
        id: crypto.randomUUID(),
        key: p.key,
        group: p.group,
        label: p.label,
        description: p.description,
      }))
    );
  }

  for (const roleKey of Object.values(SYSTEM_ROLES)) {
    const existing = await db.roles.where("name").equals(roleKey).first();
    if (!existing) {
      const roleId = crypto.randomUUID();
      const now = new Date();
      await db.roles.add({
        id: roleId,
        name: roleKey,
        label: ROLE_LABELS[roleKey as SystemRole],
        description: ROLE_DESCRIPTIONS[roleKey as SystemRole],
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      });

      const perms = ROLE_PERMISSIONS[roleKey as SystemRole];
      await db.rolePermissions.bulkAdd(
        perms.map((permKey) => ({
          id: crypto.randomUUID(),
          roleId,
          permissionKey: permKey,
        }))
      );
    }
  }

  seeded = true;
}

/**
 * Reset the seeded flag - useful for testing
 */
export function resetSeededFlag(): void {
  seeded = false;
}