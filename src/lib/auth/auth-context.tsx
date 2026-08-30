"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { PermissionKey } from "@/lib/permissions";

export interface SessionData {
  id: string;
  userId: string;
  email: string;
  name: string;
  roleName: string;
  roleLabel: string;
  permissions: string[];
  createdAt: Date;
  expiresAt: Date;
}

interface AuthContextValue {
  session: SessionData | null;
  loading: boolean;
  needsSetup: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
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
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // First, try to get existing session (faster path for logged-in users)
        const sessionRes = await fetch("/api/auth/session");
        
        if (sessionRes.ok) {
          const data = await sessionRes.json();
          if (data.session && !cancelled) {
            setSession(data.session);
            setNeedsSetup(false);
            setLoading(false);
            return; // Exit early - user is logged in
          }
        }

        // No valid session - check if setup is needed
        const setupRes = await fetch("/api/auth/check-setup");
        if (setupRes.ok) {
          const data = await setupRes.json();
          if (!cancelled) {
            setNeedsSetup(data.needsSetup);
          }
        } else {
          if (!cancelled) setNeedsSetup(true);
        }
      } catch (error) {
        // Network error - try cached session for offline
        const cachedSession = localStorage.getItem("sls_cached_session");
        if (cachedSession && !cancelled) {
          try {
            const parsed = JSON.parse(cachedSession);
            const expiresAt = new Date(parsed.expiresAt);
            if (expiresAt > new Date()) {
              setSession(parsed);
              setNeedsSetup(false);
            }
          } catch {
            // Invalid cache
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      localStorage.setItem("sls_cached_session", JSON.stringify(data.user));
      setSession(data.user);
      setNeedsSetup(false);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Network error. Please check your internet connection.",
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors during logout
    }
    localStorage.removeItem("sls_cached_session");
    setSession(null);
  }, []);

  const hasPermission = useCallback(
    (permission: PermissionKey) => {
      if (session?.roleName === "ADMIN") return true;
      return session?.permissions.includes(permission) ?? false;
    },
    [session]
  );

  const hasAnyPermission = useCallback(
    (permissions: PermissionKey[]) => {
      if (session?.roleName === "ADMIN") return true;
      return permissions.some((p) => session?.permissions.includes(p)) ?? false;
    },
    [session]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        needsSetup,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}