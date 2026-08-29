"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { getAllMedicines } from "@/lib/offline/medicine-repository";
import { getAvailableBatchesForMedicine, addConvoyItem } from "@/lib/offline/convoy-item-repository";
import { formatDate } from "@/lib/utils";
import type { MedicineWithRelations, BatchAvailability } from "@/types";

interface Props {
  convoyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export function AddConvoyMedicineDialog({ convoyId, open, onOpenChange, onAdded }: Props) {
  const [medicines, setMedicines] = useState<MedicineWithRelations[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMed, setSelectedMed] = useState<MedicineWithRelations | null>(null);
  const [batches, setBatches] = useState<BatchAvailability[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchAvailability | null>(null);
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      setSearch("");
      setSelectedMed(null);
      setSelectedBatch(null);
      setQuantity("");
      setBatches([]);
      getAllMedicines().then(setMedicines);
    }
  }, [open]);

  async function selectMedicine(med: MedicineWithRelations) {
    setSelectedMed(med);
    setSelectedBatch(null);
    setQuantity("");
    setError("");
    const avail = await getAvailableBatchesForMedicine(med.id, convoyId);
    setBatches(avail);
    if (avail.length === 0) {
      setError("No available batches for this medicine.");
    }
  }

  function selectBatch(batch: BatchAvailability) {
    setSelectedBatch(batch);
    setQuantity("");
    setError("");
  }

  function reset() {
    setSelectedMed(null);
    setSelectedBatch(null);
    setQuantity("");
    setBatches([]);
    setError("");
  }

  async function handleAdd() {
    if (!selectedMed || !selectedBatch) return;
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) { setError("Enter a valid quantity."); return; }
    if (qty > selectedBatch.availableQuantity) {
      setError(`Insufficient stock. Available: ${selectedBatch.availableQuantity}`);
      return;
    }
    setAdding(true);
    setError("");
    try {
      const result = await addConvoyItem({
        convoyId,
        medicineId: selectedMed.id,
        batchId: selectedBatch.batchId,
        quantityTaken: qty,
      });
      if (result.success) {
        onAdded();
      } else {
        setError(result.error || "Failed to add.");
      }
    } finally {
      setAdding(false);
    }
  }

  const filteredMeds = search
    ? medicines.filter(
        (m) =>
          !m.archivedAt &&
          (m.tradeName.toLowerCase().includes(search.toLowerCase()) ||
            m.genericName.toLowerCase().includes(search.toLowerCase()))
      )
    : medicines.filter((m) => !m.archivedAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Medicine</DialogTitle>
          <DialogDescription>Select a medicine, batch, and quantity.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedMed ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicines..." className="pl-9" />
              </div>
              <div className="max-h-[50vh] overflow-y-auto space-y-1">
                {filteredMeds.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No medicines found.</p>
                ) : (
                  filteredMeds.map((med) => (
                    <button key={med.id} type="button" onClick={() => selectMedicine(med)}
                      className="w-full text-left rounded-lg border px-3 py-2.5 hover:bg-accent/50 transition-colors">
                      <p className="text-sm font-medium">{med.tradeName}</p>
                      <p className="text-xs text-muted-foreground">{med.genericName}</p>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : !selectedBatch ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedMed.tradeName}</p>
                  <p className="text-xs text-muted-foreground">{selectedMed.genericName}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>← Back</Button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <p className="text-xs font-medium text-muted-foreground">Select a batch (FEFO order):</p>
              <div className="max-h-[40vh] overflow-y-auto space-y-1">
                {batches.map((b) => (
                  <button key={b.batchId} type="button" onClick={() => selectBatch(b)}
                    className="w-full text-left rounded-lg border px-3 py-2.5 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-mono font-medium">{b.batchNumber}</p>
                      <p className="text-xs text-muted-foreground">Exp: {formatDate(b.expiryDate)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Available: {b.availableQuantity} units</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedMed.tradeName}</p>
                  <p className="text-xs text-muted-foreground">{selectedMed.genericName} · Batch {selectedBatch.batchNumber}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedBatch(null); setError(""); }}>← Back</Button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity Taken <span className="text-destructive">*</span></label>
                <Input type="number" min={1} max={selectedBatch.availableQuantity} value={quantity}
                  onChange={(e) => { setQuantity(e.target.value); setError(""); }}
                  placeholder={`Max: ${selectedBatch.availableQuantity}`} />
                <p className="text-xs text-muted-foreground">Available: {selectedBatch.availableQuantity} units</p>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={adding || !quantity}>
                  {adding ? "Adding..." : "Add to Convoy"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}