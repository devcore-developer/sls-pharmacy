"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { createFirstAdmin } from "@/lib/offline/user-repository";
import { PASSWORD_REQUIREMENTS, validatePassword } from "@/lib/auth/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, X, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { loading, firstRun, session, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace("/dashboard");
    }
  }, [loading, session, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim()) { setError("Please enter your username."); return; }
    setSubmitting(true);
    try {
      const result = await login(username.trim(), password);
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error ?? "Login failed.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!adminName.trim()) { setError("Name is required."); return; }
    if (!username.trim()) { setError("Username is required."); return; }

    const validation = validatePassword(password);
    if (!validation.valid) { setError(validation.errors.join(". ")); return; }

    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setSubmitting(true);
    try {
      const result = await createFirstAdmin({
        name: adminName.trim(),
        username: username.trim(),
        password,
      });
      if (result.success) {
        const loginResult = await login(username.trim(), password);
        if (loginResult.success) {
          router.push("/dashboard");
        } else {
          setError("Admin created but auto-login failed. Please sign in manually.");
        }
      } else {
        setError(result.error ?? "Failed to create administrator.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (session) return null;

  const isSetup = firstRun && !session;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl mb-4">
            SLS
          </div>
          <h1 className="text-xl font-bold text-foreground">SLS Pharmacy</h1>
          <p className="text-sm text-muted-foreground mt-1">Charity Pharmacy Management System</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            {isSetup ? (
              <>
                <CardTitle className="text-lg">Create Administrator</CardTitle>
                <CardDescription>No users found. Create the first admin account to get started.</CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-lg">Sign In</CardTitle>
                <CardDescription>Enter your credentials to access the system</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {isSetup ? (
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="adminName" className="text-sm font-medium text-foreground">Full Name <span className="text-destructive">*</span></label>
                  <Input id="adminName" placeholder="e.g. Ahmed Hassan" value={adminName} onChange={(e) => setAdminName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-2">
                  <label htmlFor="setupUsername" className="text-sm font-medium text-foreground">Username <span className="text-destructive">*</span></label>
                  <Input id="setupUsername" placeholder="e.g. ahmed" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="setupPassword" className="text-sm font-medium text-foreground">Password <span className="text-destructive">*</span></label>
                  <Input id="setupPassword" type="password" placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                  {password.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {PASSWORD_REQUIREMENTS.map((req) => {
                        const met = req.test(password);
                        return (
                          <li key={req.label} className={`flex items-center gap-1.5 text-xs ${met ? "text-green-600" : "text-muted-foreground"}`}>
                            {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {req.label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="setupConfirm" className="text-sm font-medium text-foreground">Confirm Password <span className="text-destructive">*</span></label>
                  <Input id="setupConfirm" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                </div>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Administrator"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium text-foreground">Username</label>
                  <Input id="username" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
                  <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                </div>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex items-start gap-2 rounded-lg bg-muted/60 p-3">
          <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isSetup
              ? "This is the first time the system is launched. Your password is securely hashed using PBKDF2 and stored locally."
              : "Offline authentication — credentials are verified locally. No internet connection required."}
          </p>
        </div>
      </div>
    </div>
  );
}