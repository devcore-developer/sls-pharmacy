"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Download, Package, Layers, Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  FilterSection,
  DateRangeFilter,
  ReportSelect,
  ExportButton,
  ReportLoading,
} from "../components/shared";
import {
  getReceivingReportData,
  getReceivingSummary,
  getDefaultReceivingFilters,
  type ReceivingReportRow,
  type ReceivingReportFilters,
} from "@/lib/offline/report-repository";
import { exportReportToCsv, type CsvColumn } from "@/lib/report-utils";
import { formatDateOnly, type DatePreset } from "@/lib/date-utils";
import { useAuth } from "@/lib/auth/auth-context";

const SOURCE_TYPES = [
  { value: "DONATION", label: "Donation" },
  { value: "SUPPLY", label: "Supply" },
  { value: "OTHER", label: "Other" },
];

const columns: CsvColumn[] = [
  { key: "receiptNumber", header: "Receipt Number" },
  { key: "date", header: "Date" },
  { key: "sourceType", header: "Source Type" },
  { key: "sourceName", header: "Source Name" },
  { key: "responsiblePerson", header: "Responsible Person" },
  { key: "medicineCount", header: "Medicines" },
  { key: "batchCount", header: "Batches" },
  { key: "totalUnits", header: "Total Units" },
];

export default function ReceivingReportPage() {
  const { session } = useAuth();
  const [data, setData] = useState<ReceivingReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReceivingReportFilters>(getDefaultReceivingFilters());
  const [search, setSearch] = useState("");
  const [exportState, setExportState] = useState<"idle" | "preparing" | "ready" | "error">("idle");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getReceivingReportData({ ...filters, search });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateFilter = <K extends keyof ReceivingReportFilters>(key: K, value: ReceivingReportFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    if (!session) return;
    setExportState("preparing");
    const result = await exportReportToCsv("receiving", columns, data as unknown as Record<string, unknown>[], session.userId);
    setExportState(result.success ? "ready" : "error");
    setTimeout(() => setExportState("idle"), 3000);
  };

  if (loading && data.length === 0) return <ReportLoading />;
  const summary = getReceivingSummary(data);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receiving Report"
        description="Stock receipts from donations, supplies, and other sources."
        action={<ExportButton state={exportState} onExport={handleExport} />}
      />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard title="Total Receipts" value={summary.totalReceipts} icon={Download} variant="default" />
        <StatCard title="Total Units" value={summary.totalUnits} icon={Package} variant="info" />
        <StatCard title="Total Batches" value={summary.totalBatches} icon={Layers} variant="default" />
        <StatCard title="This Month" value={summary.thisMonth} icon={Calendar} variant="success" />
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
        <div className="w-full sm:w-[200px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search receipt, source..." />
        </div>
        <ReportSelect value={filters.sourceType} onValueChange={(v) => updateFilter("sourceType", v)} options={SOURCE_TYPES} placeholder="All Sources" width="w-[140px]" />
      </FilterSection>

      {data.length === 0 ? (
        <EmptyState icon={Download} title="No receiving records found" description="No receipts match your current filters." />
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {data.map((row) => (
              <Link key={row.id} href={`/inventory/receiving/${row.id}`}>
                <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{row.receiptNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDateOnly(new Date(row.date))}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{row.sourceType}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div><span className="text-muted-foreground">Source: </span>{row.sourceName || "—"}</div>
                      <div><span className="text-muted-foreground">Person: </span>{row.responsiblePerson || "—"}</div>
                      <div><span className="text-muted-foreground">Medicines: </span>{row.medicineCount}</div>
                      <div><span className="text-muted-foreground">Units: </span><span className="font-medium">{row.totalUnits}</span></div>
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
                  <TableHead className="text-xs">Receipt #</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Source Type</TableHead>
                  <TableHead className="text-xs">Source Name</TableHead>
                  <TableHead className="text-xs">Responsible</TableHead>
                  <TableHead className="text-xs text-right">Medicines</TableHead>
                  <TableHead className="text-xs text-right">Batches</TableHead>
                  <TableHead className="text-xs text-right">Total Units</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => window.location.href = `/inventory/receiving/${row.id}`}>
                    <TableCell className="text-xs font-medium">{row.receiptNumber}</TableCell>
                    <TableCell className="text-xs">{formatDateOnly(new Date(row.date))}</TableCell>
                    <TableCell className="text-xs"><Badge variant="secondary" className="text-[10px]">{row.sourceType}</Badge></TableCell>
                    <TableCell className="text-xs">{row.sourceName || "—"}</TableCell>
                    <TableCell className="text-xs">{row.responsiblePerson || "—"}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.medicineCount}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.batchCount}</TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums">{row.totalUnits}</TableCell>
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