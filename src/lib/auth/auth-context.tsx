"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { SessionData } from "@/lib/auth/session";
import {
  validateSession,
  createSession,
  destroySession,
  isFirstRun,
} from "@/lib/auth/session";
import { ensureDbReady } from "@/lib/offline/db";
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
  const initializedRef = useRef(false);
  const refreshInProgressRef = useRef(false);

  const refreshSession = useCallback(async () => {
    // Skip during SSR / static generation
    if (typeof window === "undefined") return;

    // Prevent concurrent refresh calls (React Strict Mode, rapid navigation)
    if (refreshInProgressRef.current) return;
    refreshInProgressRef.current = true;

    setLoading(true);
    
    try {
      // CRITICAL: Ensure DB is fully open before ANY operations
      await ensureDbReady();
      
      // Seed roles and permissions (idempotent)
      await seedRolesAndPermissions();
      
      // SINGLE SOURCE OF TRUTH: Check if admin exists
      const isFR = await isFirstRun();
      
      // Only update state if not already initialized OR if this is the first time
      // This prevents React Strict Mode from causing flickering
      if (!initializedRef.current) {
        initializedRef.current = true;
        setFirstRun(isFR);
        
        if (!isFR) {
          const s = await validateSession();
          setSession(s);
        } else {
          setSession(null);
        }
      }
    } catch (err) {
      console.error("Session validation failed:", err);
      // On error, don't assume firstRun - check if we can determine state
      if (!initializedRef.current) {
        initializedRef.current = true;
        setSession(null);
        // Don't set firstRun to true on error - that's dangerous
        // Instead, keep it false and let user see login form
        setFirstRun(false);
      }
    } finally {
      setLoading(false);
      refreshInProgressRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      if (typeof window === "undefined") return { success: false, error: "Authentication not available." };

      await ensureDbReady();

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
      try {
        await logAudit({
          userId: currentSession.userId,
          action: "LOGOUT",
          entityType: "session",
          entityId: currentSession.id,
        });
      } catch {
        // Ignore audit log errors during logout
      }
    }
    await destroySession();
    setSession(null);
    // IMPORTANT: Do NOT set firstRun to true on logout
    // firstRun should only be true when there are NO users at all
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