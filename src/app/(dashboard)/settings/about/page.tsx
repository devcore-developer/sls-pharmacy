"use client";
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
import { useState, useEffect } from "react";
import { Info, Database, Smartphone, RefreshCw, HardDrive, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_VERSION } from "@/lib/version";
import { getDeviceId } from "@/lib/offline/device-id";
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from "@/lib/sync/engine";
import { formatDateShort } from "@/lib/date-utils";
export default function AboutPage() {
  const [deviceId, setDeviceId] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [dbStatus, setDbStatus] = useState<"available" | "unavailable">("available");
  const [storageInfo, setStorageInfo] = useState<{ used: string; quota: string } | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setDeviceId(getDeviceId());
    const unsub = subscribeSyncStatus(setSyncStatus);
    return unsub;
  }, []);

  useEffect(() => {
    // Check DB
    import("@/lib/offline/db").then(({ db }) => db.categories.count().then(() => setDbStatus("available")).catch(() => setDbStatus("unavailable")));

    // Check storage
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => {
        const used = formatBytes(est.usage || 0);
        const quota = est.quota ? formatBytes(est.quota) : "Unknown";
        setStorageInfo({ used, quota });
      }).catch(() => {});
    }

    // PWA install
    const handler = (e: Event) => setInstallPrompt(e as BeforeInstallPromptEvent);
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const maskedDeviceId = deviceId ? deviceId.slice(0, 8) + "••••" + deviceId.slice(-4) : "—";

  return (
    <div className="space-y-6">
      <PageHeader title="About" description="Application information and system status." />

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Info className="h-4 w-4" /> Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">SLS Pharmacy</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-medium">{APP_VERSION}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><Badge variant="success" className="text-[10px]">Offline-First</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> Database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={dbStatus === "available" ? "success" : "destructive"} className="text-[10px]">{dbStatus === "available" ? "Available" : "Unavailable"}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">IndexedDB (Local)</span></div>
            {storageInfo && (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Storage Used</span><span className="font-medium">{storageInfo.used}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Storage Quota</span><span className="font-medium">{storageInfo.quota}</span></div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" /> Device</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Device ID</span><span className="font-mono font-medium">{maskedDeviceId}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Last Sync</span><span className="font-medium">{syncStatus?.lastSyncAt ? formatDateShort(syncStatus.lastSyncAt) : "Never"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pending</span><span className="font-medium">{syncStatus?.pendingCount ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Failed</span><span className="font-medium">{syncStatus?.failedCount ?? 0}</span></div>
          </CardContent>
        </Card>
      </div>

      {installPrompt && (
        <Card className="max-w-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><HardDrive className="h-4 w-4" /> Install App</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Install SLS Pharmacy as a standalone application on your device.</p>
            <button onClick={handleInstall} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              Install App →
            </button>
          </CardContent>
        </Card>
      )}

      <Card className="max-w-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Security</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p>• Passwords are hashed with PBKDF2 and never stored in plain text.</p>
          <p>• Audit logs are immutable and cannot be deleted through the UI.</p>
          <p>• Historical stock movements are append-only and never rewritten.</p>
          <p>• Backup imports are fully validated before applying.</p>
          <p>• All data is stored locally. No data is sent without explicit sync.</p>
        </CardContent>
      </Card>
    </div>
  );
}