"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BatchForm } from "./batch-form";
import { createBatch } from "@/lib/offline/batch-repository";
import { getAllCartonsSimple } from "@/lib/offline/carton-repository";
import { useEffect } from "react";
import type { BatchFormData } from "@/types";

interface AddBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicineId: string;
  onSaved: () => void;
}

export function AddBatchDialog({
  open,
  onOpenChange,
  medicineId,
  onSaved,
}: AddBatchDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [cartons, setCartons] = useState<Array<{ id: string; code: string; label: string }>>([]);

  useEffect(() => {
    if (open) {
      getAllCartonsSimple().then(setCartons);
    }
  }, [open]);

  async function handleSubmit(data: BatchFormData) {
    setSubmitting(true);
    try {
      await createBatch(medicineId, data);
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
          <DialogTitle>Add Batch</DialogTitle>
          <DialogDescription>Add a new stock batch for this medicine.</DialogDescription>
        </DialogHeader>
        <BatchForm
          cartons={cartons}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={submitting}
          submitLabel="Add Batch"
        />
      </DialogContent>
    </Dialog>
  );
}