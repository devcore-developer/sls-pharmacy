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
import { deactivateCarton } from "@/lib/offline/warehouse-repository";

interface Props {
  carton: {
    id: string;
    code: string;
    label: string;
    batchCount: number;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeactivated: () => void;
}

export function DeactivateCartonDialog({
  carton,
  open,
  onOpenChange,
  onDeactivated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDeactivate() {
    if (!carton) return;
    setLoading(true);
    setError("");
    const result = await deactivateCarton(carton.id);
    setLoading(false);

    if (result.success) {
      onOpenChange(false);
      onDeactivated();
    } else {
      setError(result.error || "Failed to deactivate carton.");
    }
  }

  if (!carton) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Deactivate Carton</DialogTitle>
          <DialogDescription>
            This carton will no longer appear in selection lists. Historical data is preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 space-y-1">
            <p className="font-mono font-medium text-foreground">{carton.code}</p>
            <p className="text-sm text-muted-foreground">{carton.label}</p>
          </div>

          {carton.batchCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning">
                This carton contains {carton.batchCount} batch
                {carton.batchCount !== 1 ? "es" : ""} with stock. You must move or deplete them
                before deactivating.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={loading || carton.batchCount > 0}
            >
              {loading ? "Deactivating..." : "Deactivate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}