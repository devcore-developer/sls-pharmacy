"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/loading-state";
import { getCartons, moveBatchCarton } from "@/lib/offline/warehouse-repository";
import type { CartonListItem } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  currentCartonId: string;
  currentCartonCode: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  onMoved: (toCartonId: string) => void;
}

export function MoveBatchDialog({
  open,
  onOpenChange,
  batchId,
  currentCartonId,
  currentCartonCode,
  medicineName,
  batchNumber,
  quantity,
  onMoved,
}: Props) {
  const [cartons, setCartons] = useState<CartonListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCartonId, setSelectedCartonId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setLoading(true);
      getCartons().then((c) => {
        setCartons(c.filter((carton) => carton.id !== currentCartonId));
        setLoading(false);
      });
      setSelectedCartonId(null);
      setSearch("");
      setError("");
    }
  }, [open, currentCartonId]);

  const filteredCartons = useMemo(() => {
    if (!search.trim()) return cartons;
    const q = search.toLowerCase();
    return cartons.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        (c.sectionName?.toLowerCase().includes(q) ?? false)
    );
  }, [cartons, search]);

  const selectedCarton = cartons.find((c) => c.id === selectedCartonId);

  async function handleMove() {
    if (!selectedCartonId) return;
    setMoving(true);
    setError("");
    const result = await moveBatchCarton(batchId, selectedCartonId);
    setMoving(false);
    if (result.success) {
      onMoved(selectedCartonId);
      onOpenChange(false);
    } else {
      setError(result.error || "Failed to move batch.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Move Batch</DialogTitle>
          <DialogDescription>
            Move batch <span className="font-mono">{batchNumber}</span> from{" "}
            <span className="font-mono">{currentCartonCode}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Batch Info */}
          <div className="rounded-lg border p-3 space-y-1 text-sm">
            <p className="font-medium text-foreground">{medicineName}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Quantity: {quantity}</span>
              <span className="font-mono">{batchNumber}</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search destination carton..."
              className="pl-9"
            />
          </div>

          {/* Carton List */}
          {loading ? (
            <LoadingState message="" />
          ) : (
            <div className="max-h-[30vh] overflow-y-auto space-y-1.5">
              {filteredCartons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No cartons found.</p>
              ) : (
                filteredCartons.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCartonId(c.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                      selectedCartonId === c.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{c.code}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                        {c.sectionName && (
                          <p className="text-xs text-muted-foreground">{c.sectionName}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {c.totalUnits} u
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected Preview */}
          {selectedCarton && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono">{currentCartonCode}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono font-medium">{selectedCarton.code}</span>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={!selectedCartonId || moving}>
              {moving ? "Moving..." : "Move Batch"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}