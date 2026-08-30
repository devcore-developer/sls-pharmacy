"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Activity, Package, Layers, ArrowDown, ArrowUp, RotateCcw, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpiryBadge, DirectionBadge, ReportLoading } from "../components/shared";
import {
  getMedicineActivityData,
  getReportFilterOptions,
  type MedicineActivityData,
  type ReportFilterOptions,
} from "@/lib/offline/report-repository";
import { formatDateShort } from "@/lib/date-utils";

export default function MedicineActivityPage() {
  const [options, setOptions] = useState<ReportFilterOptions | null>(null);
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [data, setData] = useState<MedicineActivityData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getReportFilterOptions().then(setOptions);
  }, []);

  const loadMedicine = useCallback(async (medicineId: string) => {
    if (!medicineId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const result = await getMedicineActivityData(medicineId);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedicine(selectedMedicine);
  }, [selectedMedicine, loadMedicine]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicine Activity"
        description="Detailed timeline of a specific medicine's stock activity."
      />

      <div className="w-full max-w-md">
        <Select value={selectedMedicine} onValueChange={setSelectedMedicine}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select a medicine..." />
          </SelectTrigger>
          <SelectContent>
            {options?.medicines.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.tradeName} {m.genericName !== m.tradeName && `(${m.genericName})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && <ReportLoading />}

      {!loading && !data && selectedMedicine && (
        <EmptyState icon={Activity} title="Medicine not found" description="Could not load data for the selected medicine." />
      )}

      {!loading && !selectedMedicine && (
        <EmptyState icon={Activity} title="Select a medicine" description="Choose a medicine from the dropdown above to view its activity timeline." />
      )}

      {data && (
        <>
          {/* Summary */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <StatCard title="Current Stock" value={data.currentStock} icon={Package} variant={data.currentStock === 0 ? "danger" : data.currentStock <= 20 ? "warning" : "success"} />
            <StatCard title="Batches" value={data.batchCount} icon={Layers} variant="default" />
            <StatCard title="Receipts" value={data.receipts.length} icon={ArrowDown} variant="success" />
            <StatCard title="Convoy Transfers" value={data.convoyTransfers.length} icon={ArrowUp} variant="danger" />
          </div>

          {/* Batches */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Current Batches</CardTitle>
            </CardHeader>
            <CardContent>
              {data.batches.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active batches.</p>
              ) : (
                <div className="md:hidden space-y-2">
                  {data.batches.map((b) => (
                    <div key={b.batchId} className="flex items-center justify-between p-3 rounded-lg border text-xs">
                      <div className="space-y-1">
                        <p className="font-medium">{b.batchNumber}</p>
                        <p className="text-muted-foreground">Expiry: {formatDateShort(b.expiryDate)}</p>
                        <p className="text-muted-foreground">{b.cartonCode ? `Carton: ${b.cartonCode}` : "Unassigned"}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold tabular-nums">{b.quantity}</p>
                        <ExpiryBadge status={b.expiryStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="hidden md:block rounded-lg border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Batch</TableHead>
                      <TableHead className="text-xs">Expiry</TableHead>
                      <TableHead className="text-xs text-right">Quantity</TableHead>
                      <TableHead className="text-xs">Carton</TableHead>
                      <TableHead className="text-xs">Section</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.batches.map((b) => (
                      <TableRow key={b.batchId}>
                        <TableCell className="text-xs font-medium">{b.batchNumber}</TableCell>
                        <TableCell className="text-xs">{formatDateShort(b.expiryDate)}</TableCell>
                        <TableCell className="text-xs text-right font-medium tabular-nums">{b.quantity}</TableCell>
                        <TableCell className="text-xs">{b.cartonCode || "—"}</TableCell>
                        <TableCell className="text-xs">{b.sectionName || "—"}</TableCell>
                        <TableCell><ExpiryBadge status={b.expiryStatus} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {data.timeline.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity recorded for this medicine.</p>
              ) : (
                <div className="space-y-2">
                  {data.timeline.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${entry.convoyId ? "cursor-pointer hover:bg-muted/30" : ""}`}
                      onClick={entry.convoyId ? () => window.location.href = `/convoys/${entry.convoyId}` : entry.receiptId ? () => window.location.href = `/inventory/movements` : undefined}
                    >
                      <DirectionBadge direction={entry.direction} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{entry.typeLabel}</span>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {entry.quantity} {entry.direction === "IN" ? "in" : "out"}
                          </Badge>
                        </div>
                        {entry.details && <p className="text-muted-foreground mt-0.5">{entry.details}</p>}
                        {entry.batchNumber && <p className="text-muted-foreground">Batch: {entry.batchNumber}</p>}
                      </div>
                      <span className="text-muted-foreground whitespace-nowrap">{formatDateShort(entry.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}