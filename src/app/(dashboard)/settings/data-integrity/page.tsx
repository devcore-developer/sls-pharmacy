"use client";

import { useState, useCallback } from "react";
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { runIntegrityChecks, type IntegrityCheck, type IntegrityResult } from "@/lib/integrity";
import { logAudit } from "@/lib/offline/audit-repository";
import { useAuth } from "@/lib/auth/auth-context";

const SEVERITY_ICON: Record<string, typeof CheckCircle2> = {
  PASS: CheckCircle2,
  WARNING: AlertTriangle,
  ERROR: XCircle,
};

const SEVERITY_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  PASS: "success",
  WARNING: "warning",
  ERROR: "destructive",
};

export default function DataIntegrityPage() {
  const { session } = useAuth();
  const [result, setResult] = useState<IntegrityResult | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(async () => {
    if (!session) return;
    setRunning(true);
    try {
      const res = await runIntegrityChecks();
      setResult(res);
      await logAudit({
        userId: session.userId,
        action: "INTEGRITY_CHECK",
        entityType: "system",
        metadata: { pass: res.summary.pass, warning: res.summary.warning, error: res.summary.error },
      });
    } finally {
      setRunning(false);
    }
  }, [session]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Integrity"
        description="Check for broken references, duplicate IDs, invalid quantities, and stock discrepancies."
        action={
          <Button onClick={handleRun} disabled={running} size="sm" className="gap-1.5">
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {running ? "Checking..." : "Run Integrity Check"}
          </Button>
        }
      />

      {result && (
        <>
          <div className="grid gap-3 grid-cols-3">
            <StatCard title="Passed" value={result.summary.pass} icon={CheckCircle2} variant="success" />
            <StatCard title="Warnings" value={result.summary.warning} icon={AlertTriangle} variant={result.summary.warning > 0 ? "warning" : "default"} />
            <StatCard title="Errors" value={result.summary.error} icon={XCircle} variant={result.summary.error > 0 ? "danger" : "default"} />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Check Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-[40px]"></TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">Severity</TableHead>
                      <TableHead className="text-xs">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.checks.map((check) => {
                      const Icon = SEVERITY_ICON[check.severity] || AlertCircle;
                      return (
                        <TableRow key={check.id}>
                          <TableCell><Icon className={`h-4 w-4 ${check.severity === "PASS" ? "text-green-600" : check.severity === "WARNING" ? "text-amber-600" : "text-destructive"}`} /></TableCell>
                          <TableCell className="text-xs font-medium">{check.category}</TableCell>
                          <TableCell className="text-xs">{check.description}</TableCell>
                          <TableCell><Badge variant={SEVERITY_VARIANT[check.severity] || "secondary"} className="text-[10px]">{check.severity}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate" title={check.details}>{check.details || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {result.summary.error > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Errors Detected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Integrity errors were found. Review the details above and consider restoring from a known-good backup if the data is corrupted.
                  Do NOT automatically fix negative stock — investigate the movement history first.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {!result && !running && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-6">
            <ShieldCheck className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">Run an Integrity Check</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Click the button above to scan your local database for broken references, duplicate IDs, and stock discrepancies.
          </p>
        </div>
      )}
    </div>
  );
}