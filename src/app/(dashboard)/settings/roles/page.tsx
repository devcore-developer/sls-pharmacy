"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { RequirePermission } from "@/components/shared/require-permission";
import { getAllRoles, getRoleById, updateRolePermissions } from "@/lib/offline/role-repository";
import { getPermissionsByGroup, PERMISSION_GROUPS, type PermissionKey } from "@/lib/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABELS } from "@/lib/permissions";
import type { RoleListItem } from "@/lib/offline/role-repository";

export default function RolesPage() {
  const { session } = useAuth();
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, PermissionKey[]>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const permGroups = getPermissionsByGroup();
  const canManage = session?.permissions.includes("roles.manage") ?? false;

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    setLoading(true);
    const data = await getAllRoles();
    setRoles(data);
    setLoading(false);
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setEditPerms({});
      return;
    }
    const detail = await getRoleById(id);
    if (detail) {
      setExpandedId(id);
      setEditPerms({ [id]: [...detail.permissions] });
    }
  }

  function togglePerm(roleId: string, permKey: PermissionKey) {
    setEditPerms((prev) => {
      const current = prev[roleId] ?? [];
      const next = current.includes(permKey)
        ? current.filter((p) => p !== permKey)
        : [...current, permKey];
      return { ...prev, [roleId]: next };
    });
    setMessage(null);
  }

  async function handleSave(roleId: string) {
    setSaving(true);
    setMessage(null);
    try {
      const result = await updateRolePermissions(roleId, editPerms[roleId] ?? [], session!.userId);
      if (result.success) {
        setMessage({ type: "success", text: "Permissions updated." });
        await loadRoles();
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to save." });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState message="Loading roles..." />;

  return (
    <RequirePermission permissions={["roles.view"]}>
      <div className="space-y-6">
        <PageHeader
          title="Roles & Permissions"
          description={`${roles.length} role${roles.length !== 1 ? "s" : ""} configured`}
        />

        <div className="space-y-4">
          {roles.map((role) => {
            const isExpanded = expandedId === role.id;
            const currentPerms = editPerms[role.id] ?? [];

            return (
              <div key={role.id} className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => toggleExpand(role.id)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{role.label}</p>
                        {role.isSystem && (
                          <Badge variant="outline" className="text-[10px]">System</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{role.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {role.userCount}</span>
                        <span>{role.permissionCount} permissions</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {isExpanded ? "Collapse" : "View"}
                  </Badge>
                </button>

                {isExpanded && (
                  <>
                    <Separator />
                    <div className="p-4 sm:p-5 space-y-4">
                      {PERMISSION_GROUPS.map((group) => {
                        const groupPerms = permGroups[group.key];
                        if (!groupPerms || groupPerms.length === 0) return null;

                        return (
                          <div key={group.key}>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                              {group.label}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {groupPerms.map((perm) => {
                                const checked = currentPerms.includes(perm.key);
                                return (
                                  <label
                                    key={perm.key}
                                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs cursor-pointer transition-colors ${
                                      canManage
                                        ? "hover:bg-accent"
                                        : "cursor-default"
                                    } ${checked ? "text-foreground" : "text-muted-foreground"}`}
                                  >
                                    <div
                                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                        checked
                                          ? "bg-primary border-primary text-primary-foreground"
                                          : "border-muted-foreground/30"
                                      }`}
                                    >
                                      {checked && <Check className="h-3 w-3" />}
                                    </div>
                                    {perm.label}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {message && (
                        <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}>
                          {message.text}
                        </p>
                      )}

                      {canManage && (
                        <div className="flex justify-end pt-2">
                          <Button size="sm" onClick={() => handleSave(role.id)} disabled={saving}>
                            {saving ? "Saving..." : "Save Permissions"}
                          </Button>
                        </div>
                      )}

                      {!canManage && (
                        <p className="text-xs text-muted-foreground text-right">
                          Only administrators can modify role permissions.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </RequirePermission>
  );
}