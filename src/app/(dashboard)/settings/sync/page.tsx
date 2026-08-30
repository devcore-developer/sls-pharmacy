"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getSyncStatus,
  subscribeSyncStatus,
  syncNow,
  retryFailed,
  retryAllFailed,
  getPendingOperationsUI,
  getFailedOperationsUI,
  formatOperationLabel,
  type SyncOperationUI,
  type SyncStatus,
} from "@/lib/sync/engine";
import { formatDateShort } from "@/lib/date-utils";

const STATUS_VARIANT: Record<string, "default" | "warning" | "destructive" | "success" | "secondary"> = {
  pending: "warning",
  syncing: "default",
  synced: "success",
  failed: "destructive",
};

export default function SyncCenterPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [pending, setPending] = useState<SyncOperationUI[]>([]);
  const [failed, setFailed] = useState<SyncOperationUI[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [p, f] = await Promise.all([getPendingOperationsUI(), getFailedOperationsUI()]);
    setPending(p);
    setFailed(f);
  }, []);

  useEffect(() => {
    const unsub = subscribeSyncStatus(setSyncStatus);
    loadData();
    return unsub;
  }, [loadData]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setResult(null);
    const res = await syncNow();
    setSyncing(false);
    if (res.errors.length > 0) {
      setResult(`Synced ${res.synced}, ${res.failed} failed, ${res.conflicts} conflicts.`);
    } else if (res.synced > 0) {
      setResult(`Successfully synced ${res.synced} operation(s).`);
    } else {
      setResult("No pending operations to sync.");
    }
    await loadData();
  };

  const handleRetryAll = async () => {
    await retryAllFailed();
    setResult("Moved all failed operations to pending.");
    await loadData();
  };

  const handleRetryOne = async (opId: string) => {
    await retryFailed(opId);
    await loadData();
  };

  const status = syncStatus || getSyncStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sync Center"
        description="Monitor and manage offline data synchronization."
        action={
          <Button onClick={handleSyncNow} disabled={syncing || !status.isOnline} size="sm" className="gap-1.5">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {syncing ? "Syncing..." : !status.isOnline ? "You're Offline" : "Sync Now"}
          </Button>
        }
      />

      {!status.isOnline && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          You&apos;re offline. Changes will sync when you&apos;re back online.
        </div>
      )}

      {result && (
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          {result}
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard title="Status" value={status.isOnline ? "Online" : "Offline"} icon={status.isOnline ? CheckCircle2 : AlertCircle} variant={status.isOnline ? "success" : "danger"} />
        <StatCard title="Pending" value={status.pendingCount} icon={Clock} variant={status.pendingCount > 0 ? "warning" : "default"} />
        <StatCard title="Failed" value={status.failedCount} icon={AlertCircle} variant={status.failedCount > 0 ? "danger" : "default"} />
        <StatCard title="Last Sync" value={status.lastSyncAt ? formatDateShort(status.lastSyncAt) : "Never"} icon={RefreshCw} variant="info" />
      </div>

      {/* Failed Operations */}
      {failed.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Failed Operations</CardTitle>
            <Button variant="outline" size="sm" onClick={handleRetryAll} className="text-xs gap-1">
              <RefreshCw className="h-3 w-3" /> Retry All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Operation</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs">Retries</TableHead>
                    <TableHead className="text-xs">Error</TableHead>
                    <TableHead className="text-xs w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failed.map((op) => (
                    <TableRow key={op.operationId}>
                      <TableCell className="text-xs font-medium">{formatOperationLabel(op)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(op.createdAt)}</TableCell>
                      <TableCell className="text-xs tabular-nums">{op.retryCount}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate" title={op.error}>{op.error || "Unknown"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleRetryOne(op.operationId)} className="text-xs h-7">Retry</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Operations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Pending Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No pending operations.</p>
          ) : (
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Operation</TableHead>
                    <TableHead className="text-xs">Entity ID</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((op) => (
                    <TableRow key={op.operationId}>
                      <TableCell className="text-xs font-medium">{formatOperationLabel(op)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono text-[10px] max-w-[120px] truncate">{op.entityId}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(op.createdAt)}</TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[op.syncStatus] || "secondary"} className="text-[10px]">{op.syncStatus}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}