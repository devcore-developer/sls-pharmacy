"use client";

import { MoreHorizontal, Eye, Pencil, Archive } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";
import type { MedicineListItem } from "@/types";

interface MedicineTableProps {
  medicines: MedicineListItem[];
  onView: (m: MedicineListItem["medicine"]) => void;
  onEdit: (m: MedicineListItem["medicine"]) => void;
  onArchive: (m: MedicineListItem["medicine"]) => void;
}

export function MedicineTable({
  medicines,
  onView,
  onEdit,
  onArchive,
}: MedicineTableProps) {
  if (medicines.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No medicines found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Medicine</TableHead>
            <TableHead>Scientific Name</TableHead>
            <TableHead>Strength</TableHead>
            <TableHead>Form</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Stock Status</TableHead>
            <TableHead className="text-right pr-6">Updated</TableHead>
            <TableHead className="w-12 pr-6"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {medicines.map((item) => {
            const med = item.medicine;
            
            // Determine Stock Status
            let stockBadge = <Badge variant="outline">Unknown</Badge>;
            if (item.totalQuantity <= 0) {
              stockBadge = <Badge variant="destructive">Out of Stock</Badge>;
            } else if (item.totalQuantity <= 10) { 
              stockBadge = <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
            } else {
              stockBadge = <Badge variant="secondary" className="bg-green-100 text-green-800">In Stock</Badge>;
            }

            return (
              <TableRow key={med.id}>
                <TableCell className="pl-6 font-medium text-foreground">
                  {med.tradeName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {med.genericName || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {med.strength || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {med.dosageForm || "—"}
                </TableCell>
                <TableCell>
                  {/* Fixed: Use direct string property from import script */}
                  {med.drugClass ? (
                    <Badge variant="outline" className="font-normal">
                      {med.drugClass}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {/* Fixed: Use direct string property from import script */}
                  {med.category ? (
                    <Badge variant="secondary" className="font-normal text-[11px]">
                      {med.category}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {/* Fixed: Separate Catalog Status from Stock Status */}
                  {stockBadge}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs tabular-nums pr-6">
                  {timeAgo(med.updatedAt)}
                </TableCell>
                <TableCell className="pr-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(med)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(med)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onArchive(med)}
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
  );
}