"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, UserCheck, UserX, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { RequirePermission } from "@/components/shared/require-permission";
import { getAllUsers, type UserListItem } from "@/lib/offline/user-repository";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAllUsers().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const filtered = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.username.toLowerCase().includes(search.toLowerCase()) ||
          u.roleLabel.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  if (loading) return <LoadingState message="Loading users..." />;

  return (
    <RequirePermission permissions={["users.view"]}>
      <div className="space-y-6">
        <PageHeader
          title="Users"
          description={`${users.length} user${users.length !== 1 ? "s" : ""} registered`}
          action={
            <RequirePermission permissions={["users.create"]}>
              <Button onClick={() => router.push("/settings/users/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </RequirePermission>
          }
        />

        <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />

        {filtered.length === 0 ? (
          <EmptyState icon={UserX} title="No users found" description={search ? "Try a different search." : "No users have been created yet."} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto -mx-6 md:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Name</th>
                    <th className="pb-3 font-medium text-muted-foreground">Username</th>
                    <th className="pb-3 font-medium text-muted-foreground">Role</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground">Last Activity</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-accent/30 transition-colors">
                      <td className="py-3 font-medium text-foreground">{u.name}</td>
                      <td className="py-3 text-muted-foreground font-mono text-xs">{u.username}</td>
                      <td className="py-3">
                        <Badge variant="secondary" className="text-xs">{u.roleLabel}</Badge>
                      </td>
                      <td className="py-3">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600"><UserCheck className="h-3 w-3" /> Active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><UserX className="h-3 w-3" /> Inactive</span>
                        )}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">{u.lastActivityAt ? formatDate(u.lastActivityAt) : "—"}</td>
                      <td className="py-3 text-right">
                        <RequirePermission permissions={["users.update"]}>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/settings/users/${u.id}`)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </RequirePermission>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((u) => (
                <div key={u.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">@{u.username}</p>
                    </div>
                    <Badge variant={u.isActive ? "default" : "secondary"} className="text-[10px]">
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{u.roleLabel}</Badge>
                    <RequirePermission permissions={["users.update"]}>
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/settings/users/${u.id}`)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    </RequirePermission>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </RequirePermission>
  );
}