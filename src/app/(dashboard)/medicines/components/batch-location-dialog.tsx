"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/shared/loading-state";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, ArrowRight } from "lucide-react";
import { getBatchLocation, getBatchLocationHistory } from "@/lib/offline/warehouse-repository";
import { formatDate } from "@/lib/utils";
import type { BatchWithCarton, LocationHistoryEntry } from "@/types";

interface Props {
  batch: BatchWithCarton | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchLocationDialog({ batch, open, onOpenChange }: Props) {
  const [location, setLocation] = useState<{
    sectionName: string | null;
    cartonCode: string | null;
    cartonLabel: string | null;
    locationNote: string | null;
    isUnassigned: boolean;
  } | null>(null);
  const [history, setHistory] = useState<LocationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && batch) {
      setLoading(true);
      Promise.all([
        getBatchLocation(batch.id),
        getBatchLocationHistory(batch.id),
      ]).then(([loc, hist]) => {
        setLocation(loc);
        setHistory(hist);
        setLoading(false);
      });
    }
    if (!open) {
      setLocation(null);
      setHistory([]);
    }
  }, [open, batch]);

  if (!batch) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Location</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{batch.batchNumber}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState message="" />
        ) : location ? (
          <div className="space-y-4">
            {/* Current Location */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Current Location
              </div>
              {location.isUnassigned ? (
                <div className="text-sm text-muted-foreground pl-6">
                  <Badge variant="secondary" className="text-xs">
                    Unassigned
                  </Badge>
                  <p className="mt-1 text-xs">This batch is not assigned to any carton.</p>
                </div>
              ) : (
                <div className="pl-6 space-y-1 text-sm">
                  {location.sectionName && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-16">Section:</span>
                      <span>{location.sectionName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16">Carton:</span>
                    <span className="font-mono">{location.cartonCode}</span>
                    {location.cartonLabel && (
                      <span className="text-muted-foreground">— {location.cartonLabel}</span>
                    )}
                  </div>
                  {location.locationNote && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-16">Location:</span>
                      <span>{location.locationNote}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Location History */}
            {history.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-3.5 w-3.5" />
                  Location History
                </h4>
                <div className="space-y-1.5">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 text-xs rounded border p-2"
                    >
                      <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className={entry.fromCartonCode ? "font-mono" : "text-muted-foreground"}>
                        {entry.fromCartonCode || "Unassigned"}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className={entry.toCartonCode ? "font-mono font-medium" : "text-muted-foreground"}>
                        {entry.toCartonCode || "Unassigned"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}