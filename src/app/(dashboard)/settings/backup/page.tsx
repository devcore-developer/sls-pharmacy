"use client";

import { useState, useRef } from "react";
import { Download, Upload, AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createBackup, downloadBackup, validateBackup, restoreBackup, type RestoreResult } from "@/lib/backup";
import { logAudit } from "@/lib/offline/audit-repository";
import { useAuth } from "@/lib/auth/auth-context";

export default function BackupPage() {
  const { session } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<string | null>(null);

  const handleExport = async () => {
    if (!session) return;
    setExporting(true);
    setResult(null);
    try {
      const json = await createBackup();
      downloadBackup(json);
      await logAudit({ userId: session.userId, action: "BACKUP_EXPORTED", entityType: "backup", metadata: { size: json.length } });
      setResult({ type: "success", message: "Backup exported successfully." });
    } catch (err) {
      setResult({ type: "error", message: err instanceof Error ? err.message : "Export failed." });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPendingBackup(text);
      setConfirmOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleRestore = async () => {
    if (!pendingBackup || !session) return;
    setImporting(true);
    setResult(null);
    try {
      const validation = validateBackup(pendingBackup);
      if (!validation.valid || !validation.data) {
        setResult({ type: "error", message: validation.error || "Invalid backup file." });
        setConfirmOpen(false);
        setPendingBackup(null);
        return;
      }

      const res: RestoreResult = await restoreBackup(validation.data);
      if (res.success) {
        const countsStr = res.counts ? Object.entries(res.counts).map(([k, v]) => `${k}: ${v}`).join(", ") : "";
        await logAudit({ userId: session.userId, action: "BACKUP_RESTORED", entityType: "backup", metadata: { counts: res.counts, warnings: res.warnings } });
        setResult({ type: "success", message: `Restore successful. ${countsStr}` });
      } else {
        setResult({ type: "error", message: res.error || "Restore failed." });
      }
    } catch (err) {
      setResult({ type: "error", message: err instanceof Error ? err.message : "Restore failed." });
    } finally {
      setImporting(false);
      setConfirmOpen(false);
      setPendingBackup(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Backup & Restore" description="Export and import local pharmacy data." />

      {result && (
        <Alert variant={result.type === "error" ? "destructive" : "default"} className={result.type === "success" ? "border-green-200 bg-green-50 text-green-800" : ""}>
          {result.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4" /> Export Backup</CardTitle>
            <CardDescription className="text-xs">Download a complete backup of all local pharmacy data as a JSON file.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={exporting} className="gap-2 w-full sm:w-auto">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Preparing..." : "Export Backup"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" /> Import Backup</CardTitle>
            <CardDescription className="text-xs">Restore pharmacy data from a previously exported backup file.</CardDescription>
          </CardHeader>
          <CardContent>
            <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing} className="gap-2 w-full sm:w-auto">
              <Upload className="h-4 w-4" />
              Select Backup File
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Safety Information</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>• An emergency backup is automatically created before any restore operation.</p>
          <p>• Backup files are validated before import. Invalid or corrupt files will be rejected.</p>
          <p>• All references (medicines, batches, cartons, convoys) are checked for integrity.</p>
          <p>• Restore replaces all local data. This cannot be undone except by restoring another backup.</p>
          <p>• Sessions are not included in backups for security reasons.</p>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!open) { setConfirmOpen(false); setPendingBackup(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Confirm Restore</DialogTitle>
            <DialogDescription className="text-sm">
              This will replace the current local pharmacy data. An emergency backup will be created automatically before restoring.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setPendingBackup(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleRestore} disabled={importing} className="gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {importing ? "Restoring..." : "Restore Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}