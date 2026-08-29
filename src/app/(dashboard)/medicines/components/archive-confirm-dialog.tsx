"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { archiveMedicine } from "@/lib/offline/medicine-repository";
import type { MedicineWithRelations } from "@/types";

interface ArchiveConfirmDialogProps {
  medicine: MedicineWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchived: () => void;
  /** Override the default "Archive Medicine" title */
  title?: string;
  /** Override the default medicine description */
  description?: string;
  /** Override the default archive handler (for non-medicine entities) */
  onConfirm?: () => Promise<void>;
}

export function ArchiveConfirmDialog({
  medicine,
  open,
  onOpenChange,
  onArchived,
  title,
  description,
  onConfirm,
}: ArchiveConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleArchive() {
    setSubmitting(true);
    try {
      if (onConfirm) {
        await onConfirm();
      } else if (medicine) {
        await archiveMedicine(medicine.id);
      } else {
        return;
      }
      onOpenChange(false);
      onArchived();
    } finally {
      setSubmitting(false);
    }
  }

  const displayTitle = title || "Archive Medicine";
  const displayDescription =
    description || (
      <>
        Are you sure you want to archive{" "}
        <span className="font-medium text-foreground">
          {medicine?.tradeName}
        </span>
        ? It will be hidden from the active list but can be restored later.
      </>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {displayTitle}
          </DialogTitle>
          <DialogDescription>{displayDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleArchive}
            disabled={submitting}
          >
            {submitting ? "Archiving..." : "Archive"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}