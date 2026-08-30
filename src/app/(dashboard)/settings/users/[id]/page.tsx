"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { RequirePermission } from "@/components/shared/require-permission";
import { getUserById, updateUser, canDeactivateUser, canChangeRole, getActiveAdminCount } from "@/lib/offline/user-repository";
import { getAllRoles } from "@/lib/offline/role-repository";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate } from "@/lib/utils";
import type { UserDetail } from "@/lib/offline/user-repository";
import type { RoleListItem } from "@/lib/offline/role-repository";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { session } = useAuth();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [protectionWarning, setProtectionWarning] = useState("");

  useEffect(() => {
    Promise.all([getUserById(params.id), getAllRoles()]).then(([u, r]) => {
      if (u) {
        setUser(u);
        setName(u.name);
        setRoleId(u.roleId);
        setIsActive(u.isActive);
      }
      setRoles(r);
      setLoading(false);
    });
  }, [params.id]);

  const checkProtection = useCallback(async (newRoleId?: string) => {
    if (!user) return;
    const targetRoleId = newRoleId || roleId;
    if (user.roleId !== targetRoleId) {
      const check = await canChangeRole(user.id, targetRoleId);
      setProtectionWarning(check.allowed ? "" : check.reason ?? "");
    } else if (!isActive) {
      const check = await canDeactivateUser(user.id);
      setProtectionWarning(check.allowed ? "" : check.reason ?? "");
    } else {
      setProtectionWarning("");
    }
  }, [user, roleId, isActive]);

  useEffect(() => { checkProtection(); }, [checkProtection]);

  async function handleSave() {
    if (!user) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const updates: Parameters<typeof updateUser>[1] = { name: name.trim(), roleId };
      if (newPassword) updates.password = newPassword;
      if (isActive !== user.isActive) updates.isActive = isActive;

      const result = await updateUser(user.id, updates, session!.userId);
      if (result.success) {
        setSuccess("User updated successfully.");
        setNewPassword("");
        const refreshed = await getUserById(user.id);
        if (refreshed) setUser(refreshed);
      } else {
        setError(result.error ?? "Failed to update user.");
      }
    } catch {
      setError("An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState message="Loading user..." />;
  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="User Not Found" description="This user does not exist." />
        <Button variant="outline" onClick={() => router.push("/settings/users")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
        </Button>
      </div>
    );
  }

  const isSelf = session?.userId === user.id;

  return (
    <RequirePermission permissions={["users.update"]}>
      <div className="space-y-6 max-w-lg">
        <PageHeader
          title="Edit User"
          description={`@${user.username}`}
          action={
            <Button variant="outline" onClick={() => router.push("/settings/users")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          }
        />

        <form
          onSubmit={(e) => { e.preventDefault(); handleSave(); }}
          className="space-y-5 rounded-lg border p-5"
        >
          <div className="space-y-2">
            <Label htmlFor="editName">Full Name</Label>
            <Input id="editName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={user.username} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Username cannot be changed.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editRole">Role</Label>
            <Select value={roleId} onValueChange={(v) => { setRoleId(v); checkProtection(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editPassword">Reset Password</Label>
            <Input
              id="editPassword"
              type="password"
              placeholder="Leave empty to keep current password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Account Status</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inactive users cannot sign in.
              </p>
            </div>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className="cursor-pointer select-none"
              onClick={() => { setIsActive(!isActive); checkProtection(); }}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          {protectionWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">{protectionWarning}</p>
            </div>
          )}

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push("/settings/users")}>Cancel</Button>
            <Button type="submit" disabled={saving || !!protectionWarning}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>

        <div className="rounded-lg border p-4 space-y-2 text-xs text-muted-foreground">
          <p>Created: {formatDate(user.createdAt)}</p>
          <p>Updated: {formatDate(user.updatedAt)}</p>
          <p>Last Activity: {user.lastActivityAt ? formatDate(user.lastActivityAt) : "Never"}</p>
        </div>
      </div>
    </RequirePermission>
  );
}