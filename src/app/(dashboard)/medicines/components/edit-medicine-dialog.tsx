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
import { updateMedicine } from "@/lib/offline/medicine-repository";
import type {
  MedicineWithRelations,
  CategoryItem,
  PharmacologicalClassItem,
  MedicineFormData,
} from "@/types";

interface EditMedicineDialogProps {
  medicine: MedicineWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryItem[];
  classes: PharmacologicalClassItem[];
  onSaved: () => void;
}

export function EditMedicineDialog({
  medicine,
  open,
  onOpenChange,
  categories,
  classes,
  onSaved,
}: EditMedicineDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const initialData: MedicineFormData | undefined = medicine
    ? {
        tradeName: medicine.tradeName,
        genericName: medicine.genericName,
        manufacturer: medicine.manufacturer,
        categoryIds: medicine.categories.map((c) => c.id),
        pharmacologicalClassIds: medicine.pharmacologicalClasses.map((c) => c.id),
        notes: medicine.notes,
      }
    : undefined;

  async function handleSubmit(data: MedicineFormData) {
    if (!medicine) return;
    setSubmitting(true);
    try {
      await updateMedicine(medicine.id, data);
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
          <DialogTitle>Edit Medicine</DialogTitle>
          <DialogDescription>
            Update {medicine?.tradeName}.
          </DialogDescription>
        </DialogHeader>
        {initialData && (
          <MedicineForm
            initialData={initialData}
            categories={categories}
            classes={classes}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isSubmitting={submitting}
            submitLabel="Save Changes"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}