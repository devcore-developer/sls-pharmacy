"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pill, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MedicineTable } from "./components/medicine-table";
import { AddMedicineDialog } from "./components/add-medicine-dialog";
import { EditMedicineDialog } from "./components/edit-medicine-dialog";
import { MedicineDetailsSheet } from "./components/medicine-details-sheet";
import { ArchiveConfirmDialog } from "./components/archive-confirm-dialog";
import { SavedLocallyBanner } from "./components/saved-locally-banner";
import {
  ensureSeedData,
  getMedicinesPaginated,
  getAllCategories,
  getAllPharmacologicalClasses,
} from "@/lib/offline/medicine-repository";
import type {
  MedicineListItem,
  CategoryItem,
  PharmacologicalClassItem,
} from "@/types";

const PAGE_SIZE = 25;

export default function MedicinesPage() {
  const [items, setItems] = useState<MedicineListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [classes, setClasses] = useState<PharmacologicalClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [showAdd, setShowAdd] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicineListItem["medicine"] | null>(null);
  const [viewingMed, setViewingMed] = useState<MedicineListItem["medicine"] | null>(null);
  const [archivingMed, setArchivingMed] = useState<MedicineListItem["medicine"] | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const loadData = useCallback(async (page: number, searchQuery: string) => {
    setLoading(true);
    try {
      await ensureSeedData();
      const [data, cats, cls] = await Promise.all([
        getMedicinesPaginated({ 
          page, 
          limit: PAGE_SIZE, 
          search: searchQuery, 
          filters: { status: "active" } 
        }),
        getAllCategories(),
        getAllPharmacologicalClasses(),
      ]);
      setItems(data.items);
      setTotal(data.total);
      setCategories(cats);
      setClasses(cls);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadData(1, "");
  }, [loadData]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length >= 2 || search.length === 0) {
        setCurrentPage(1);
        loadData(1, search);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadData]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    loadData(newPage, search);
  };

  function handleSaved() {
    setShowBanner(true);
    loadData(currentPage, search);
  }

  if (loading && items.length === 0) {
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
          placeholder="Search by trade name, scientific name, or barcode..."
          className="max-w-md flex-1"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {total} medicine{total !== 1 ? "s" : ""} found
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={search ? "No medicines match your search" : "No medicines found"}
          description={search ? "Try a different search term." : "Get started by adding your first medicine."}
          action={!search ? { label: "Add Medicine", onClick: () => setShowAdd(true) } : undefined}
        />
      ) : (
        <>
          {loading && <div className="text-sm text-muted-foreground animate-pulse mb-2">Loading page...</div>}
          <MedicineTable
            medicines={items}
            onView={setViewingMed}
            onEdit={setEditingMed}
            onArchive={setArchivingMed}
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
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