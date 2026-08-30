"use client";

import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Package, Truck } from "lucide-react";
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
  ReportLoading,
} from "../components/shared";
import {
  getReturnReportData,
  getReturnSummary,
  getReportFilterOptions,
  getDefaultReturnFilters,
  type ReturnReportRow,
  type ReturnReportFilters,
  type ReportFilterOptions,
} from "@/lib/offline/report-repository";
import { exportReportToCsv, type CsvColumn } from "@/lib/report-utils";
import { formatDateShort, type DatePreset } from "@/lib/date-utils";
import { useAuth } from "@/lib/auth/auth-context";

const columns: CsvColumn[] = [
  { key: "date", header: "Date", transform: (v) => (v instanceof Date ? formatDateShort(v) : "") },
  { key: "convoyName", header: "Convoy" },
  { key: "medicineName", header: "Medicine" },
  { key: "genericName", header: "Generic Name" },
  { key: "batchNumber", header: "Batch" },
  { key: "quantity", header: "Quantity Returned" },
  { key: "destinationCarton", header: "Destination Carton" },
  { key: "userName", header: "User" },
];

export default function ReturnsReportPage() {
  const { session } = useAuth();
  const [data, setData] = useState<ReturnReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReturnReportFilters>(getDefaultReturnFilters());
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ReportFilterOptions | null>(null);
  const [exportState, setExportState] = useState<"idle" | "preparing" | "ready" | "error">("idle");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getReturnReportData({ ...filters, search });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => { getReportFilterOptions().then(setOptions); }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const updateFilter = <K extends keyof ReturnReportFilters>(key: K, value: ReturnReportFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    if (!session) return;
    setExportState("preparing");
    const result = await exportReportToCsv("returns", columns, data as unknown as Record<string, unknown>[], session.userId);
    setExportState(result.success ? "ready" : "error");
    setTimeout(() => setExportState("idle"), 3000);
  };

  if (loading && data.length === 0) return <ReportLoading />;
  const summary = getReturnSummary(data);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Returns Report"
        description="Medicine returns from convoys back to warehouse stock."
        action={<ExportButton state={exportState} onExport={handleExport} />}
      />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <StatCard title="Total Returned" value={summary.totalReturned} icon={RotateCcw} variant="success" />
        <StatCard title="Return Count" value={summary.returnCount} icon={Package} variant="default" />
        <StatCard title="Convoys" value={summary.convoyCount} icon={Truck} variant="info" />
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
          <SearchInput value={search} onChange={setSearch} placeholder="Search medicine..." />
        </div>
        {options && (
          <ReportSelect value={filters.convoyId} onValueChange={(v) => updateFilter("convoyId", v)} options={options.convoys.map((c) => ({ value: c.id, label: c.name }))} placeholder="All Convoys" width="w-[160px]" />
        )}
      </FilterSection>

      {data.length === 0 ? (
        <EmptyState icon={RotateCcw} title="No returns found" description="No return records match your current filters." />
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {data.map((row) => (
              <Card key={row.id} className={row.convoyId ? "cursor-pointer hover:bg-muted/30" : ""} onClick={row.convoyId ? () => window.location.href = `/convoys/${row.convoyId}` : undefined}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{row.medicineName}</p>
                      <p className="text-xs text-muted-foreground">{row.genericName}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600 tabular-nums">+{row.quantity}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div><span className="text-muted-foreground">Date: </span>{formatDateShort(row.date)}</div>
                    <div><span className="text-muted-foreground">Convoy: </span>{row.convoyName || "—"}</div>
                    {row.batchNumber && <div><span className="text-muted-foreground">Batch: </span>{row.batchNumber}</div>}
                    {row.destinationCarton && <div><span className="text-muted-foreground">Carton: </span>{row.destinationCarton}</div>}
                    {row.userName && <div><span className="text-muted-foreground">User: </span>{row.userName}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden md:block rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Convoy</TableHead>
                  <TableHead className="text-xs">Medicine</TableHead>
                  <TableHead className="text-xs">Generic Name</TableHead>
                  <TableHead className="text-xs">Batch</TableHead>
                  <TableHead className="text-xs text-right">Quantity</TableHead>
                  <TableHead className="text-xs">Carton</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id} className={row.convoyId ? "cursor-pointer" : ""} onClick={row.convoyId ? () => window.location.href = `/convoys/${row.convoyId}` : undefined}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDateShort(row.date)}</TableCell>
                    <TableCell className="text-xs">{row.convoyName || "—"}</TableCell>
                    <TableCell className="text-xs font-medium">{row.medicineName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.genericName}</TableCell>
                    <TableCell className="text-xs">{row.batchNumber || "—"}</TableCell>
                    <TableCell className="text-xs text-right font-medium text-green-600 tabular-nums">+{row.quantity}</TableCell>
                    <TableCell className="text-xs">{row.destinationCarton || "—"}</TableCell>
                    <TableCell className="text-xs">{row.userName || "—"}</TableCell>
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