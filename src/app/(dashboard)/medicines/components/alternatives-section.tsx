"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { getAlternativesForMedicine, removeAlternative } from "@/lib/offline/alternative-repository";
import { AddAlternativeDialog } from "./add-alternative-dialog";
import type { MedicineAlternativeItem } from "@/types";

interface AlternativesSectionProps {
  medicineId: string;
  onSavedLocally: () => void;
}

export function AlternativesSection({ medicineId, onSavedLocally }: AlternativesSectionProps) {
  const [alternatives, setAlternatives] = useState<MedicineAlternativeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadAlternatives = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAlternativesForMedicine(medicineId);
      setAlternatives(data);
    } finally {
      setLoading(false);
    }
  }, [medicineId]);

  useEffect(() => { loadAlternatives(); }, [loadAlternatives]);

  async function handleRemove(alt: MedicineAlternativeItem) {
    setRemovingId(alt.id);
    try {
      await removeAlternative(alt.id, medicineId, alt.alternativeMedicineId);
      await loadAlternatives();
      onSavedLocally();
    } finally {
      setRemovingId(null);
    }
  }

  function handleAdded() {
    setShowAdd(false);
    loadAlternatives();
    onSavedLocally();
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Configured Alternatives
          </h3>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <span className="text-sm">+</span>
            Add
          </Button>
        </div>

        {loading ? (
          <LoadingState message="" />
        ) : alternatives.length === 0 ? (
          <EmptyState
            icon={ArrowRightLeft}
            title="No alternatives configured"
            description="Manually add alternative medicines that can be suggested as substitutes."
          />
        ) : (
          <div className="overflow-x-auto -mx-6 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trade Name</TableHead>
                  <TableHead>Generic Name</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Nearest Expiry</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alternatives.map((alt) => (
                  <TableRow key={alt.id || alt.alternativeMedicineId}>
                    <TableCell className="font-medium text-foreground">{alt.tradeName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{alt.genericName}</TableCell>
                    <TableCell className="text-right tabular-nums">{alt.totalQuantity}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{alt.nearestExpiry ? formatDate(alt.nearestExpiry) : "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(alt)}
                        disabled={removingId === alt.id}
                      >
                        ×
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AddAlternativeDialog
        medicineId={medicineId}
        open={showAdd}
        onOpenChange={setShowAdd}
        onAdded={handleAdded}
      />
    </>
  );
}