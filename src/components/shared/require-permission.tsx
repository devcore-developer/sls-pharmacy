"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { PermissionDenied } from "@/components/shared/permission-denied";
import type { PermissionKey } from "@/lib/permissions";

interface RequirePermissionProps {
  permissions: PermissionKey[];
  children: React.ReactNode;
  requireAll?: boolean;
}

export function RequirePermission({ permissions, children, requireAll = false }: RequirePermissionProps) {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return null;

  const allowed = requireAll
    ? permissions.every((p) => session.permissions.includes(p))
    : permissions.some((p) => session.permissions.includes(p));

  if (!allowed) return <PermissionDenied />;

  return <>{children}</>;
}