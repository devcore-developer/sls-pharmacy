"use client";

import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function OnlineStatusIndicator({ className }: { className?: string }) {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        isOnline ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Offline — Changes saved locally</span>
          <span className="sm:hidden">Offline</span>
        </>
      )}
    </div>
  );
}