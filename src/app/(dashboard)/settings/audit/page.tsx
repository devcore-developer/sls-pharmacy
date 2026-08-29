"use client";

import { useState, useEffect, useMemo } from "react";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { RequirePermission } from "@/components/shared/require-permission";
import { getAuditLogs, getAuditLogUsers, AUDIT_ACTIONS, type AuditLogEntry } from "@/lib/offline/audit-repository";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 30;

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("__all__");
  const [filterAction, setFilterAction] = useState("__all__");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [auditUsers, setAuditUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    getAuditLogUsers().then(setAuditUsers);
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(0);
    loadLogs();
  }, [filterUser, filterAction, dateFrom, dateTo]);

  function loadLogs(offset = 0) {
    getAuditLogs(
      {
        userId: filterUser !== "__all__" ? filterUser : undefined,
        action: filterAction !== "__all__" ? filterAction : undefined,
        dateFrom: dateFrom ? new Date(dateFrom) : null,
        dateTo: dateTo ? new Date(dateTo) : null,
      },
      { limit: PAGE_SIZE, offset }
    ).then((data) => {
      if (offset === 0) {
        setLogs(data.items);
      } else {
        setLogs((prev) => [...prev, ...data.items]);
      }
      setTotal(data.total);
      setLoading(false);
    });
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadLogs(nextPage * PAGE_SIZE);
  }

  const filtered = search
    ? logs.filter(
        (l) =>
          l.userName.toLowerCase().includes(search.toLowerCase()) ||
          l.action.toLowerCase().includes(search.toLowerCase()) ||
          l.entityType.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const hasMore = logs.length < total;

  if (loading && logs.length === 0) return <LoadingState message="Loading audit log..." />;

  return (
    <RequirePermission permissions={["users.view"]}>
      <div className="space-y-6">
        <PageHeader
          title="Audit Log"
          description={`${total} record${total !== 1 ? "s" : ""} — Read-only history`}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Hide Filters" : "Filters"}
            </Button>
          }
        />

        {showFilters && (
          <div className="rounded-lg border p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">User</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Users</SelectItem>
                  {auditUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Action</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Actions</SelectItem>
                  {AUDIT_ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Input type="date" className="text-xs h-9" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input type="date" className="text-xs h-9" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        )}

        <SearchInput value={search} onChange={setSearch} placeholder="Search logs..." />

        {filtered.length === 0 ? (
          <EmptyState icon={ScrollText} title="No audit records" description="No matching entries found." />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto -mx-6 md:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Date</th>
                    <th className="pb-3 font-medium text-muted-foreground">User</th>
                    <th className="pb-3 font-medium text-muted-foreground">Action</th>
                    <th className="pb-3 font-medium text-muted-foreground">Entity</th>
                    <th className="pb-3 font-medium text-muted-foreground">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-accent/30 transition-colors">
                      <td className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="py-2.5 text-foreground">{log.userName}</td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{log.entityType}</td>
                      <td className="py-2.5 text-xs text-muted-foreground font-mono max-w-[120px] truncate">{log.entityId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {filtered.map((log) => (
                <div key={log.id} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">{log.userName}</p>
                    <Badge variant="outline" className="text-[10px] font-mono">{log.action.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{log.entityType}</span>
                    {log.entityId && <span className="font-mono truncate">{log.entityId}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{formatDate(log.createdAt)}</p>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={loadMore}>
                  Load More ({total - logs.length} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </RequirePermission>
  );
}