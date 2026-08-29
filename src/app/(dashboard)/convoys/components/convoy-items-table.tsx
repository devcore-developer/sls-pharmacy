"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { ConvoyItem } from "@/types";

interface Props {
  items: ConvoyItem[];
  canEdit: boolean;
  onRemove: (itemId: string) => void;
}

export function ConvoyItemsTable({ items, canEdit, onRemove }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No medicines added yet.</p>;
  }

  return (
    <div className="overflow-x-auto -mx-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Medicine</TableHead>
            <TableHead className="hidden sm:table-cell">Generic Name</TableHead>
            <TableHead className="hidden md:table-cell">Batch</TableHead>
            <TableHead className="text-right">Taken</TableHead>
            <TableHead className="text-right">Dispensed</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
            {canEdit && <TableHead className="w-[50px] pr-6"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const remaining = item.quantityTaken - item.quantityDispensed;
            return (
              <TableRow key={item.id}>
                <TableCell className="pl-6 font-medium text-foreground">{item.medicineName}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{item.genericName}</TableCell>
                <TableCell className="hidden md:table-cell font-mono text-xs">{item.batchNumber}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantityTaken}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantityDispensed}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{remaining}</TableCell>
                {canEdit && (
                  <TableCell className="pr-6">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}