"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getRequiredPermission } from "@/lib/permissions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading, firstRun } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  // Open DB
  useEffect(() => {
    import("@/lib/offline/db")
      .then(({ db }) => db.open())
      .catch(() => {});
  }, []);

  // Register SW
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Route permission check
  const requiredPerms = getRequiredPermission(pathname);
  if (requiredPerms && !requiredPerms.some((p) => session.permissions.includes(p))) {
    return (
      <AppShell>
        <PermissionDenied onBack={() => router.push("/dashboard")} />
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}