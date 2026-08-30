"use client";

import { useEffect, useState } from "react";
import { subscribeSyncStatus, type SyncStatus } from "@/lib/sync/engine";
import { cn } from "@/lib/utils";
import { Loader2, WifiOff, AlertCircle, CheckCircle2 } from "lucide-react";

export function SyncStatusIndicator({ className }: { className?: string }) {
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    const unsub = subscribeSyncStatus(setStatus);
    return unsub;
  }, []);

  if (!status) {
    return (
      <span className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        Loading...
      </span>
    );
  }

  if (status.state === "syncing") {
    return (
      <span className={cn("flex items-center gap-1.5 text-xs text-blue-600", className)} title={status.currentOperation || "Syncing..."}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="hidden sm:inline">Syncing{status.pendingCount > 0 ? ` ${status.pendingCount}...` : ""}...</span>
      </span>
    );
  }

  if (status.state === "error" && status.errorMessage) {
    return (
      <span className={cn("flex items-center gap-1.5 text-xs text-destructive cursor-pointer", className)} title={status.errorMessage}>
        <AlertCircle className="h-3 w-3" />
        <span className="hidden sm:inline">Sync failed</span>
      </span>
    );
  }

  if (!status.isOnline) {
    return (
      <span className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <WifiOff className="h-3 w-3" />
        <span className="hidden sm:inline">Offline</span>
      </span>
    );
  }

  if (status.pendingCount > 0) {
    return (
      <span className={cn("flex items-center gap-1.5 text-xs text-amber-600", className)} title={`${status.pendingCount} changes pending`}>
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <span className="hidden sm:inline">{status.pendingCount} pending</span>
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-1.5 text-xs text-green-600", className)}>
      <CheckCircle2 className="h-3 w-3" />
      <span className="hidden sm:inline">Online</span>
    </span>
  );
}