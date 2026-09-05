"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MedicineAutocomplete } from "@/components/medicine/medicine-autocomplete";
import { addDirectStock } from "@/lib/offline/stock-movement-repository";
import { getAllCartonsSimple } from "@/lib/offline/batch-repository";
import type { MedicineSearchResult } from "@/lib/offline/medicine-repository";

interface AddStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
  presetCartonId?: string;
  presetCartonCode?: string;
}

export function AddStockDialog({
  open,
  onOpenChange,
  onAdded,
  presetCartonId,
  presetCartonCode,
}: AddStockDialogProps) {
  const [medicineId, setMedicineId] = useState<string | null>(null);
  const [medName, setMedName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [cartonId, setCartonId] = useState<string | undefined>(presetCartonId);
  const [cartons, setCartons] = useState<Array<{ id: string; code: string; label: string }>>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      reset();
      getAllCartonsSimple().then(setCartons);
      if (presetCartonId) setCartonId(presetCartonId);
    }
  }, [open, presetCartonId]);

  function reset() {
    setMedicineId(null);
    setMedName("");
    setQuantity("");
    setExpiryDate("");
    setBatchNumber("");
    setCartonId(presetCartonId);
    setError("");
  }

  const handleMedicineChange = useCallback(
    (value: string, id: string | null, med?: MedicineSearchResult) => {
      setMedName(value);
      setMedicineId(id);
      if (id) setError("");
    },
    []
  );

  async function handleSubmit() {
    if (!medicineId) {
      setError("Please select a medicine.");
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setError("Quantity must be a valid number greater than 0.");
      return;
    }
    if (!expiryDate) {
      setError("Expiry date is required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await addDirectStock({
        medicineId,
        quantity: qty,
        expiryDate: new Date(expiryDate),
        batchNumber: batchNumber.trim() || undefined,
        cartonId: cartonId === "none" ? undefined : cartonId,
        reason: "Manual Stock Entry",
      });

      if (result.success) {
        onAdded();
        onOpenChange(false);
      } else {
        setError(result.error || "Failed to add stock.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Stock to Inventory</DialogTitle>
          <DialogDescription>
            Enter physical stock directly. This will update inventory and create an audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Medicine <span className="text-destructive">*</span></Label>
            <MedicineAutocomplete
              value={medName}
              onChange={handleMedicineChange}
              medicineId={medicineId}
              placeholder="Search medicine..."
            />
          </div>

          <div className="space-y-2">
            <Label>Quantity <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>

          <div className="space-y-2">
            <Label>Expiry Date <span className="text-destructive">*</span></Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Batch Number (Optional)</Label>
            <Input
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="Leave blank to auto-generate"
            />
          </div>

          <div className="space-y-2">
            <Label>Carton (Optional)</Label>
            <Select
              value={cartonId || "none"}
              onValueChange={(v) => setCartonId(v === "none" ? undefined : v)}
              disabled={!!presetCartonId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select carton" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Loose Stock)</SelectItem>
                {cartons.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {presetCartonCode && (
              <p className="text-xs text-muted-foreground">
                Adding to Carton: {presetCartonCode}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Adding..." : "Add Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}