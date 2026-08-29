"use client";

import { Eye, Pencil, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { timeAgo } from "@/lib/utils";
import type { MedicineWithRelations } from "@/types";

interface MedicineMobileListProps {
  medicines: MedicineWithRelations[];
  onView: (m: MedicineWithRelations) => void;
  onEdit: (m: MedicineWithRelations) => void;
  onArchive: (m: MedicineWithRelations) => void;
}

export function MedicineMobileList({
  medicines,
  onView,
  onEdit,
  onArchive,
}: MedicineMobileListProps) {
  if (medicines.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No medicines found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {medicines.map((med) => (
        <div
          key={med.id}
          className="rounded-lg border p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {med.tradeName}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {med.genericName}
              </p>
            </div>
            <StatusBadge
              status={med.archivedAt ? "archived" : "active"}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {med.pharmacologicalClasses.map((c) => (
              <Badge key={c.id} variant="outline" className="font-normal text-[11px]">
                {c.name}
              </Badge>
            ))}
            {med.categories.map((c) => (
              <Badge key={c.id} variant="secondary" className="font-normal text-[11px]">
                {c.name}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              {timeAgo(med.updatedAt)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onView(med)}
                aria-label="View"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(med)}
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onArchive(med)}
                aria-label="Archive"
              >
                <Archive className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}