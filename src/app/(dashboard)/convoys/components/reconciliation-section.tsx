"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  getItemReconciliation,
  getConvoyReconciliationStatus,
  updateItemReconciliation,
  completeReconciliation,
} from "@/lib/offline/convoy-item-repository";
import { formatDate } from "@/lib/utils";
import type { ConvoyItem, ReconciliationStatus } from "@/types";

interface Props {
  convoyId: string;
  items: ConvoyItem[];
  onUpdated: () => void;
}

function StatusPill({ status }: { status: ReconciliationStatus }) {
  const cfg: Record<ReconciliationStatus, { label: string; className: string }> = {
    PENDING: { label: "Pending", className: "bg-secondary text-secondary-foreground" },
    PARTIALLY_RECONCILED: { label: "Partial", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
    RECONCILED: { label: "Reconciled", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  };
  const c = cfg[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.className}`}>{c.label}</span>;
}

function SummaryBox({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${highlight ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

export function ReconciliationSection({ convoyId, items, onUpdated }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completing, setCompleting] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeError, setCompleteError] = useState("");

  if (items.length === 0) {
    return <EmptyState icon={CheckCircle2} title="No medicines to reconcile" description="This convoy has no items." />;
  }

  const overallStatus = getConvoyReconciliationStatus(items);
  const totalTaken = items.reduce((s, i) => s + i.quantityTaken, 0);
  const totalDispensed = items.reduce((s, i) => s + i.quantityDispensed, 0);
  const totalReturned = items.reduce((s, i) => s + i.quantityReturned, 0);
  const totalMissing = items.reduce((s, i) => s + i.quantityMissingOrDamaged, 0);
  const totalUnreconciled = items.reduce((s, i) => s + getItemReconciliation(i).unreconciled, 0);
  const allReconciled = overallStatus === "RECONCILED";
  const locked = items.every((i) => i.reconciledAt !== null);

  async function handleReturnedChange(itemId: string, value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const expected = item.quantityTaken - item.quantityDispensed;
    if (num < 0) { setErrors((p) => ({ ...p, [itemId]: "Cannot be negative" })); return; }
    if (num > expected) { setErrors((p) => ({ ...p, [itemId]: `Max: ${expected}` })); return; }
    setErrors((p) => { const n = { ...p }; delete n[itemId]; return n; });
    const res = await updateItemReconciliation(itemId, { quantityReturned: num });
    if (!res.success) { setErrors((p) => ({ ...p, [itemId]: res.error || "Error" })); return; }
    onUpdated();
  }

  async function handleMissingChange(itemId: string, value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const returnedSoFar = item.quantityReturned || 0;
    const expected = item.quantityTaken - item.quantityDispensed - returnedSoFar;
    if (num < 0) { setErrors((p) => ({ ...p, [itemId]: "Cannot be negative" })); return; }
    if (num > expected) { setErrors((p) => ({ ...p, [itemId]: `Max: ${expected}` })); return; }
    setErrors((p) => { const n = { ...p }; delete n[itemId]; return n; });
    const res = await updateItemReconciliation(itemId, { quantityMissingOrDamaged: num });
    if (!res.success) { setErrors((p) => ({ ...p, [itemId]: res.error || "Error" })); return; }
    onUpdated();
  }

  async function handleComplete() {
    setCompleteError("");
    setCompleting(true);
    const res = await completeReconciliation(convoyId);
    if (res.success) {
      setShowCompleteDialog(false);
      onUpdated();
    } else {
      setCompleteError(res.error || "Failed.");
    }
    setCompleting(false);
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Reconciliation Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SummaryBox label="Taken" value={totalTaken} />
          <SummaryBox label="Dispensed" value={totalDispensed} />
          <SummaryBox label="Returned" value={totalReturned} />
          <SummaryBox label="Missing/Damaged" value={totalMissing} />
          <SummaryBox label="Unreconciled" value={totalUnreconciled} highlight={totalUnreconciled > 0} />
        </div>
        <div className="flex items-center gap-2">
          {allReconciled ? (
            <><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-sm font-medium text-green-600">Fully Reconciled</span></>
          ) : overallStatus === "PENDING" ? (
            <><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Pending Reconciliation</span></>
          ) : (
            <><AlertTriangle className="h-4 w-4 text-amber-600" /><span className="text-sm font-medium text-amber-600">Partially Reconciled</span></>
          )}
        </div>
      </div>

      <Separator />

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto -mx-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Medicine</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Taken</TableHead>
              <TableHead className="text-right">Dispensed</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Returned</TableHead>
              <TableHead className="text-right">Missing/Dmg</TableHead>
              <TableHead className="text-right">Unreconciled</TableHead>
              <TableHead className="w-[90px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const { status, unreconciled, expectedRemaining } = getItemReconciliation(item);
              const isLocked = item.reconciledAt !== null;
              return (
                <TableRow key={item.id}>
                  <TableCell className="pl-6 font-medium text-foreground">{item.medicineName}</TableCell>
                  <TableCell className="font-mono text-xs">{item.batchNumber}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantityTaken}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantityDispensed}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{expectedRemaining}</TableCell>
                  <TableCell className="text-right p-0 pr-2">
                    <Input type="number" min={0} max={expectedRemaining} value={item.quantityReturned || ""}
                      disabled={isLocked} className="w-20 h-8 text-right text-sm tabular-nums"
                      onChange={(e) => handleReturnedChange(item.id, e.target.value)} />
                  </TableCell>
                  <TableCell className="text-right p-0 pr-2">
                    <Input type="number" min={0} max={expectedRemaining - item.quantityReturned} value={item.quantityMissingOrDamaged || ""}
                      disabled={isLocked} className="w-20 h-8 text-right text-sm tabular-nums"
                      onChange={(e) => handleMissingChange(item.id, e.target.value)} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{unreconciled > 0 ? unreconciled : "—"}</TableCell>
                  <TableCell><StatusPill status={isLocked ? "RECONCILED" : status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {items.map((item) => {
          const { status, unreconciled, expectedRemaining } = getItemReconciliation(item);
          const isLocked = item.reconciledAt !== null;
          return (
            <div key={item.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{item.medicineName}</p>
                  <p className="text-xs text-muted-foreground">Batch: {item.batchNumber}</p>
                </div>
                <StatusPill status={isLocked ? "RECONCILED" : status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Taken: <span className="text-foreground font-medium">{item.quantityTaken}</span></div>
                <div className="text-muted-foreground">Dispensed: <span className="text-foreground font-medium">{item.quantityDispensed}</span></div>
                <div className="text-muted-foreground">Expected: <span className="text-foreground font-medium">{expectedRemaining}</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground w-24 shrink-0">Returned</label>
                  <Input type="number" min={0} max={expectedRemaining} value={item.quantityReturned || ""}
                    disabled={isLocked} className="h-10 text-sm tabular-nums"
                    onChange={(e) => handleReturnedChange(item.id, e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground w-24 shrink-0">Missing/Dmg</label>
                  <Input type="number" min={0} max={expectedRemaining - item.quantityReturned} value={item.quantityMissingOrDamaged || ""}
                    disabled={isLocked} className="h-10 text-sm tabular-nums"
                    onChange={(e) => handleMissingChange(item.id, e.target.value)} />
                </div>
              </div>
              {errors[item.id] && <p className="text-xs text-destructive">{errors[item.id]}</p>}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unreconciled:</span>
                <span className={`font-bold tabular-nums ${unreconciled > 0 ? "text-destructive" : "text-green-600"}`}>{unreconciled > 0 ? unreconciled : "0 ✓"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Button */}
      {!allReconciled && !locked && (
        <div className="flex justify-end">
          <Button size="lg" onClick={() => setShowCompleteDialog(true)} disabled={completing}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {completing ? "Completing..." : "Complete Reconciliation"}
          </Button>
        </div>
      )}

      {locked && (
        <div className="rounded-lg border border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20 p-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">Reconciliation completed. Warehouse stock has been updated.</span>
        </div>
      )}

      {showCompleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCompleteDialog(false)}>
          <div className="bg-card rounded-lg border p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4">Complete Reconciliation</h3>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Taken</span><span className="font-medium">{totalTaken}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dispensed</span><span className="font-medium">{totalDispensed}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Returned</span><span className="font-medium">{totalReturned}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Missing/Damaged</span><span className="font-medium">{totalMissing}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground font-medium">Unreconciled</span><span className={`font-bold ${totalUnreconciled === 0 ? "text-green-600" : "text-destructive"}`}>{totalUnreconciled}</span></div>
            </div>
            {completeError && <p className="text-xs text-destructive mb-3">{completeError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleComplete} disabled={completing}>Complete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}