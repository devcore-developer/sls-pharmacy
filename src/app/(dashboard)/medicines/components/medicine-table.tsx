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
import { StatusBadge } from "@/components/shared/status-badge";
import { timeAgo } from "@/lib/utils";
import type { MedicineWithRelations } from "@/types";

interface MedicineTableProps {
  medicines: MedicineWithRelations[];
  onView: (m: MedicineWithRelations) => void;
  onEdit: (m: MedicineWithRelations) => void;
  onArchive: (m: MedicineWithRelations) => void;
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
            <TableHead>Generic Name</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right pr-6">Updated</TableHead>
            <TableHead className="w-12 pr-6"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {medicines.map((med) => (
            <TableRow key={med.id}>
              <TableCell className="pl-6 font-medium text-foreground">
                {med.tradeName}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {med.genericName}
              </TableCell>
              <TableCell>
                {med.pharmacologicalClasses.length > 0 ? (
                  <Badge variant="outline" className="font-normal">
                    {med.pharmacologicalClasses[0].name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {med.categories.slice(0, 2).map((c) => (
                    <Badge
                      key={c.id}
                      variant="secondary"
                      className="font-normal text-[11px]"
                    >
                      {c.name}
                    </Badge>
                  ))}
                  {med.categories.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{med.categories.length - 2}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={med.archivedAt ? "archived" : "active"}
                />
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
                      aria-label="Actions for ${med.tradeName}"
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}