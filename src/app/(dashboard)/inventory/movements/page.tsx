// src/app/(dashboard)/inventory/movements/page.tsx

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  SlidersHorizontal,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { FilterChip, ClearAllFilters } from "@/app/(dashboard)/medicines/components/filter-chip";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getStockMovements,
} from "@/lib/offline/stock-movement-repository";
import { formatDate } from "@/lib/utils";
import { MovementDetailSheet } from "../components/movement-detail-sheet";
import { MovementFilters as MovementFiltersPanel } from "../components/movement-filters";
import type { MovementFilters, StockMovementListItem } from "@/types";
import { DEFAULT_MOVEMENT_FILTERS } from "@/types";

const dirColors: Record<string, string> = {
  IN: "text-success",
  OUT: "text-destructive",
  NEUTRAL: "text-muted-foreground",
};

const dirIcons: Record<string, React.ElementType> = {
  IN: ArrowUpCircle,
  OUT: ArrowDownCircle,
  NEUTRAL: MinusCircle,
};

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MovementFilters>(DEFAULT_MOVEMENT_FILTERS);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(
    null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStockMovements(filters);
      setMovements(data);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.datePreset !== "all") count++;
    if (filters.medicineSearch) count++;
    if (filters.batchSearch) count++;
    if (filters.type !== "all") count++;
    if (filters.convoyId !== "all") count++;
    return count;
  }, [filters]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (filters.datePreset !== "all") {
      const labels: Record<string, string> = {
        today: "Today",
        last_7: "Last 7 Days",
        last_30: "Last 30 Days",
        custom: "Custom Range",
      };
      chips.push({
        key: "date",
        label: `Date: ${labels[filters.datePreset] || filters.datePreset}`,
        onRemove: () =>
          setFilters((f) => ({
            ...f,
            datePreset: "all",
            dateFrom: null,
            dateTo: null,
          })),
      });
    }
    if (filters.medicineSearch) {
      chips.push({
        key: "med",
        label: `Medicine: ${filters.medicineSearch}`,
        onRemove: () => setFilters((f) => ({ ...f, medicineSearch: "" })),
      });
    }
    if (filters.batchSearch) {
      chips.push({
        key: "batch",
        label: `Batch: ${filters.batchSearch}`,
        onRemove: () => setFilters((f) => ({ ...f, batchSearch: "" })),
      });
    }
    if (filters.type !== "all") {
      chips.push({
        key: "type",
        label: `Type: ${filters.type.replace(/_/g, " ")}`,
        onRemove: () => setFilters((f) => ({ ...f, type: "all" })),
      });
    }
    if (filters.convoyId !== "all") {
      chips.push({
        key: "convoy",
        label: "Convoy filter",
        onRemove: () => setFilters((f) => ({ ...f, convoyId: "all" })),
      });
    }
    return chips;
  }, [filters]);

  function clearAll() {
    setFilters(DEFAULT_MOVEMENT_FILTERS);
  }

  if (loading) return <LoadingState message="Loading movements..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        description="View and audit all medicine inventory activity."
      />

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          onClick={() => setShowFilterSheet(true)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px] font-semibold"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {activeChips.length > 0 && (
          <>
            {activeChips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                onRemove={chip.onRemove}
              />
            ))}
            <ClearAllFilters onClear={clearAll} />
          </>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          {movements.length} movement{movements.length !== 1 ? "s" : ""}
        </span>
      </div>

      {movements.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No stock movements found"
          description={
            activeCount > 0
              ? "No movements match these filters."
              : "No stock movements yet."
          }
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="pr-6">User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const DirIcon = dirIcons[m.direction] || MinusCircle;
                  return (
                    <TableRow
                      key={m.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedMovementId(m.id)}
                    >
                      <TableCell className="pl-6 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(m.date)}
                      </TableCell>
                      <TableCell className="font-medium text-foreground text-sm">
                        {m.medicineName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {m.batchNumber || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {m.typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium tabular-nums ${
                          dirColors[m.direction]
                        }`}
                      >
                        {m.direction === "IN" ? "+" : m.direction === "OUT" ? "-" : ""}
                        {m.quantity}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <DirIcon
                            className={`h-3.5 w-3.5 ${dirColors[m.direction]}`}
                          />
                          <span className="text-xs">{m.direction}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.convoyName || m.reason || "—"}
                      </TableCell>
                      <TableCell className="pr-6 text-xs text-muted-foreground">
                        {m.userName || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {movements.map((m) => {
              const DirIcon = dirIcons[m.direction] || MinusCircle;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMovementId(m.id)}
                  className="w-full text-left rounded-lg border p-3 space-y-2 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">
                      {m.medicineName}
                    </span>
                    <span
                      className={`text-sm font-semibold tabular-nums shrink-0 ${dirColors[m.direction]}`}
                    >
                      {m.direction === "IN" ? "+" : m.direction === "OUT" ? "-" : ""}
                      {m.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {m.typeLabel}
                    </Badge>
                    {m.batchNumber && (
                      <span className="font-mono">{m.batchNumber}</span>
                    )}
                    <span className="ml-auto">{formatDate(m.date)}</span>
                  </div>
                  {(m.convoyName || m.reason) && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {m.convoyName || m.reason}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Filter Sheet */}
      <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Movement Filters</SheetTitle>
            <SheetDescription>
              Filter stock movement history.
            </SheetDescription>
          </SheetHeader>
          <MovementFiltersPanel
            filters={filters}
            onChange={setFilters}
            onClear={clearAll}
            activeCount={activeCount}
          />
        </SheetContent>
      </Sheet>

      <MovementDetailSheet
        movementId={selectedMovementId}
        open={selectedMovementId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMovementId(null);
        }}
      />
    </div>
  );
}