"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { completeConvoy } from "@/lib/offline/convoy-repository";

interface Props {
  convoyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function CompleteConvoyDialog({ convoyId, open, onOpenChange, onCompleted }: Props) {
  const [completing, setCompleting] = useState(false);

  async function handleComplete() {
    setCompleting(true);
    try {
      await completeConvoy(convoyId);
      onOpenChange(false);
      onCompleted();
    } finally {
      setCompleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Complete Convoy</DialogTitle>
          <DialogDescription>
            Are you sure you want to complete this convoy? After completion, dispensing will be locked. Remaining quantities will stay associated with this convoy.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={completing}>Cancel</Button>
          <Button variant="destructive" onClick={handleComplete} disabled={completing}>
            {completing ? "Completing..." : "Complete Convoy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}