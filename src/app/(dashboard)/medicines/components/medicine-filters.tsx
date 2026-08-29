"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryItem, PharmacologicalClassItem, CartonItem, ActiveFilters } from "@/types";

interface MedicineFiltersProps {
  categories: CategoryItem[];
  classes: PharmacologicalClassItem[];
  cartons: CartonItem[];
  filters: ActiveFilters;
  onFilterChange: <K extends keyof ActiveFilters>(key: K, value: string) => void;
  onClearAll: () => void;
}

export function MedicineFilters({
  categories,
  classes,
  cartons,
  filters,
  onFilterChange,
  onClearAll,
}: MedicineFiltersProps) {
  const activeCount = [
    filters.category,
    filters.pharmacologicalClass,
    filters.expiry,
    filters.carton,
    filters.availability,
  ].filter((v) => v !== "all").length;

  const realStatus = filters.status === "__open__" ? "active" : filters.status;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-2"
        onClick={() => onFilterChange("status", "__open__")}
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

      <Sheet
        open={filters.status === "__open__"}
        onOpenChange={(open) => {
          if (!open) onFilterChange("status", "active");
        }}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Narrow down the medicine list. All filters are combined.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Status</label>
              <Select value={realStatus} onValueChange={(v) => onFilterChange("status", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Category</label>
              <Select value={filters.category} onValueChange={(v) => onFilterChange("category", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Pharmacological Class</label>
              <Select value={filters.pharmacologicalClass} onValueChange={(v) => onFilterChange("pharmacologicalClass", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Expiry Status</label>
              <Select value={filters.expiry} onValueChange={(v) => onFilterChange("expiry", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Carton</label>
              <Select value={filters.carton} onValueChange={(v) => onFilterChange("carton", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="All Cartons" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cartons</SelectItem>
                  {cartons.map((c) => (
                    <SelectItem key={c.id} value={c.code}>{c.code} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Stock Availability</label>
              <Select value={filters.availability} onValueChange={(v) => onFilterChange("availability", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeCount > 0 && (
              <Button variant="outline" className="w-full" onClick={onClearAll}>
                Clear All Filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}