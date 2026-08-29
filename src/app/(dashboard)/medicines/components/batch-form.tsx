"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Archive, History, MapPin, ArrowRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { BatchLocationDialog } from "./batch-location-dialog";
import { BatchHistoryDialog } from "./batch-history-dialog";
import { getExpiryStatus } from "@/lib/offline/stock-utils";
import type { BatchWithCarton } from "@/types";

interface BatchTableProps {
  batches: BatchWithCarton[];
  onEdit: (b: BatchWithCarton) => void;
  onArchive: (b: BatchWithCarton) => void;
}

export function BatchTable({ batches, onEdit, onArchive }: BatchTableProps) {
  const [historyBatch, setHistoryBatch] = useState<BatchWithCarton | null>(null);
  const [locationBatch, setLocationBatch] = useState<BatchWithCarton | null>(null);

  if (batches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No batches recorded for this medicine.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto -mx-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Batch</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 pr-6"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => {
              const status = b.archivedAt ? "archived" : getExpiryStatus(b.expiryDate);
              return (
                <TableRow key={b.id}>
                  <TableCell className="pl-6 font-medium text-foreground">{b.batchNumber}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.quantity}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {b.expiryDate.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    {b.isUnassigned ? (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setLocationBatch(b)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" />
                        {b.cartonCode || "—"}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell className="pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocationBatch(b)}>
                          <MapPin className="mr-2 h-4 w-4" />
                          Location
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setHistoryBatch(b)}>
                          <History className="mr-2 h-4 w-4" />
                          History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(b)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onArchive(b)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <BatchLocationDialog
        batch={locationBatch}
        open={locationBatch !== null}
        onOpenChange={(open) => {
          if (!open) setLocationBatch(null);
        }}
      />

      <BatchHistoryDialog
        batchId={historyBatch?.id ?? null}
        batchNumber={historyBatch?.batchNumber ?? null}
        open={historyBatch !== null}
        onOpenChange={(open) => {
          if (!open) setHistoryBatch(null);
        }}
      />
    </>
  );
}