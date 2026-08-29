"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { RequirePermission } from "@/components/shared/require-permission";
import { createUser } from "@/lib/offline/user-repository";
import { getAllRoles } from "@/lib/offline/role-repository";
import { PASSWORD_REQUIREMENTS, validatePassword } from "@/lib/auth/password";
import { useAuth } from "@/lib/auth/auth-context";
import type { RoleListItem } from "@/lib/offline/role-repository";

export default function NewUserPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState<RoleListItem[]>([]);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [roleId, setRoleId] = useState("");

  useEffect(() => {
    getAllRoles().then((data) => {
      setRoles(data);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Name is required."); return; }
    if (!username.trim()) { setError("Username is required."); return; }
    if (!roleId) { setError("Please select a role."); return; }

    const validation = validatePassword(password);
    if (!validation.valid) { setError(validation.errors.join(". ")); return; }

    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setSubmitting(true);
    try {
      const result = await createUser(
        { name: name.trim(), username: username.trim(), password, roleId },
        session!.userId
      );
      if (result.success) {
        router.push("/settings/users");
      } else {
        setError(result.error ?? "Failed to create user.");
      }
    } catch {
      setError("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState message="Loading..." />;

  return (
    <RequirePermission permissions={["users.create"]}>
      <div className="space-y-6 max-w-lg">
        <PageHeader
          title="Add User"
          description="Create a new user account."
          action={
            <Button variant="outline" onClick={() => router.push("/settings/users")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
            <Input id="name" placeholder="e.g. Fatima Ali" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
            <Input id="username" placeholder="e.g. fatima" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role <span className="text-destructive">*</span></Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
            <Input id="password" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            {password.length > 0 && (
              <ul className="space-y-1 mt-1">
                {PASSWORD_REQUIREMENTS.map((req) => {
                  const met = req.test(password);
                  return (
                    <li key={req.label} className={`flex items-center gap-1.5 text-xs ${met ? "text-green-600" : "text-muted-foreground"}`}>
                      {met ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 inline-block" />}
                      {req.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm Password <span className="text-destructive">*</span></Label>
            <Input id="confirm" type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push("/settings/users")}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </div>
    </RequirePermission>
  );
}