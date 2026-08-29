"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
    >
      {label}
      <X className="h-3 w-3" />
    </button>
  );
}

interface ClearAllProps {
  onClear: () => void;
}

export function ClearAllFilters({ onClear }: ClearAllProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
      onClick={onClear}
    >
      Clear all
    </Button>
  );
}