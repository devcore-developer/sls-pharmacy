"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { getAllMedicines } from "@/lib/offline/medicine-repository";
import { addAlternative } from "@/lib/offline/alternative-repository";
import type { MedicineWithRelations } from "@/types";

interface AddAlternativeDialogProps {
  medicineId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export function AddAlternativeDialog({
  medicineId,
  open,
  onOpenChange,
  onAdded,
}: AddAlternativeDialogProps) {
  const [medicines, setMedicines] = useState<MedicineWithRelations[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError("");
      setSearch("");
      getAllMedicines().then(setMedicines);
    }
  }, [open]);

  const filtered = search
    ? medicines.filter(
        (m) =>
          m.id !== medicineId &&
          (m.tradeName.toLowerCase().includes(search.toLowerCase()) ||
            m.genericName.toLowerCase().includes(search.toLowerCase()))
      )
    : medicines.filter((m) => m.id !== medicineId);

  async function handleAdd(med: MedicineWithRelations) {
    setAdding(med.id);
    setError("");
    try {
      const result = await addAlternative(medicineId, med.id);
      if (result.success) {
        onAdded();
      } else {
        setError(result.error || "Failed to add alternative.");
      }
    } finally {
      setAdding(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Alternative</DialogTitle>
          <DialogDescription>
            Select a medicine to add as a configured alternative.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicines..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="max-h-[40vh] overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No medicines found.</p>
          ) : (
            filtered.map((med) => (
              <div
                key={med.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{med.tradeName}</p>
                  <p className="text-xs text-muted-foreground truncate">{med.genericName}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-7 text-xs"
                  onClick={() => handleAdd(med)}
                  disabled={adding === med.id}
                >
                  {adding === med.id ? "..." : "Add"}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}