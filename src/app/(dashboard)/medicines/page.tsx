"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MedicineFilters } from "./components/medicine-filters";
import { FilterChip, ClearAllFilters } from "./components/filter-chip";
import { MedicineTable } from "./components/medicine-table";
import { MedicineMobileList } from "./components/medicine-mobile-list";
import { AddMedicineDialog } from "./components/add-medicine-dialog";
import { EditMedicineDialog } from "./components/edit-medicine-dialog";
import { MedicineDetailsSheet } from "./components/medicine-details-sheet";
import { ArchiveConfirmDialog } from "./components/archive-confirm-dialog";
import { SavedLocallyBanner } from "./components/saved-locally-banner";
import {
  ensureSeedData,
  getMedicineListData,
  getAllCategories,
  getAllPharmacologicalClasses,
} from "@/lib/offline/medicine-repository";
import { getStockAvailability } from "@/lib/offline/stock-utils";
import type {
  MedicineListItem,
  CategoryItem,
  PharmacologicalClassItem,
  CartonItem,
  ActiveFilters,
} from "@/types";

const DEFAULT_FILTERS: ActiveFilters = {
  category: "all",
  pharmacologicalClass: "all",
  expiry: "all",
  carton: "all",
  availability: "all",
  section: "all",
  status: "active",
};

export default function MedicinesPage() {
  const [items, setItems] = useState<MedicineListItem[]>([]);
  const [cartons, setCartons] = useState<CartonItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [classes, setClasses] = useState<PharmacologicalClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);

  const [showAdd, setShowAdd] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicineListItem["medicine"] | null>(null);
  const [viewingMed, setViewingMed] = useState<MedicineListItem["medicine"] | null>(null);
  const [archivingMed, setArchivingMed] = useState<MedicineListItem["medicine"] | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await ensureSeedData();
      const [data, cats, cls] = await Promise.all([
        getMedicineListData(),
        getAllCategories(),
        getAllPharmacologicalClasses(),
      ]);
      setItems(data.items);
      setCartons(data.cartons);
      setCategories(cats);
      setClasses(cls);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const m = item.medicine;

      // Status
      if (filters.status === "active" && m.archivedAt) return false;
      if (filters.status === "archived" && !m.archivedAt) return false;

      // Category
      if (filters.category !== "all") {
        if (!m.categories.some((c) => c.id === filters.category)) return false;
      }

      // Pharmacological class
      if (filters.pharmacologicalClass !== "all") {
        if (!m.pharmacologicalClasses.some((c) => c.id === filters.pharmacologicalClass))
          return false;
      }

      // Expiry
      if (filters.expiry !== "all" && item.expiryStatus !== filters.expiry) return false;

      // Carton
      if (filters.carton !== "all" && !item.cartonCodes.includes(filters.carton))
        return false;

      // Availability
      if (filters.availability !== "all") {
        const avail = getStockAvailability(item.totalQuantity);
        if (avail !== filters.availability) return false;
      }

      // Search: trade name, generic name, batch number, carton code
      if (search) {
        const q = search.toLowerCase();
        const matchesText =
          m.tradeName.toLowerCase().includes(q) ||
          m.genericName.toLowerCase().includes(q);
        const matchesBatch = item.batchNumbers.some((b) =>
          b.toLowerCase().includes(q)
        );
        const matchesCarton = item.cartonCodes.some((c) =>
          c.toLowerCase().includes(q)
        );
        if (!matchesText && !matchesBatch && !matchesCarton) return false;
      }

      return true;
    });
  }, [items, search, filters]);

  // Filter chip labels
  const activeChips = useMemo(() => {
    const chips: { key: keyof ActiveFilters; label: string }[] = [];
    if (filters.category !== "all") {
      const cat = categories.find((c) => c.id === filters.category);
      if (cat) chips.push({ key: "category", label: `Category: ${cat.name}` });
    }
    if (filters.pharmacologicalClass !== "all") {
      const cls = classes.find((c) => c.id === filters.pharmacologicalClass);
      if (cls) chips.push({ key: "pharmacologicalClass", label: `Class: ${cls.name}` });
    }
    if (filters.expiry !== "all") {
      const label =
        filters.expiry === "expiring_soon"
          ? "Expiring Soon"
          : filters.expiry === "expired"
          ? "Expired"
          : "Valid";
      chips.push({ key: "expiry", label: `Expiry: ${label}` });
    }
    if (filters.carton !== "all") {
      chips.push({ key: "carton", label: `Carton: ${filters.carton}` });
    }
    if (filters.availability !== "all") {
      const label =
        filters.availability === "in_stock"
          ? "In Stock"
          : filters.availability === "low_stock"
          ? "Low Stock"
          : "Out of Stock";
      chips.push({ key: "availability", label: label });
    }
    if (filters.status === "archived") {
      chips.push({ key: "status", label: "Archived" });
    }
    return chips;
  }, [filters, categories, classes]);

  function handleFilterChange<K extends keyof ActiveFilters>(
    key: K,
    value: string
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearAllFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function removeChip(key: keyof ActiveFilters) {
    setFilters((prev) => ({
      ...prev,
      [key]: key === "status" ? "active" : "all",
    }));
  }

  function handleSaved() {
    setShowBanner(true);
    loadData();
  }

  const hasActiveFilters = activeChips.length > 0;

  if (loading) {
    return <LoadingState message="Loading medicines..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicines"
        description="Manage medicines, classifications, categories, and alternatives."
        action={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Medicine
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, batch, or carton..."
          className="max-w-md flex-1"
        />
        <MedicineFilters
          categories={categories}
          classes={classes}
          cartons={cartons}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={clearAllFilters}
        />
      </div>

      {/* Active filter chips + results count */}
      <div className="flex flex-wrap items-center gap-2">
        {hasActiveFilters && (
          <>
            {activeChips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                onRemove={() => removeChip(chip.key)}
              />
            ))}
            <ClearAllFilters onClear={clearAllFilters} />
          </>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} medicine{filtered.length !== 1 ? "s" : ""} found
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={
            search || hasActiveFilters
              ? "No medicines match these filters"
              : "No medicines found"
          }
          description={
            search || hasActiveFilters
              ? "Try adjusting your search or filters."
              : "Get started by adding your first medicine."
          }
          action={
            !search && !hasActiveFilters
              ? { label: "Add Medicine", onClick: () => setShowAdd(true) }
              : undefined
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <MedicineTable
              medicines={filtered.map((i) => i.medicine)}
              onView={setViewingMed}
              onEdit={setEditingMed}
              onArchive={setArchivingMed}
            />
          </div>
          <div className="md:hidden">
            <MedicineMobileList
              medicines={filtered.map((i) => i.medicine)}
              onView={setViewingMed}
              onEdit={setEditingMed}
              onArchive={setArchivingMed}
            />
          </div>
        </>
      )}

      <AddMedicineDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        categories={categories}
        classes={classes}
        onSaved={handleSaved}
      />

      <EditMedicineDialog
        medicine={editingMed}
        open={editingMed !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setEditingMed(null);
        }}
        categories={categories}
        classes={classes}
        onSaved={handleSaved}
      />

      <MedicineDetailsSheet
        medicine={viewingMed}
        open={viewingMed !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setViewingMed(null);
        }}
        onEdit={() => {
          if (viewingMed) setEditingMed(viewingMed);
        }}
        onArchive={() => {
          if (viewingMed) setArchivingMed(viewingMed);
        }}
        onSavedLocally={handleSaved}
      />

      <ArchiveConfirmDialog
        medicine={archivingMed}
        open={archivingMed !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setArchivingMed(null);
        }}
        onArchived={handleSaved}
      />

      <SavedLocallyBanner
        show={showBanner}
        onHide={() => setShowBanner(false)}
      />
    </div>
  );
}