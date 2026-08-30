"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Truck, CheckCircle, Clock, FileEdit, Package, ArrowDown, ArrowUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FilterSection,
  DateRangeFilter,
  ReportSelect,
  ExportButton,
  ConvoyStatusBadge,
  ReportLoading,
} from "../components/shared";
import {
  getConvoyReportData,
  getConvoySummary,
  getDefaultConvoyFilters,
  type ConvoyReportRow,
  type ConvoyReportFilters,
} from "@/lib/offline/report-repository";
import { exportReportToCsv, type CsvColumn } from "@/lib/report-utils";
import { formatDateOnly, type DatePreset } from "@/lib/date-utils";
import { useAuth } from "@/lib/auth/auth-context";

const columns: CsvColumn[] = [
  { key: "name", header: "Convoy" },
  { key: "date", header: "Date" },
  { key: "location", header: "Location" },
  { key: "status", header: "Status" },
  { key: "medicineCount", header: "Medicines" },
  { key: "unitsTaken", header: "Units Taken" },
  { key: "unitsDispensed", header: "Units Dispensed" },
  { key: "unitsReturned", header: "Units Returned" },
  { key: "remaining", header: "Remaining" },
  { key: "reconciliationStatus", header: "Reconciliation" },
];

export default function ConvoysReportPage() {
  const { session } = useAuth();
  const [data, setData] = useState<ConvoyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ConvoyReportFilters>(getDefaultConvoyFilters());
  const [exportState, setExportState] = useState<"idle" | "preparing" | "ready" | "error">("idle");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getConvoyReportData(filters);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateFilter = <K extends keyof ConvoyReportFilters>(key: K, value: ConvoyReportFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    if (!session) return;
    setExportState("preparing");
    const result = await exportReportToCsv("convoys", columns, data as unknown as Record<string, unknown>[], session.userId);
    setExportState(result.success ? "ready" : "error");
    setTimeout(() => setExportState("idle"), 3000);
  };

  if (loading && data.length === 0) return <ReportLoading />;
  const summary = getConvoySummary(data);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Convoys Report"
        description="Convoy status, dispensing, returns, and reconciliation summary."
        action={<ExportButton state={exportState} onExport={handleExport} />}
      />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard title="Total" value={summary.totalConvoys} icon={Truck} variant="default" />
        <StatCard title="Draft" value={summary.draft} icon={FileEdit} variant="default" />
        <StatCard title="Active" value={summary.active} icon={Clock} variant="warning" />
        <StatCard title="Completed" value={summary.completed} icon={CheckCircle} variant="success" />
        <StatCard title="Taken" value={summary.totalTaken} icon={ArrowUp} variant="danger" />
        <StatCard title="Dispensed" value={summary.totalDispensed} icon={Package} variant="warning" />
        <StatCard title="Returned" value={summary.totalReturned} icon={ArrowDown} variant="success" />
      </div>

      <FilterSection>
        <DateRangeFilter
          preset={filters.datePreset}
          from={filters.dateFrom}
          to={filters.dateTo}
          onPresetChange={(v) => updateFilter("datePreset", v as DatePreset)}
          onFromChange={(v) => updateFilter("dateFrom", v)}
          onToChange={(v) => updateFilter("dateTo", v)}
        />
        <ReportSelect
          value={filters.status}
          onValueChange={(v) => updateFilter("status", v)}
          options={[
            { value: "DRAFT", label: "Draft" },
            { value: "ACTIVE", label: "Active" },
            { value: "COMPLETED", label: "Completed" },
          ]}
          placeholder="All Status"
          width="w-[140px]"
        />
        <div className="w-[160px]">
          <SearchInput value={filters.location} onChange={(v) => updateFilter("location", v)} placeholder="Location..." />
        </div>
      </FilterSection>

      {data.length === 0 ? (
        <EmptyState icon={Truck} title="No convoys found" description="No convoys match your current filters." />
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {data.map((row) => (
              <Link key={row.id} href={`/convoys/${row.id}`}>
                <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.location} — {formatDateOnly(new Date(row.date))}</p>
                      </div>
                      <ConvoyStatusBadge status={row.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div><span className="text-muted-foreground">Medicines: </span>{row.medicineCount}</div>
                      <div><span className="text-muted-foreground">Taken: </span>{row.unitsTaken}</div>
                      <div><span className="text-muted-foreground">Dispensed: </span>{row.unitsDispensed}</div>
                      <div><span className="text-muted-foreground">Returned: </span>{row.unitsReturned}</div>
                      <div><span className="text-muted-foreground">Remaining: </span><span className="font-medium">{row.remaining}</span></div>
                      <div className="text-[10px] text-muted-foreground">{row.reconciliationStatus}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="hidden md:block rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Convoy</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Medicines</TableHead>
                  <TableHead className="text-xs text-right">Taken</TableHead>
                  <TableHead className="text-xs text-right">Dispensed</TableHead>
                  <TableHead className="text-xs text-right">Returned</TableHead>
                  <TableHead className="text-xs text-right">Remaining</TableHead>
                  <TableHead className="text-xs">Reconciliation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => window.location.href = `/convoys/${row.id}`}>
                    <TableCell className="text-xs font-medium">{row.name}</TableCell>
                    <TableCell className="text-xs">{formatDateOnly(new Date(row.date))}</TableCell>
                    <TableCell className="text-xs">{row.location}</TableCell>
                    <TableCell><ConvoyStatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.medicineCount}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.unitsTaken}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.unitsDispensed}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.unitsReturned}</TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums">{row.remaining}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.reconciliationStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground text-right">{data.length} records</p>
        </>
      )}
    </div>
  );
}