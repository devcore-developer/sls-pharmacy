"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Archive, Package, Box, Calendar, Layers } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/shared/loading-state";
import { formatDate } from "@/lib/utils";
import { getBatchesForMedicine } from "@/lib/offline/batch-repository";
import { getNearestExpiry } from "@/lib/offline/stock-utils";
import { BatchTable } from "./batch-table";
import { AddBatchDialog } from "./add-batch-dialog";
import { EditBatchDialog } from "./edit-batch-dialog";
import { ArchiveConfirmDialog } from "./archive-confirm-dialog";
import { AlternativesSection } from "./alternatives-section";
import type { MedicineWithRelations, BatchWithCarton } from "@/types";
import { StockHistorySection } from "./stock-history-section";

interface MedicineDetailsSheetProps {
  medicine: MedicineWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onArchive: () => void;
  onSavedLocally: () => void;
}

export function MedicineDetailsSheet({
  medicine,
  open,
  onOpenChange,
  onEdit,
  onArchive,
  onSavedLocally,
}: MedicineDetailsSheetProps) {
  const [batches, setBatches] = useState<BatchWithCarton[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchWithCarton | null>(null);
  const [archivingBatch, setArchivingBatch] = useState<BatchWithCarton | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadBatches = useCallback(async () => {
    if (!medicine) return;
    setLoading(true);
    try {
      const data = await getBatchesForMedicine(medicine.id);
      setBatches(data);
    } finally {
      setLoading(false);
    }
  }, [medicine]);

  useEffect(() => { loadBatches(); }, [loadBatches, refreshKey]);

  function handleSaved() {
    onSavedLocally();
    setRefreshKey((k) => k + 1);
  }

  if (!medicine) return null;

  const activeBatches = batches.filter((b) => !b.archivedAt);
  const totalUnits = activeBatches.reduce((s, b) => s + b.quantity, 0);
  const cartonSet = new Set(activeBatches.filter((b) => b.cartonId).map((b) => b.cartonId));
  const nearestExpiry = getNearestExpiry(activeBatches);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-lg leading-snug">{medicine.tradeName}</SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              {medicine.archivedAt ? <Badge variant="secondary">Archived</Badge> : <Badge variant="success">Active</Badge>}
            </div>

            <div className="space-y-3">
              <DetailRow label="Generic Name" value={medicine.genericName} />
              <DetailRow label="Manufacturer" value={medicine.manufacturer} />
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Pharmacological Classes</p>
                {medicine.pharmacologicalClasses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {medicine.pharmacologicalClasses.map((c) => (<Badge key={c.id} variant="outline">{c.name}</Badge>))}
                  </div>
                ) : (<p className="text-sm text-muted-foreground">None assigned</p>)}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Categories</p>
                {medicine.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {medicine.categories.map((c) => (<Badge key={c.id} variant="secondary">{c.name}</Badge>))}
                  </div>
                ) : (<p className="text-sm text-muted-foreground">None assigned</p>)}
              </div>
              {medicine.notes && <DetailRow label="Notes" value={medicine.notes} />}
              <DetailRow label="Created" value={formatDate(medicine.createdAt)} />
              <DetailRow label="Last Updated" value={formatDate(medicine.updatedAt)} />
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Stock Overview</h3>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={Package} label="Total Units" value={totalUnits} />
                <StatCard icon={Layers} label="Batches" value={activeBatches.length} />
                <StatCard icon={Box} label="Cartons" value={cartonSet.size} />
                <StatCard icon={Calendar} label="Nearest Expiry" value={nearestExpiry ? formatDate(nearestExpiry) : "—"} />
              </div>
            </div>

            <Separator />

            <Separator />

            <StockHistorySection medicineId={medicine.id} />

            <Separator />


            <AlternativesSection medicineId={medicine.id} onSavedLocally={handleSaved} />

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Batches</h3>
                <Button size="sm" onClick={() => setShowAddBatch(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Batch
                </Button>
              </div>
              {loading ? <LoadingState message="" /> : <BatchTable batches={batches} onEdit={setEditingBatch} onArchive={setArchivingBatch} />}
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { onOpenChange(false); onEdit(); }}>
                <Pencil className="h-4 w-4 mr-2" />Edit
              </Button>
              <Button variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => { onOpenChange(false); onArchive(); }}>
                <Archive className="h-4 w-4 mr-2" />Archive
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AddBatchDialog open={showAddBatch} onOpenChange={setShowAddBatch} medicineId={medicine.id} onSaved={handleSaved} />
      <EditBatchDialog batch={editingBatch} open={editingBatch !== null} onOpenChange={(o: boolean) => { if (!o) setEditingBatch(null); }} onSaved={handleSaved} />
      <ArchiveConfirmDialog
        medicine={null}
        open={archivingBatch !== null}
        onOpenChange={(o: boolean) => { if (!o) setArchivingBatch(null); }}
        onArchived={handleSaved}
        title="Archive Batch"
        description={"Are you sure you want to archive batch " + (archivingBatch?.batchNumber || "") + "?"}
        onConfirm={async () => {
          if (!archivingBatch) return;
          const { archiveBatch } = await import("@/lib/offline/batch-repository");
          await archiveBatch(archivingBatch.id);
        }}
      />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-base font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}