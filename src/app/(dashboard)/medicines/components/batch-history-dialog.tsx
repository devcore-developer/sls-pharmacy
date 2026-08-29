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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, MapPin } from "lucide-react";
import { getMovementsByBatch } from "@/lib/offline/stock-movement-repository";
import { getBatchLocationHistory } from "@/lib/offline/warehouse-repository";
import { formatDate } from "@/lib/utils";
import type { StockMovementListItem, LocationHistoryEntry } from "@/types";

interface Props {
  batchId: string | null;
  batchNumber: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchHistoryDialog({
  batchId,
  batchNumber,
  open,
  onOpenChange,
}: Props) {
  const [movements, setMovements] = useState<StockMovementListItem[]>([]);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && batchId) {
      setLoading(true);
      Promise.all([
        getMovementsByBatch(batchId, 50),
        getBatchLocationHistory(batchId),
      ]).then(([movs, locHist]) => {
        setMovements(movs);
        setLocationHistory(locHist);
        setLoading(false);
      });
    }
    if (!open) {
      setMovements([]);
      setLocationHistory([]);
    }
  }, [open, batchId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch History</DialogTitle>
          <DialogDescription>
            History for batch <span className="font-mono">{batchNumber || "—"}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState message="" />
        ) : (
          <div className="space-y-4">
            {/* Location History */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <MapPin className="h-3.5 w-3.5" />
                Location History
              </h3>
              {locationHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No location changes recorded.
                </p>
              ) : (
                <div className="space-y-2">
                  {locationHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 text-sm rounded-lg border p-2"
                    >
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex items-center gap-2 text-xs">
                        <span className={entry.fromCartonCode ? "font-mono" : "text-muted-foreground"}>
                          {entry.fromCartonCode || "Unassigned"}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className={entry.toCartonCode ? "font-mono font-medium" : "text-muted-foreground"}>
                          {entry.toCartonCode || "Unassigned"}
                        </span>
                      </div>
                      {entry.note && (
                        <span className="text-xs text-muted-foreground ml-auto truncate">
                          {entry.note}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Stock Movements */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Stock Movements</h3>
              {movements.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No stock movements recorded.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="pl-6 text-xs text-muted-foreground">
                            {formatDate(m.date)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {m.typeLabel}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium tabular-nums ${
                              m.direction === "IN"
                                ? "text-green-600"
                                : m.direction === "OUT"
                                ? "text-red-600"
                                : ""
                            }`}
                          >
                            {m.direction === "IN" ? "+" : m.direction === "OUT" ? "-" : ""}
                            {m.quantity}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {m.convoyName || m.reason || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}