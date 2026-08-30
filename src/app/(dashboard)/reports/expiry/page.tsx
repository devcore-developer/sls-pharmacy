"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle, XCircle, Clock, Package } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FilterSection,
  ReportSelect,
  ExportButton,
  ExpiryBadge,
  ReportLoading,
} from "../components/shared";
import {
  getExpiryReportData,
  getExpirySummary,
  getReportFilterOptions,
  getDefaultExpiryFilters,
  type ExpiryReportRow,
  type ExpiryReportFilters,
  type ReportFilterOptions,
} from "@/lib/offline/report-repository";
import { exportReportToCsv, type CsvColumn } from "@/lib/report-utils";
import { formatDateOnly } from "@/lib/date-utils";
import { useAuth } from "@/lib/auth/auth-context";

const EXPIRY_PRESETS = [
  { value: "all", label: "All" },
  { value: "expired", label: "Expired" },
  { value: "within_7", label: "Within 7 Days" },
  { value: "within_30", label: "Within 30 Days" },
  { value: "within_60", label: "Within 60 Days" },
  { value: "within_90", label: "Within 90 Days" },
  { value: "custom", label: "Custom Range" },
];

const columns: CsvColumn[] = [
  { key: "medicineName", header: "Medicine" },
  { key: "genericName", header: "Generic Name" },
  { key: "batchNumber", header: "Batch" },
  { key: "expiryDate", header: "Expiry Date", transform: (v) => (v instanceof Date ? formatDateOnly(v) : "") },
  { key: "daysRemaining", header: "Days Remaining" },
  { key: "currentQuantity", header: "Quantity" },
  { key: "cartonCode", header: "Carton" },
  { key: "sectionName", header: "Section" },
  { key: "status", header: "Status" },
];

export default function ExpiryReportPage() {
  const { session } = useAuth();
  const [data, setData] = useState<ExpiryReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ExpiryReportFilters>(getDefaultExpiryFilters());
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ReportFilterOptions | null>(null);
  const [exportState, setExportState] = useState<"idle" | "preparing" | "ready" | "error">("idle");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getExpiryReportData({ ...filters, search });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => { getReportFilterOptions().then(setOptions); }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const updateFilter = <K extends keyof ExpiryReportFilters>(key: K, value: ExpiryReportFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    if (!session) return;
    setExportState("preparing");
    const result = await exportReportToCsv("expiry", columns, data as unknown as Record<string, unknown>[], session.userId);
    setExportState(result.success ? "ready" : "error");
    setTimeout(() => setExportState("idle"), 3000);
  };

  if (loading && data.length === 0) return <ReportLoading />;
  const summary = getExpirySummary(data);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiry Report"
        description="Track expired and near-expiry batches across all inventory."
        action={<ExportButton state={exportState} onExport={handleExport} />}
      />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Expired" value={summary.expired} icon={XCircle} variant="danger" />
        <StatCard title="Within 7 Days" value={summary.within7} icon={AlertTriangle} variant="danger" />
        <StatCard title="Within 30 Days" value={summary.within30} icon={Clock} variant="warning" />
        <StatCard title="Within 60 Days" value={summary.within60} icon={Clock} variant="warning" />
        <StatCard title="Within 90 Days" value={summary.within90} icon={Clock} variant="warning" />
        <StatCard title="Total Units" value={summary.totalUnits} icon={Package} variant="default" />
      </div>

      <FilterSection>
        <div className="w-full sm:w-[220px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search medicine or batch..." />
        </div>
        <ReportSelect value={filters.preset} onValueChange={(v) => updateFilter("preset", v as import("@/lib/offline/report-repository").ExpiryFilterPreset)} options={EXPIRY_PRESETS} placeholder="All" width="w-[150px]" />
        {filters.preset === "custom" && (
          <div className="w-[120px]">
            <Input
              type="number"
              min={1}
              value={filters.customDays}
              onChange={(e) => updateFilter("customDays", parseInt(e.target.value) || 90)}
              className="h-9 text-xs"
              placeholder="Days"
            />
          </div>
        )}
        {options && (
          <>
            <ReportSelect value={filters.sectionId} onValueChange={(v) => updateFilter("sectionId", v)} options={options.sections.map((s) => ({ value: s.id, label: s.name }))} placeholder="All Sections" width="w-[150px]" />
            <ReportSelect value={filters.cartonId} onValueChange={(v) => updateFilter("cartonId", v)} options={options.cartons.map((c) => ({ value: c.id, label: `${c.code} — ${c.label}` }))} placeholder="All Cartons" width="w-[170px]" />
          </>
        )}
      </FilterSection>

      {data.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No expiry alerts found" description="No expiry records match your current filters." />
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {data.map((row) => (
              <Link key={row.batchId} href={`/medicines/${row.medicineId}`}>
                <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{row.medicineName}</p>
                        <p className="text-xs text-muted-foreground truncate">{row.genericName}</p>
                      </div>
                      <ExpiryBadge status={row.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div><span className="text-muted-foreground">Batch: </span>{row.batchNumber}</div>
                      <div><span className="text-muted-foreground">Qty: </span><span className="font-medium">{row.currentQuantity}</span></div>
                      <div><span className="text-muted-foreground">Expiry: </span>{formatDateOnly(row.expiryDate)}</div>
                      <div><span className="text-muted-foreground">Days: </span><span className={row.daysRemaining <= 0 ? "text-destructive font-medium" : row.daysRemaining <= 30 ? "text-amber-600 font-medium" : ""}>{row.daysRemaining <= 0 ? "Expired" : `${row.daysRemaining} days`}</span></div>
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
                  <TableHead className="text-xs">Medicine</TableHead>
                  <TableHead className="text-xs">Generic Name</TableHead>
                  <TableHead className="text-xs">Batch</TableHead>
                  <TableHead className="text-xs">Expiry Date</TableHead>
                  <TableHead className="text-xs text-right">Days Remaining</TableHead>
                  <TableHead className="text-xs text-right">Quantity</TableHead>
                  <TableHead className="text-xs">Carton</TableHead>
                  <TableHead className="text-xs">Section</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.batchId} className="cursor-pointer" onClick={() => window.location.href = `/medicines/${row.medicineId}`}>
                    <TableCell className="text-xs font-medium">{row.medicineName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.genericName}</TableCell>
                    <TableCell className="text-xs">{row.batchNumber}</TableCell>
                    <TableCell className="text-xs">{formatDateOnly(row.expiryDate)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      <span className={row.daysRemaining <= 0 ? "text-destructive font-medium" : row.daysRemaining <= 30 ? "text-amber-600 font-medium" : ""}>
                        {row.daysRemaining <= 0 ? "Expired" : row.daysRemaining}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums">{row.currentQuantity}</TableCell>
                    <TableCell className="text-xs">{row.cartonCode || "—"}</TableCell>
                    <TableCell className="text-xs">{row.sectionName || "—"}</TableCell>
                    <TableCell><ExpiryBadge status={row.status} /></TableCell>
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