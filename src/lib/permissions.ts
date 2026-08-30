/* ------------------------------------------------------------------ */
/*  Centralized Permission Definitions & Helpers                       */
/* ------------------------------------------------------------------ */

export const PERMISSION_GROUPS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "medicine", label: "Medicines" },
  { key: "inventory", label: "Inventory" },
  { key: "batch", label: "Batches" },
  { key: "carton", label: "Warehouse" },
  { key: "convoy", label: "Convoys" },
  { key: "reports", label: "Reports" },
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles" },
  { key: "settings", label: "Settings" },
] as const;

export type PermissionGroup = (typeof PERMISSION_GROUPS)[number]["key"];

export interface PermissionDefinition {
  key: string;
  group: PermissionGroup;
  label: string;
  description: string;
}

export const PERMISSIONS: PermissionDefinition[] = [
  { key: "dashboard.view", group: "dashboard", label: "View Dashboard", description: "Access the main dashboard" },
  { key: "medicine.view", group: "medicine", label: "View Medicines", description: "View medicine list and details" },
  { key: "medicine.create", group: "medicine", label: "Add Medicines", description: "Create new medicine entries" },
  { key: "medicine.update", group: "medicine", label: "Edit Medicines", description: "Update existing medicine information" },
  { key: "medicine.archive", group: "medicine", label: "Archive Medicines", description: "Archive or deactivate medicines" },
  { key: "inventory.view", group: "inventory", label: "View Inventory", description: "View inventory levels and details" },
  { key: "inventory.adjust", group: "inventory", label: "Adjust Stock", description: "Perform stock adjustments" },
  { key: "inventory.receive", group: "inventory", label: "Receive Stock", description: "Receive donations and supplies" },
  { key: "inventory.movements.view", group: "inventory", label: "View Movements", description: "View stock movement history" },
  { key: "batch.view", group: "batch", label: "View Batches", description: "View batch details" },
  { key: "batch.update", group: "batch", label: "Edit Batches", description: "Update batch information" },
  { key: "carton.view", group: "carton", label: "View Cartons", description: "View carton list and details" },
  { key: "carton.create", group: "carton", label: "Create Cartons", description: "Create new cartons" },
  { key: "carton.update", group: "carton", label: "Edit Cartons", description: "Update carton information" },
  { key: "carton.move", group: "carton", label: "Move Batches", description: "Move batches between cartons" },
  { key: "convoy.view", group: "convoy", label: "View Convoys", description: "View convoy list and details" },
  { key: "convoy.create", group: "convoy", label: "Create Convoys", description: "Create new convoys" },
  { key: "convoy.update", group: "convoy", label: "Edit Convoys", description: "Update convoy information" },
  { key: "convoy.dispense", group: "convoy", label: "Dispense", description: "Dispense medicines from convoys" },
  { key: "convoy.return", group: "convoy", label: "Process Returns", description: "Record medicine returns" },
  { key: "convoy.reconcile", group: "convoy", label: "Reconcile", description: "Reconcile convoy inventory" },
  { key: "reports.view", group: "reports", label: "View Reports", description: "Access reports page" },
  { key: "users.view", group: "users", label: "View Users", description: "View user list" },
  { key: "users.create", group: "users", label: "Create Users", description: "Create new user accounts" },
  { key: "users.update", group: "users", label: "Edit Users", description: "Edit user accounts" },
  { key: "users.deactivate", group: "users", label: "Deactivate Users", description: "Deactivate user accounts" },
  { key: "roles.view", group: "roles", label: "View Roles", description: "View role definitions" },
  { key: "roles.manage", group: "roles", label: "Manage Roles", description: "Create and edit roles and permissions" },
  { key: "settings.view", group: "settings", label: "View Settings", description: "Access settings page" },
  { key: "settings.manage", group: "settings", label: "Manage Settings", description: "Modify system settings" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

/* ------------------------------------------------------------------ */
/*  Role Definitions                                                   */
/* ------------------------------------------------------------------ */

export const SYSTEM_ROLES = {
  ADMIN: "ADMIN",
  PHARMACY_MANAGER: "PHARMACY_MANAGER",
  PHARMACY_STAFF: "PHARMACY_STAFF",
  VIEWER: "VIEWER",
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const ROLE_PERMISSIONS: Record<SystemRole, PermissionKey[]> = {
  ADMIN: [
    "dashboard.view",
    "medicine.view", "medicine.create", "medicine.update", "medicine.archive",
    "inventory.view", "inventory.adjust", "inventory.receive", "inventory.movements.view",
    "batch.view", "batch.update",
    "carton.view", "carton.create", "carton.update", "carton.move",
    "convoy.view", "convoy.create", "convoy.update", "convoy.dispense", "convoy.return", "convoy.reconcile",
    "reports.view",
    "users.view", "users.create", "users.update", "users.deactivate",
    "roles.view", "roles.manage",
    "settings.view", "settings.manage",
  ],
  PHARMACY_MANAGER: [
    "dashboard.view",
    "medicine.view", "medicine.create", "medicine.update", "medicine.archive",
    "inventory.view", "inventory.adjust", "inventory.receive", "inventory.movements.view",
    "batch.view", "batch.update",
    "carton.view", "carton.create", "carton.update", "carton.move",
    "convoy.view", "convoy.create", "convoy.update", "convoy.dispense", "convoy.return", "convoy.reconcile",
    "reports.view",
    "settings.view",
  ],
  PHARMACY_STAFF: [
    "dashboard.view",
    "medicine.view",
    "inventory.view",
    "batch.view",
    "carton.view",
    "convoy.view", "convoy.dispense", "convoy.return",
  ],
  VIEWER: [
    "dashboard.view",
    "medicine.view",
    "inventory.view", "inventory.movements.view",
    "batch.view",
    "carton.view",
    "convoy.view",
    "reports.view",
  ],
};

export const ROLE_LABELS: Record<SystemRole, string> = {
  ADMIN: "Administrator",
  PHARMACY_MANAGER: "Pharmacy Manager",
  PHARMACY_STAFF: "Pharmacy Staff",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  ADMIN: "Full access to all system features including user and role management.",
  PHARMACY_MANAGER: "Can manage medicines, inventory, convoys, and view reports.",
  PHARMACY_STAFF: "Can view inventory and work with convoy dispensing and returns.",
  VIEWER: "Read-only access to view inventory, medicines, and reports.",
};

/* ------------------------------------------------------------------ */
/*  Route → Permission Mapping                                         */
/* ------------------------------------------------------------------ */

export const ROUTE_PERMISSIONS: Record<string, PermissionKey[]> = {
  "/dashboard": ["dashboard.view"],
  "/medicines": ["medicine.view"],
  "/categories": ["medicine.view"],
  "/inventory": ["inventory.view"],
  "/inventory/receiving": ["inventory.view"],
  "/inventory/movements": ["inventory.movements.view"],
  "/inventory/cartons": ["carton.view"],
  "/inventory/warehouse": ["carton.view"],
  "/convoys": ["convoy.view"],
  "/reports": ["reports.view"],
  "/reports/inventory": ["reports.view"],
  "/reports/expiry": ["reports.view"],
  "/reports/movements": ["reports.view"],
  "/reports/convoys": ["reports.view"],
  "/reports/receiving": ["reports.view"],
  "/reports/dispensing": ["reports.view"],
  "/reports/returns": ["reports.view"],
  "/reports/medicine-activity": ["reports.view"],
  "/settings": ["settings.view"],
  "/settings/users": ["users.view"],
  "/settings/roles": ["roles.view"],
  "/settings/audit": ["users.view"],
  "/settings/sync": ["settings.view"],
  "/settings/backup": ["settings.view"],
  "/settings/data-integrity": ["settings.view"],
  "/settings/about": ["settings.view"],
};

export function getRequiredPermission(pathname: string): PermissionKey[] | null {
  if (ROUTE_PERMISSIONS[pathname]) return ROUTE_PERMISSIONS[pathname];
  const sorted = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
  for (const route of sorted) {
    if (pathname.startsWith(route + "/")) return ROUTE_PERMISSIONS[route];
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Pure Helpers (no auth context dependency)                          */
/* ------------------------------------------------------------------ */

export function permissionsInclude(userPermissions: string[], required: PermissionKey): boolean {
  return userPermissions.includes(required);
}

export function permissionsIncludeAny(userPermissions: string[], required: PermissionKey[]): boolean {
  return required.some((p) => userPermissions.includes(p));
}

export function permissionsIncludeAll(userPermissions: string[], required: PermissionKey[]): boolean {
  return required.every((p) => userPermissions.includes(p));
}

export function getPermissionLabel(key: string): string {
  return PERMISSIONS.find((p) => p.key === key)?.label ?? key;
}

export function getPermissionGroup(key: string): PermissionGroup {
  return PERMISSIONS.find((p) => p.key === key)?.group ?? "dashboard";
}

export function getPermissionsByGroup(): Record<PermissionGroup, PermissionDefinition[]> {
  const result: Record<string, PermissionDefinition[]> = {};
  for (const g of PERMISSION_GROUPS) {
    result[g.key] = PERMISSIONS.filter((p) => p.group === g.key);
  }
  return result as Record<PermissionGroup, PermissionDefinition[]>;
}