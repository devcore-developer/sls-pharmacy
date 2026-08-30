"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeftRight, ArrowDown, ArrowUp, Minus } from "lucide-react";
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
  DirectionBadge,
  ReportLoading,
} from "../components/shared";
import {
  getMovementReportData,
  getMovementSummary,
  getReportFilterOptions,
  getDefaultMovementFilters,
  type MovementReportRow,
  type MovementReportFilters,
  type ReportFilterOptions,
} from "@/lib/offline/report-repository";
import { exportReportToCsv, type CsvColumn } from "@/lib/report-utils";
import { formatDateShort, type DatePreset } from "@/lib/date-utils";
import { useAuth } from "@/lib/auth/auth-context";

const MOVEMENT_TYPES = [
  { value: "DONATION_IN", label: "Donation In" },
  { value: "CONVOY_OUT", label: "Convoy Out" },
  { value: "RETURN_TO_WAREHOUSE", label: "Return to Warehouse" },
  { value: "ADJUSTMENT_IN", label: "Adjustment In" },
  { value: "ADJUSTMENT_OUT", label: "Adjustment Out" },
  { value: "DISPENSE", label: "Dispensed" },
  { value: "DISPENSE_ADJUSTMENT", label: "Dispense Adjustment" },
];

const columns: CsvColumn[] = [
  { key: "date", header: "Date", transform: (v) => (v instanceof Date ? formatDateShort(v) : "") },
  { key: "medicineName", header: "Medicine" },
  { key: "genericName", header: "Generic Name" },
  { key: "batchNumber", header: "Batch" },
  { key: "typeLabel", header: "Movement Type" },
  { key: "quantity", header: "Quantity" },
  { key: "direction", header: "Direction" },
  { key: "convoyName", header: "Convoy" },
  { key: "receiptNumber", header: "Receipt" },
  { key: "userName", header: "User" },
  { key: "reason", header: "Reference" },
];

export default function MovementsReportPage() {
  const { session } = useAuth();
  const [data, setData] = useState<MovementReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MovementReportFilters>(getDefaultMovementFilters());
  const [search, setSearch] = useState("");
  const [batchSearch, setBatchSearch] = useState("");
  const [options, setOptions] = useState<ReportFilterOptions | null>(null);
  const [exportState, setExportState] = useState<"idle" | "preparing" | "ready" | "error">("idle");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMovementReportData({ ...filters, search, batchSearch });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [filters, search, batchSearch]);

  useEffect(() => { getReportFilterOptions().then(setOptions); }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const updateFilter = <K extends keyof MovementReportFilters>(key: K, value: MovementReportFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    if (!session) return;
    setExportState("preparing");
    const result = await exportReportToCsv("stock-movements", columns, data as unknown as Record<string, unknown>[], session.userId);
    setExportState(result.success ? "ready" : "error");
    setTimeout(() => setExportState("idle"), 3000);
  };

  if (loading && data.length === 0) return <ReportLoading />;
  const summary = getMovementSummary(data);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        description="Complete history of all stock movements, receipts, and adjustments."
        action={<ExportButton state={exportState} onExport={handleExport} />}
      />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard title="Total Movements" value={summary.totalMovements} icon={ArrowLeftRight} variant="default" />
        <StatCard title="Total In" value={summary.totalIn} icon={ArrowDown} variant="success" />
        <StatCard title="Total Out" value={summary.totalOut} icon={ArrowUp} variant="danger" />
        <StatCard title="Medicines" value={summary.uniqueMedicines} icon={Minus} variant="info" />
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
        <div className="w-full sm:w-[180px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Medicine..." />
        </div>
        <div className="w-[130px]">
          <SearchInput value={batchSearch} onChange={setBatchSearch} placeholder="Batch..." />
        </div>
        {options && (
          <>
            <ReportSelect value={filters.type} onValueChange={(v) => updateFilter("type", v)} options={MOVEMENT_TYPES} placeholder="All Types" width="w-[160px]" />
            <ReportSelect value={filters.convoyId} onValueChange={(v) => updateFilter("convoyId", v)} options={options.convoys.map((c) => ({ value: c.id, label: c.name }))} placeholder="All Convoys" width="w-[150px]" />
            <ReportSelect value={filters.userId} onValueChange={(v) => updateFilter("userId", v)} options={options.users.map((u) => ({ value: u.id, label: u.name }))} placeholder="All Users" width="w-[140px]" />
          </>
        )}
      </FilterSection>

      {data.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No stock movements found" description="No movements match your current filters." />
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {data.map((row) => (
              <Card key={row.id} className={row.convoyId ? "cursor-pointer hover:bg-muted/30" : ""} onClick={row.convoyId ? () => window.location.href = `/convoys/${row.convoyId}` : undefined}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{row.medicineName}</p>
                      <p className="text-xs text-muted-foreground">{row.typeLabel}</p>
                    </div>
                    <DirectionBadge direction={row.direction} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div><span className="text-muted-foreground">Date: </span>{formatDateShort(row.date)}</div>
                    <div><span className="text-muted-foreground">Qty: </span><span className="font-medium">{row.quantity}</span></div>
                    {row.batchNumber && <div><span className="text-muted-foreground">Batch: </span>{row.batchNumber}</div>}
                    {row.convoyName && <div><span className="text-muted-foreground">Convoy: </span>{row.convoyName}</div>}
                    {row.receiptNumber && <div><span className="text-muted-foreground">Receipt: </span>{row.receiptNumber}</div>}
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
                  <TableHead className="text-xs">Medicine</TableHead>
                  <TableHead className="text-xs">Generic Name</TableHead>
                  <TableHead className="text-xs">Batch</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs">Dir</TableHead>
                  <TableHead className="text-xs">Convoy</TableHead>
                  <TableHead className="text-xs">Receipt</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id} className={row.convoyId ? "cursor-pointer" : ""} onClick={row.convoyId ? () => window.location.href = `/convoys/${row.convoyId}` : undefined}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDateShort(row.date)}</TableCell>
                    <TableCell className="text-xs font-medium">{row.medicineName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.genericName}</TableCell>
                    <TableCell className="text-xs">{row.batchNumber || "—"}</TableCell>
                    <TableCell className="text-xs">{row.typeLabel}</TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums">{row.quantity}</TableCell>
                    <TableCell><DirectionBadge direction={row.direction} /></TableCell>
                    <TableCell className="text-xs">{row.convoyName || "—"}</TableCell>
                    <TableCell className="text-xs">{row.receiptNumber || "—"}</TableCell>
                    <TableCell className="text-xs">{row.userName || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.reason || "—"}</TableCell>
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