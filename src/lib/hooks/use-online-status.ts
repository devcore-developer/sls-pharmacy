"use client";

import { useState, useEffect, useCallback } from "react";

export function useOnlineStatus(): {
  isOnline: boolean;
  lastChangedAt: Date | null;
} {
  const [isOnline, setIsOnline] = useState(true);
  const [lastChangedAt, setLastChangedAt] = useState<Date | null>(null);

  const handleStatusChange = useCallback(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    setLastChangedAt(new Date());
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleStatusChange);
    window.addEventListener("offline", handleStatusChange);

    return () => {
      window.removeEventListener("online", handleStatusChange);
      window.removeEventListener("offline", handleStatusChange);
    };
  }, [handleStatusChange]);

  return { isOnline, lastChangedAt };
}