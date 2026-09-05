"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MedicineAutocomplete } from "@/components/medicine/medicine-autocomplete";
import type { MedicineSearchResult } from "@/lib/offline/medicine-repository";

interface AddAlternativeDialogProps {
  medicineId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AddAlternativeDialog({
  medicineId,
  open,
  onOpenChange,
  onSaved,
}: AddAlternativeDialogProps) {
  const [altMedicine, setAltMedicine] = useState<MedicineSearchResult | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!altMedicine) return;
    setSaving(true);
    try {
      // Use Dexie directly to add the alternative relation
      const { db } = await import("@/lib/offline/db");
      await db.medicineAlternatives.add({
        medicineId: medicineId,
        alternativeMedicineId: altMedicine.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      onSaved();
      onOpenChange(false);
      setAltMedicine(null);
    } catch (error) {
      console.error("Failed to add alternative:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Alternative Medicine</DialogTitle>
          <DialogDescription>
            Search and select an alternative medicine for this item.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <MedicineAutocomplete
            value={altMedicine?.tradeName || ""}
            medicineId={altMedicine?.id || null}
            onChange={(val, id, med) => {
              if (med) {
                setAltMedicine(med);
              } else {
                setAltMedicine(null);
              }
            }}
            placeholder="Search for alternative medicine..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!altMedicine || saving}>
            {saving ? "Adding..." : "Add Alternative"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}