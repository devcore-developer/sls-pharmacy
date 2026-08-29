"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BatchForm } from "./batch-form";
import { updateBatch } from "@/lib/offline/batch-repository";
import { getAllCartonsSimple } from "@/lib/offline/carton-repository";
import type { BatchWithCarton, CartonItem, BatchFormData } from "@/types";

interface EditBatchDialogProps {
  batch: BatchWithCarton | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditBatchDialog({
  batch,
  open,
  onOpenChange,
  onSaved,
}: EditBatchDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [cartons, setCartons] = useState<CartonItem[]>([]);

  useEffect(() => {
    if (open) {
      getAllCartonsSimple().then(setCartons);
    }
  }, [open]);

  const initialData: BatchFormData | undefined = batch
    ? {
        batchNumber: batch.batchNumber,
        quantity: String(batch.quantity),
        expiryDate: batch.expiryDate.toISOString().split("T")[0],
        cartonId: batch.cartonId || "",
      }
    : undefined;

  async function handleSubmit(data: BatchFormData) {
    if (!batch) return;
    setSubmitting(true);
    try {
      await updateBatch(batch.id, data);
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
          <DialogTitle>Edit Batch</DialogTitle>
          <DialogDescription>Update batch {batch?.batchNumber}.</DialogDescription>
        </DialogHeader>
        {initialData && (
          <BatchForm
            initialData={initialData}
            cartons={cartons}
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