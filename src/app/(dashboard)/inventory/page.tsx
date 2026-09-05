"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package,
  SlidersHorizontal,
  Plus,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { FilterChip, ClearAllFilters } from "@/app/(dashboard)/medicines/components/filter-chip";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getInventoryBatchData } from "@/lib/offline/inventory-repository";
import {
  getStockAvailability,
  getMovementTypeLabel,
  LOW_STOCK_THRESHOLD,
} from "@/lib/offline/stock-utils";
import { formatDate } from "@/lib/utils";
import { AdjustStockDialog } from "./components/adjust-stock-dialog";
import { AddStockDialog } from "./components/add-stock-dialog";
import type {
  InventoryBatchRow,
  PharmacologicalClassItem,
  StockAvailability,
  CartonItem,
} from "@/types";

interface InvFilters {
  expiry: string;
  category: string;
  pharmacologicalClass: string;
  carton: string;
  availability: string;
}

const DEFAULT_INV_FILTERS: InvFilters = {
  expiry: "all",
  category: "all",
  pharmacologicalClass: "all",
  carton: "all",
  availability: "all",
};

const stockStatusConfig: Record<
  StockAvailability,
  { label: string; className: string }
> = {
  in_stock: {
    label: "In Stock",
    className: "bg-success/10 text-success border-success/20",
  },
  low_stock: {
    label: `Low (≤${LOW_STOCK_THRESHOLD})`,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  out_of_stock: {
    label: "Out of Stock",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export default function InventoryPage() {
  const [data, setData] = useState<{
    rows: InventoryBatchRow[];
    categories: Array<{ id: string; name: string }>;
    pharmacologicalClasses: PharmacologicalClassItem[];
    cartons: CartonItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<InvFilters>(DEFAULT_INV_FILTERS);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [sortKey, setSortKey] = useState<"medicine" | "batch" | "qty" | "expiry">(
    "medicine"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getInventoryBatchData();
      setData(d as unknown as typeof data);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const rows = data.rows.filter((row) => {
      if (filters.expiry !== "all" && row.expiryStatus !== filters.expiry)
        return false;
      if (
        filters.category !== "all" &&
        !row.categoryIds.includes(filters.category)
      )
        return false;
      if (
        filters.pharmacologicalClass !== "all" &&
        !row.pharmacologicalClassIds.includes(filters.pharmacologicalClass)
      )
        return false;
      if (filters.carton !== "all" && row.cartonCode !== filters.carton)
        return false;
      if (filters.availability !== "all" && row.stockStatus !== filters.availability)
        return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !row.medicineName.toLowerCase().includes(q) &&
          !row.genericName.toLowerCase().includes(q) &&
          !row.batchNumber.toLowerCase().includes(q) &&
          !(row.cartonCode || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });

    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "medicine":
          cmp = a.medicineName.localeCompare(b.medicineName);
          break;
        case "batch":
          cmp = a.batchNumber.localeCompare(b.batchNumber);
          break;
        case "qty":
          cmp = a.currentQuantity - b.currentQuantity;
          break;
        case "expiry":
          cmp = a.expiryDate.getTime() - b.expiryDate.getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [data, search, filters, sortKey, sortDir]);

  const activeChips = useMemo(() => {
    const chips: { key: keyof InvFilters; label: string }[] = [];
    if (filters.expiry !== "all") {
      const l =
        filters.expiry === "expiring_soon"
          ? "Expiring Soon"
          : filters.expiry === "expired"
          ? "Expired"
          : "Valid";
      chips.push({ key: "expiry", label: `Expiry: ${l}` });
    }
    if (filters.category !== "all") {
      const cat = data?.categories.find((c) => c.id === filters.category);
      if (cat) chips.push({ key: "category", label: `Category: ${cat.name}` });
    }
    if (filters.pharmacologicalClass !== "all") {
      const cls = data?.pharmacologicalClasses.find(
        (c) => c.id === filters.pharmacologicalClass
      );
      if (cls)
        chips.push({ key: "pharmacologicalClass", label: `Class: ${cls.name}` });
    }
    if (filters.carton !== "all") {
      chips.push({ key: "carton", label: `Carton: ${filters.carton}` });
    }
    if (filters.availability !== "all") {
      const cfg = stockStatusConfig[filters.availability as StockAvailability];
      if (cfg) chips.push({ key: "availability", label: cfg.label });
    }
    return chips;
  }, [filters, data]);

  function setFilter<K extends keyof InvFilters>(key: K, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }
  function clearAll() {
    setFilters(DEFAULT_INV_FILTERS);
  }
  function removeChip(key: keyof InvFilters) {
    setFilters((prev) => ({ ...prev, [key]: "all" }));
  }
  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const activeCount = Object.values(filters).filter((v) => v !== "all").length;

  if (loading) return <LoadingState message="Loading inventory..." />;
  if (!data) return null;

  function SortHead({
    label,
    sortKey: sk,
    className,
  }: {
    label: string;
    sortKey: "medicine" | "batch" | "qty" | "expiry";
    className?: string;
  }) {
    const active = sortKey === sk;
    return (
      <TableHead
        className={`cursor-pointer select-none hover:text-foreground ${className || ""}`}
        onClick={() => toggleSort(sk)}
      >
        <div className="flex items-center gap-1">
          {label}
          <ArrowUpDown
            className={`h-3 w-3 ${active ? "text-foreground" : "text-muted-foreground/50"}`}
          />
        </div>
      </TableHead>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Track stock levels, batch details, and expiry status."
        action={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Stock
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdjustDialog(true)}>
              Adjust Stock
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search medicines, batches, cartons..."
          className="max-w-md flex-1"
        />
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
                onRemove={() => removeChip(chip.key)}
              />
            ))}
            <ClearAllFilters onClear={clearAll} />
          </>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} batch{filtered.length !== 1 ? "es" : ""} found
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory items found"
          description={
            search || activeCount > 0
              ? "No batches match these filters."
              : "No medicines with stock data yet."
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead label="Medicine" sortKey="medicine" className="pl-6" />
                  <TableHead>Generic Name</TableHead>
                  <SortHead label="Batch" sortKey="batch" />
                  <TableHead>Carton</TableHead>
                  <SortHead
                    label="Qty"
                    sortKey="qty"
                    className="text-right"
                  />
                  <SortHead label="Expiry" sortKey="expiry" />
                  <TableHead>Stock Status</TableHead>
                  <TableHead>Last Movement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const stCfg = stockStatusConfig[row.stockStatus];
                  return (
                    <TableRow key={row.batchId}>
                      <TableCell className="pl-6 font-medium text-foreground">
                        {row.medicineName}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.genericName}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.batchNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {row.cartonCode || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {row.currentQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(row.expiryDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${stCfg?.className || ""}`}
                        >
                          {stCfg?.label || row.stockStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.lastMovement ? (
                          <span>
                            {getMovementTypeLabel(row.lastMovement.type)} ·{" "}
                            {formatDate(row.lastMovement.date)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((row) => {
              const stCfg = stockStatusConfig[row.stockStatus];
              return (
                <div key={row.batchId} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {row.medicineName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.genericName}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${stCfg?.className || ""}`}
                    >
                      {stCfg?.label || row.stockStatus}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Batch</p>
                      <p className="font-mono font-medium">{row.batchNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stock</p>
                      <p className="font-medium tabular-nums">
                        {row.currentQuantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expiry</p>
                      <p>{formatDate(row.expiryDate)}</p>
                    </div>
                  </div>
                  {row.cartonCode && (
                    <p className="text-[10px] text-muted-foreground">
                      Carton: {row.cartonCode}
                    </p>
                  )}
                  {row.lastMovement && (
                    <p className="text-[10px] text-muted-foreground">
                      Last: {getMovementTypeLabel(row.lastMovement.type)} ·{" "}
                      {formatDate(row.lastMovement.date)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Filter Sheet */}
      <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Inventory Filters</SheetTitle>
            <SheetDescription>Narrow down the inventory list.</SheetDescription>
          </SheetHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Expiry Status</label>
              <Select
                value={filters.expiry}
                onValueChange={(v) => setFilter("expiry", v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={filters.category}
                onValueChange={(v) => setFilter("category", v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {data.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pharmacological Class</label>
              <Select
                value={filters.pharmacologicalClass}
                onValueChange={(v) => setFilter("pharmacologicalClass", v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {data.pharmacologicalClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Carton</label>
              <Select
                value={filters.carton}
                onValueChange={(v) => setFilter("carton", v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cartons</SelectItem>
                  {data.cartons.map((c) => (
                    <SelectItem key={c.id} value={c.code}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stock Status</label>
              <Select
                value={filters.availability}
                onValueChange={(v) => setFilter("availability", v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">
                    Low Stock (≤{LOW_STOCK_THRESHOLD})
                  </SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {activeCount > 0 && (
              <Button variant="outline" className="w-full" onClick={clearAll}>
                Clear All Filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AdjustStockDialog
        open={showAdjustDialog}
        onOpenChange={setShowAdjustDialog}
        onAdjusted={loadData}
      />

      <AddStockDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdded={loadData}
      />
    </div>
  );
}