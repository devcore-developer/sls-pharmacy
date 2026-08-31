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
  const { session, loading, hasPermission, hasAnyPermission } = useAuth();

  if (loading) return null;
  if (!session) return null;

  // Use context functions which handle ADMIN role properly
  const allowed = requireAll
    ? permissions.every((p) => hasPermission(p))
    : hasAnyPermission(permissions);

  if (!allowed) return <PermissionDenied />;

  return <>{children}</>;
}