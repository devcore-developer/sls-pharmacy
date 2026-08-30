"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Package, Pill, Layers, Box, AlertTriangle, XCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FilterSection,
  ReportSelect,
  ExportButton,
  ExpiryBadge,
  StockBadge,
  ReportLoading,
} from "../components/shared";
import {
  getInventoryReportData,
  getInventorySummary,
  getReportFilterOptions,
  getDefaultInventoryFilters,
  type InventoryReportRow,
  type InventoryReportFilters,
  type ReportFilterOptions,
} from "@/lib/offline/report-repository";
import { exportReportToCsv, type CsvColumn } from "@/lib/report-utils";
import { formatDateOnly } from "@/lib/date-utils";
import { useAuth } from "@/lib/auth/auth-context";

const columns: CsvColumn[] = [
  { key: "medicineName", header: "Medicine" },
  { key: "genericName", header: "Generic Name" },
  { key: "categoryNames", header: "Category", transform: (v) => (v as string[]).join(", ") },
  { key: "classNames", header: "Pharmacological Class", transform: (v) => (v as string[]).join(", ") },
  { key: "batchNumber", header: "Batch" },
  { key: "expiryDate", header: "Expiry", transform: (v) => (v instanceof Date ? formatDateOnly(v) : "") },
  { key: "cartonCode", header: "Carton" },
  { key: "sectionName", header: "Section" },
  { key: "currentQuantity", header: "Quantity" },
  { key: "stockStatus", header: "Stock Status" },
];

export default function InventoryReportPage() {
  const { session } = useAuth();
  const [data, setData] = useState<InventoryReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<InventoryReportFilters>(getDefaultInventoryFilters());
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ReportFilterOptions | null>(null);
  const [exportState, setExportState] = useState<"idle" | "preparing" | "ready" | "error">("idle");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getInventoryReportData({ ...filters, search });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    getReportFilterOptions().then(setOptions);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const updateFilter = <K extends keyof InventoryReportFilters>(key: K, value: InventoryReportFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    if (!session) return;
    setExportState("preparing");
    const result = await exportReportToCsv("inventory", columns, data as unknown as Record<string, unknown>[], session.userId);
    setExportState(result.success ? "ready" : "error");
    setTimeout(() => setExportState("idle"), 3000);
  };

  if (loading && data.length === 0) return <ReportLoading />;

  const summary = getInventorySummary(data);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Report"
        description="Current stock levels across all medicines, batches, and locations."
        action={<ExportButton state={exportState} onExport={handleExport} />}
      />

      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard title="Medicines" value={summary.totalMedicines} icon={Pill} variant="default" className="col-span-1" />
        <StatCard title="Batches" value={summary.totalBatches} icon={Layers} variant="default" className="col-span-1" />
        <StatCard title="Total Units" value={summary.totalUnits} icon={Package} variant="info" className="col-span-1" />
        <StatCard title="Low Stock" value={summary.lowStock} icon={AlertTriangle} variant="warning" className="col-span-1" />
        <StatCard title="Out of Stock" value={summary.outOfStock} icon={XCircle} variant="danger" className="col-span-1" />
        <StatCard title="Expiring Soon" value={summary.expiringSoon} icon={Clock} variant="warning" className="col-span-1" />
        <StatCard title="Expired" value={summary.expired} icon={XCircle} variant="danger" className="col-span-1" />
      </div>

      {/* Filters */}
      <FilterSection>
        <div className="w-full sm:w-[220px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search medicine..." />
        </div>
        {options && (
          <>
            <ReportSelect value={filters.categoryId} onValueChange={(v) => updateFilter("categoryId", v)} options={options.categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="All Categories" width="w-[150px]" />
            <ReportSelect value={filters.pharmacologicalClassId} onValueChange={(v) => updateFilter("pharmacologicalClassId", v)} options={options.pharmacologicalClasses.map((c) => ({ value: c.id, label: c.name }))} placeholder="All Classes" width="w-[150px]" />
            <ReportSelect value={filters.sectionId} onValueChange={(v) => updateFilter("sectionId", v)} options={options.sections.map((s) => ({ value: s.id, label: s.name }))} placeholder="All Sections" width="w-[150px]" />
            <ReportSelect value={filters.cartonId} onValueChange={(v) => updateFilter("cartonId", v)} options={options.cartons.map((c) => ({ value: c.id, label: `${c.code} — ${c.label}` }))} placeholder="All Cartons" width="w-[170px]" />
            <ReportSelect
              value={filters.stockStatus}
              onValueChange={(v) => updateFilter("stockStatus", v)}
              options={[
                { value: "in_stock", label: "In Stock" },
                { value: "low_stock", label: "Low Stock" },
                { value: "out_of_stock", label: "Out of Stock" },
              ]}
              placeholder="All Stock Status"
              width="w-[150px]"
            />
            <ReportSelect
              value={filters.expiryStatus}
              onValueChange={(v) => updateFilter("expiryStatus", v)}
              options={[
                { value: "expired", label: "Expired" },
                { value: "expiring_soon", label: "Expiring Soon" },
                { value: "valid", label: "Valid" },
              ]}
              placeholder="All Expiry Status"
              width="w-[150px]"
            />
          </>
        )}
      </FilterSection>

      {/* Data */}
      {data.length === 0 ? (
        <EmptyState icon={Package} title="No inventory records" description="No inventory records match your current filters." />
      ) : (
        <>
          {/* Mobile Cards */}
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
                      <StockBadge status={row.stockStatus} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div><span className="text-muted-foreground">Batch: </span>{row.batchNumber}</div>
                      <div><span className="text-muted-foreground">Qty: </span><span className="font-medium">{row.currentQuantity}</span></div>
                      <div><span className="text-muted-foreground">Expiry: </span>{formatDateOnly(row.expiryDate)}</div>
                      <div><span className="text-muted-foreground">Carton: </span>{row.cartonCode || "—"}</div>
                      <div><span className="text-muted-foreground">Section: </span>{row.sectionName || "—"}</div>
                      <div><ExpiryBadge status={row.expiryStatus} /></div>
                    </div>
                    {row.categoryNames.length > 0 && (
                      <p className="text-[10px] text-muted-foreground truncate">{row.categoryNames.join(", ")}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Medicine</TableHead>
                  <TableHead className="text-xs">Generic Name</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Class</TableHead>
                  <TableHead className="text-xs">Batch</TableHead>
                  <TableHead className="text-xs">Expiry</TableHead>
                  <TableHead className="text-xs">Carton</TableHead>
                  <TableHead className="text-xs">Section</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs">Stock</TableHead>
                  <TableHead className="text-xs">Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.batchId} className="cursor-pointer" onClick={() => window.location.href = `/medicines/${row.medicineId}`}>
                    <TableCell className="text-xs font-medium">{row.medicineName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.genericName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{row.categoryNames.join(", ") || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{row.classNames.join(", ") || "—"}</TableCell>
                    <TableCell className="text-xs">{row.batchNumber}</TableCell>
                    <TableCell className="text-xs">{formatDateOnly(row.expiryDate)}</TableCell>
                    <TableCell className="text-xs">{row.cartonCode || "—"}</TableCell>
                    <TableCell className="text-xs">{row.sectionName || "—"}</TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums">{row.currentQuantity}</TableCell>
                    <TableCell><StockBadge status={row.stockStatus} /></TableCell>
                    <TableCell><ExpiryBadge status={row.expiryStatus} /></TableCell>
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