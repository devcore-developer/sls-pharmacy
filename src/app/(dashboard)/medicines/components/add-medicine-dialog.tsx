"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MedicineForm } from "./medicine-form";
import { createMedicine, ensureSeedData } from "@/lib/offline/medicine-repository";
import type { CategoryItem, PharmacologicalClassItem, MedicineFormData } from "@/types";

interface AddMedicineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryItem[];
  classes: PharmacologicalClassItem[];
  onSaved: () => void;
}

export function AddMedicineDialog({
  open,
  onOpenChange,
  categories,
  classes,
  onSaved,
}: AddMedicineDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(data: MedicineFormData) {
    setSubmitting(true);
    try {
      await ensureSeedData();
      await createMedicine(data);
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Medicine</DialogTitle>
          <DialogDescription>
            Add a new medicine to the system.
          </DialogDescription>
        </DialogHeader>
        <MedicineForm
          categories={categories}
          classes={classes}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={submitting}
          submitLabel="Add Medicine"
        />
      </DialogContent>
    </Dialog>
  );
}