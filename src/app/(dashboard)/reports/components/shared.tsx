"use client";

import { useState } from "react";
import { CalendarDays, Download, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/shared/search-input";
import { DATE_PRESET_OPTIONS, type DatePreset } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Date Range Filter                                                  */
/* ------------------------------------------------------------------ */

interface DateRangeFilterProps {
  preset: DatePreset;
  from: Date | null;
  to: Date | null;
  onPresetChange: (preset: DatePreset) => void;
  onFromChange: (date: Date | null) => void;
  onToChange: (date: Date | null) => void;
}

export function DateRangeFilter({ preset, from, to, onPresetChange, onFromChange, onToChange }: DateRangeFilterProps) {
  const isCustom = preset === "all" && (from || to);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-[160px]">
        <Select value={preset} onValueChange={(v) => onPresetChange(v as DatePreset)}>
          <SelectTrigger className="h-9 text-xs">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESET_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(preset === "all" || isCustom) && (
        <>
          <div className="w-[140px]">
            <Input
              type="date"
              value={from ? from.toISOString().split("T")[0] : ""}
              onChange={(e) => onFromChange(e.target.value ? new Date(e.target.value + "T00:00:00") : null)}
              className="h-9 text-xs"
              placeholder="From"
            />
          </div>
          <div className="w-[140px]">
            <Input
              type="date"
              value={to ? to.toISOString().split("T")[0] : ""}
              onChange={(e) => onToChange(e.target.value ? new Date(e.target.value + "T23:59:59") : null)}
              className="h-9 text-xs"
              placeholder="To"
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Report Select                                                      */
/* ------------------------------------------------------------------ */

interface ReportSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  width?: string;
}

export function ReportSelect({ value, onValueChange, options, placeholder = "All", className, width = "w-[160px]" }: ReportSelectProps) {
  return (
    <div className={cn(width, className)}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">{placeholder}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Export Button                                                      */
/* ------------------------------------------------------------------ */

type ExportState = "idle" | "preparing" | "ready" | "error";

interface ExportButtonProps {
  state: ExportState;
  onExport: () => void;
  label?: string;
}

export function ExportButton({ state, onExport, label = "Export CSV" }: ExportButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onExport}
      disabled={state === "preparing"}
      className="gap-1.5 text-xs"
    >
      {state === "idle" && <Download className="h-3.5 w-3.5" />}
      {state === "preparing" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {state === "ready" && <Check className="h-3.5 w-3.5 text-green-600" />}
      {state === "error" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
      {state === "idle" && label}
      {state === "preparing" && "Preparing export..."}
      {state === "ready" && "Export ready"}
      {state === "error" && "Export failed"}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter Section                                                     */
/* ------------------------------------------------------------------ */

interface FilterSectionProps {
  children: React.ReactNode;
}

export function FilterSection({ children }: FilterSectionProps) {
  return (
    <div className="flex flex-wrap items-end gap-2 p-4 rounded-lg border bg-card">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Badges                                                      */
/* ------------------------------------------------------------------ */

export function ExpiryBadge({ status }: { status: string }) {
  const variants: Record<string, "destructive" | "warning" | "success"> = {
    expired: "destructive",
    expiring_soon: "warning",
    valid: "success",
  };
  const labels: Record<string, string> = {
    expired: "Expired",
    expiring_soon: "Expiring Soon",
    valid: "Valid",
  };
  return <Badge variant={variants[status] || "secondary"} className="text-[10px] px-1.5">{labels[status] || status}</Badge>;
}

export function StockBadge({ status }: { status: string }) {
  const variants: Record<string, "destructive" | "warning" | "success" | "secondary"> = {
    out_of_stock: "destructive",
    low_stock: "warning",
    in_stock: "success",
  };
  const labels: Record<string, string> = {
    out_of_stock: "Out of Stock",
    low_stock: "Low Stock",
    in_stock: "In Stock",
  };
  return <Badge variant={variants[status] || "secondary"} className="text-[10px] px-1.5">{labels[status] || status}</Badge>;
}

export function ConvoyStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "warning" | "success" | "secondary"> = {
    DRAFT: "secondary",
    ACTIVE: "warning",
    COMPLETED: "success",
  };
  return <Badge variant={variants[status] || "secondary"} className="text-[10px] px-1.5">{status}</Badge>;
}

export function DirectionBadge({ direction }: { direction: string }) {
  const variants: Record<string, "success" | "destructive" | "secondary"> = {
    IN: "success",
    OUT: "destructive",
    NEUTRAL: "secondary",
  };
  return <Badge variant={variants[direction] || "secondary"} className="text-[10px] px-1.5">{direction}</Badge>;
}

/* ------------------------------------------------------------------ */
/*  Loading Spinner                                                    */
/* ------------------------------------------------------------------ */

export function ReportLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="relative h-8 w-8">
        <div className="absolute inset-0 rounded-full border-2 border-muted" />
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </div>
  );
}