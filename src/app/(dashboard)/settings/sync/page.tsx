"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import {
  getSyncStatus,
  subscribeSyncStatus,
  syncNow,
  reconcileData,
  retryAllFailed,
  getPendingOperationsUI,
  getFailedOperationsUI,
} from "@/lib/sync/engine";

export default function SyncSettingsPage() {
  const [status, setStatus] = useState(getSyncStatus());
  const [pendingOps, setPendingOps] = useState<any[]>([]);
  const [failedOps, setFailedOps] = useState<any[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);

  useEffect(() => {
    const unsub = subscribeSyncStatus(setStatus);
    return unsub;
  }, []);

  const loadOps = async () => {
    setPendingOps(await getPendingOperationsUI());
    setFailedOps(await getFailedOperationsUI());
  };

  useEffect(() => {
    loadOps();
    const interval = setInterval(loadOps, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async () => {
    await syncNow();
    await loadOps();
  };

  const handleReconcile = async () => {
    if (!confirm("This will reset local sync cursors and re-download all server data to fix missing records. Continue?")) return;
    setIsReconciling(true);
    try {
      await reconcileData();
      await loadOps();
    } finally {
      setIsReconciling(false);
    }
  };

  const handleRetryFailed = async () => {
    await retryAllFailed();
    await loadOps();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Synchronization Settings</h1>
        <p className="text-muted-foreground">Manage local data and server sync status.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sync Status</CardTitle>
            <CardDescription>Current synchronization state of this device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection</span>
              {status.isOnline ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Online</Badge>
              ) : (
                <Badge variant="destructive">Offline</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">State</span>
              {status.state === "syncing" ? (
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Syncing...
                </Badge>
              ) : status.state === "error" ? (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Error
                </Badge>
              ) : (
                <Badge variant="outline">
                  <CheckCircle className="h-3 w-3 mr-1" /> Idle
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Sync</span>
              <span className="text-sm text-muted-foreground">
                {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"}
              </span>
            </div>
            {status.errorMessage && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {status.errorMessage}
              </div>
            )}
            <Button onClick={handleSyncNow} disabled={status.state === "syncing"} className="w-full">
              {status.state === "syncing" ? "Syncing..." : "Sync Now"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operations Queue</CardTitle>
            <CardDescription>Pending and failed operations on this device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Pending</span>
              <Badge variant="secondary">{status.pendingCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Failed</span>
              <Badge variant={status.failedCount > 0 ? "destructive" : "secondary"}>{status.failedCount}</Badge>
            </div>
            {status.failedCount > 0 && (
              <Button onClick={handleRetryFailed} variant="outline" className="w-full">
                Retry Failed ({status.failedCount})
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" /> Data Reconciliation
          </CardTitle>
          <CardDescription>
            If this device is missing historical stock records that exist on the server, use this tool to reset local cursors and safely re-download all missing data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleReconcile} disabled={isReconciling || status.state === "syncing"} variant="outline">
            {isReconciling ? "Reconciling..." : "Reconcile Local Data"}
          </Button>
        </CardContent>
      </Card>

      {failedOps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Failed Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {failedOps.map(op => (
              <div key={op.operationId} className="flex flex-col p-2 border rounded text-sm">
                <span className="font-medium">{op.operationType} {op.entityType}</span>
                <span className="text-xs text-destructive">{op.error}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}