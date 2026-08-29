// src/app/(dashboard)/inventory/components/adjust-stock-dialog.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from "lucide-react";
import { createAdjustment } from "@/lib/offline/stock-movement-repository";
import { getAllMedicines } from "@/lib/offline/medicine-repository";
import { getBatchesForMedicine } from "@/lib/offline/batch-repository";
import { formatDate } from "@/lib/utils";
import { ADJUSTMENT_REASONS } from "@/types";
import type { MedicineWithRelations, BatchWithCarton, AdjustmentReason } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjusted: () => void;
}

type Step = "medicine" | "batch" | "form" | "confirm";

export function AdjustStockDialog({ open, onOpenChange, onAdjusted }: Props) {
  const [step, setStep] = useState<Step>("medicine");
  const [medicines, setMedicines] = useState<MedicineWithRelations[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMed, setSelectedMed] = useState<MedicineWithRelations | null>(null);
  const [batches, setBatches] = useState<BatchWithCarton[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchWithCarton | null>(null);
  const [adjustType, setAdjustType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<AdjustmentReason | "">("");
  const [customReason, setCustomReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) reset();
    getAllMedicines().then(setMedicines);
  }, [open]);

  function reset() {
    setStep("medicine");
    setSearch("");
    setSelectedMed(null);
    setBatches([]);
    setSelectedBatch(null);
    setAdjustType("IN");
    setQuantity("");
    setReason("");
    setCustomReason("");
    setNote("");
    setError("");
    setSubmitting(false);
  }

  async function selectMedicine(med: MedicineWithRelations) {
    setSelectedMed(med);
    setStep("batch");
    setError("");
    const data = await getBatchesForMedicine(med.id);
    setBatches(data.filter((b) => !b.archivedAt));
  }

  function selectBatch(batch: BatchWithCarton) {
    setSelectedBatch(batch);
    setStep("form");
    setError("");
  }

  const resolvedReason = reason === "Other" ? customReason.trim() : reason;
  const qty = parseInt(quantity, 10);
  const newStock =
    selectedBatch && qty > 0
      ? adjustType === "IN"
        ? selectedBatch.quantity + qty
        : selectedBatch.quantity - qty
      : null;

  function handleConfirm() {
    if (!resolvedReason) {
      setError("Please select or enter a reason.");
      return;
    }
    setStep("confirm");
    setError("");
  }

  async function handleSubmit() {
    if (!selectedMed || !selectedBatch || !resolvedReason || !qty || qty < 1) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await createAdjustment({
        medicineId: selectedMed.id,
        batchId: selectedBatch.id,
        type: adjustType,
        quantity: qty,
        reason: resolvedReason,
        note: note.trim() || undefined,
      });
      if (result.success) {
        onAdjusted();
      } else {
        setError(result.error || "Adjustment failed.");
        setStep("form");
      }
    } finally {
      setSubmitting(false);
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
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            {step === "medicine" && "Select a medicine to adjust."}
            {step === "batch" && "Select the batch to adjust."}
            {step === "form" && "Enter adjustment details."}
            {step === "confirm" && "Review and confirm."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === "medicine" && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search medicines..."
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="max-h-[50vh] overflow-y-auto space-y-1">
                {filteredMeds.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No medicines found.
                  </p>
                ) : (
                  filteredMeds.map((med) => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => selectMedicine(med)}
                      className="w-full text-left rounded-lg border px-3 py-2.5 hover:bg-accent/50 transition-colors"
                    >
                      <p className="text-sm font-medium">{med.tradeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {med.genericName}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {step === "batch" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedMed?.tradeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedMed?.genericName}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("medicine");
                    setSelectedBatch(null);
                  }}
                >
                  ← Back
                </Button>
              </div>
              {batches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No active batches for this medicine.
                </p>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto space-y-1">
                  {batches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => selectBatch(b)}
                      className="w-full text-left rounded-lg border px-3 py-2.5 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-mono font-medium">
                          {b.batchNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Exp: {formatDate(b.expiryDate)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current Stock: {b.quantity} units
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "form" && selectedBatch && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {selectedMed?.tradeName} · {selectedBatch.batchNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current Stock: {selectedBatch.quantity} units
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("batch");
                    setError("");
                  }}
                >
                  ← Back
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType("IN")}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 transition-colors ${
                    adjustType === "IN"
                      ? "border-success bg-success/10 text-success"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Increase</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("OUT")}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 transition-colors ${
                    adjustType === "OUT"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Decrease</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Quantity <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={
                    adjustType === "OUT" ? selectedBatch.quantity : undefined
                  }
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setError("");
                  }}
                  placeholder={
                    adjustType === "OUT"
                      ? `Max: ${selectedBatch.quantity}`
                      : "Enter quantity"
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Reason <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ADJUSTMENT_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setReason(r);
                        setCustomReason("");
                        setError("");
                      }}
                      className={`text-left text-xs rounded-md border px-2.5 py-1.5 transition-colors ${
                        reason === r
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {reason === "Other" && (
                  <Input
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Note</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              {qty > 0 && newStock !== null && (
                <div className="rounded-lg border p-3 space-y-1.5 bg-muted/30">
                  <p className="text-xs text-muted-foreground">Preview</p>
                  <div className="flex items-center justify-between text-sm">
                    <span>Current:</span>
                    <span className="font-medium tabular-nums">
                      {selectedBatch.quantity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Adjustment:</span>
                    <span
                      className={`font-medium tabular-nums ${
                        adjustType === "IN" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {adjustType === "IN" ? "+" : "-"}
                      {qty}
                    </span>
                  </div>
                  <div className="border-t pt-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">New Stock:</span>
                    <span className="font-bold tabular-nums">{newStock}</span>
                  </div>
                  {newStock < 0 && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Stock cannot be negative
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={
                    !qty || qty < 1 || !reason || (reason === "Other" && !customReason.trim()) || (newStock !== null && newStock < 0)
                  }
                >
                  Review
                </Button>
              </div>
            </>
          )}

          {step === "confirm" && selectedBatch && qty > 0 && newStock !== null && (
            <>
              <div className="rounded-lg border p-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Medicine</p>
                  <p className="text-sm font-medium">{selectedMed?.tradeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedMed?.genericName}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Batch</p>
                  <p className="text-sm font-mono font-medium">
                    {selectedBatch.batchNumber}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="text-lg font-bold tabular-nums">
                      {selectedBatch.quantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Adjustment</p>
                    <p
                      className={`text-lg font-bold tabular-nums ${
                        adjustType === "IN" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {adjustType === "IN" ? "+" : "-"}
                      {qty}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">New Stock</p>
                    <p className="text-lg font-bold tabular-nums">
                      {newStock}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Badge
                    variant={adjustType === "IN" ? "success" : "destructive"}
                  >
                    {adjustType === "IN" ? "Increase" : "Decrease"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Reason: {resolvedReason}
                  </span>
                </div>
                {note && (
                  <p className="text-xs text-muted-foreground">
                    Note: {note}
                  </p>
                )}
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep("form")}>
                  Back
                </Button>
                <Button
                  variant={adjustType === "IN" ? "default" : "destructive"}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Processing..." : "Confirm Adjustment"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}