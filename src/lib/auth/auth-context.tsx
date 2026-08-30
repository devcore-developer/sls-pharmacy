"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { SessionData } from "@/lib/auth/session";
import {
  validateSession,
  createSession,
  destroySession,
  isFirstRun,
} from "@/lib/auth/session";
import { seedRolesAndPermissions } from "@/lib/offline/seed-roles-permissions";
import {
  authenticateUser,
  getUserPermissions,
} from "@/lib/offline/user-repository";
import { logAudit } from "@/lib/offline/audit-repository";
import type { PermissionKey } from "@/lib/permissions";

interface AuthContextValue {
  session: SessionData | null;
  loading: boolean;
  firstRun: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstRun, setFirstRun] = useState(false);

  const refreshSession = useCallback(async () => {
    // Skip during SSR / static generation — IndexedDB not available
    if (typeof window === "undefined") return;

    setLoading(true);
    try {
      await seedRolesAndPermissions();
      const isFR = await isFirstRun();
      setFirstRun(isFR);
      if (!isFR) {
        const s = await validateSession();
        setSession(s);
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error("Session validation failed:", err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      if (typeof window === "undefined") return { success: false, error: "Authentication not available." };

      const result = await authenticateUser(username, password);
      if (!result.success) return result;

      const userId = result.user!.id as string;
      const permissions = await getUserPermissions(userId);
      const s = await createSession({
        id: userId,
        username: result.user!.username,
        roleName: result.roleName!,
        permissions,
      });
      setSession(s);
      setFirstRun(false);

      await logAudit({
        userId: userId,
        action: "LOGIN",
        entityType: "session",
        entityId: s.id,
      });

      return { success: true };
    },
    []
  );

  const logout = useCallback(async () => {
    const currentSession = session;
    if (currentSession) {
      await logAudit({
        userId: currentSession.userId,
        action: "LOGOUT",
        entityType: "session",
        entityId: currentSession.id,
      });
    }
    await destroySession();
    setSession(null);
  }, [session]);

  const hasPermission = useCallback(
    (permission: PermissionKey) => {
      return session?.permissions.includes(permission) ?? false;
    },
    [session]
  );

  const hasAnyPermission = useCallback(
    (permissions: PermissionKey[]) => {
      return permissions.some((p) => session?.permissions.includes(p)) ?? false;
    },
    [session]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        firstRun,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}