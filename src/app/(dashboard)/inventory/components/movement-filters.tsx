"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSections, getCartons } from "@/lib/offline/warehouse-repository";
import { useEffect, useState } from "react";
import type { MovementFilters } from "@/types";
import { DEFAULT_MOVEMENT_FILTERS } from "@/types";

interface Props {
  filters: MovementFilters;
  onFiltersChange: (filters: MovementFilters) => void;
}

export function MovementFiltersComponent({ filters, onFiltersChange }: Props) {
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [cartons, setCartons] = useState<Array<{ id: string; code: string; label: string; sectionId: string | null }>>([]);

  useEffect(() => {
    Promise.all([getSections(), getCartons()]).then(([secs, carts]) => {
      setSections(secs.map((s) => ({ id: s.id, name: s.name })));
      setCartons(carts.map((c) => ({ id: c.id, code: c.code, label: c.label, sectionId: c.sectionId })));
    });
  }, []);

  const filteredCartons = filters.section && filters.section !== "all"
    ? cartons.filter((c) => c.sectionId === filters.section)
    : cartons;

  const hasActiveFilters =
    filters.section !== "all" ||
    filters.type !== "all" ||
    filters.medicineSearch ||
    filters.batchSearch;

  function update(partial: Partial<MovementFilters>) {
    onFiltersChange({ ...filters, ...partial });
  }

  function clearAll() {
    onFiltersChange(DEFAULT_MOVEMENT_FILTERS);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.medicineSearch}
            onChange={(e) => update({ medicineSearch: e.target.value })}
            placeholder="Search medicine..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="relative w-full sm:w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.batchSearch}
            onChange={(e) => update({ batchSearch: e.target.value })}
            placeholder="Batch #"
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.section || "all"}
          onValueChange={(v) => update({ section: v })}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.type || "all"} onValueChange={(v) => update({ type: v })}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="DONATION_IN">Donation In</SelectItem>
            <SelectItem value="CONVOY_OUT">Convoy Out</SelectItem>
            <SelectItem value="RETURN_TO_WAREHOUSE">Return</SelectItem>
            <SelectItem value="ADJUSTMENT_IN">Adjustment In</SelectItem>
            <SelectItem value="ADJUSTMENT_OUT">Adjustment Out</SelectItem>
            <SelectItem value="DISPENSE">Dispense</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent/50 transition-colors text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}