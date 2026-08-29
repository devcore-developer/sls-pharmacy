"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { getSections, getCartons } from "@/lib/offline/warehouse-repository";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { CartonListItem, StorageSectionItem } from "@/types";

export default function CartonsPage() {
  const [sections, setSections] = useState<StorageSectionItem[]>([]);
  const [cartons, setCartons] = useState<CartonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [searchMode, setSearchMode] = useState<"cartons" | "contents">("cartons");

  useEffect(() => {
    Promise.all([getSections(), getCartons()]).then(([secs, carts]) => {
      setSections(secs);
      setCartons(carts);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (searchMode === "cartons") {
      let result = cartons;
      if (search.trim()) {
        const q = search.toLowerCase();
        result = result.filter(
          (c) =>
            c.code.toLowerCase().includes(q) ||
            c.label.toLowerCase().includes(q) ||
            (c.sectionName?.toLowerCase().includes(q) ?? false)
        );
      }
      if (sectionFilter !== "all") {
        result = result.filter((c) => c.sectionId === sectionFilter);
      }
      return result;
    }
    return cartons; // contents mode handled separately
  }, [cartons, search, searchMode, sectionFilter]);

  if (loading) return <LoadingState message="Loading cartons..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartons"
        description="Manage storage cartons and their batch contents."
        action={
          <Link href="/inventory/cartons/new">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Carton
            </Button>
          </Link>
        }
      />

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchMode("cartons");
              }}
              placeholder="Search by code, label, or section..."
              className="pl-9"
            />
          </div>
        </div>
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[180px] text-xs">
            <SelectValue placeholder="All Sections" />
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
      </div>

      {/* Filter chips */}
      {(search || sectionFilter !== "all") && (
        <div className="flex flex-wrap items-center gap-2">
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent/50 transition-colors"
            >
              Search: &quot;{search}&quot; ×
            </button>
          )}
          {sectionFilter !== "all" && (
            <button
              type="button"
              onClick={() => setSectionFilter("all")}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent/50 transition-colors"
            >
              Section: {sections.find((s) => s.id === sectionFilter)?.name || "Unknown"} ×
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSectionFilter("all");
            }}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent/50 transition-colors text-muted-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Box}
          title="No cartons found"
          description={
            search || sectionFilter !== "all"
              ? "No matches for your filters."
              : "Create your first carton to start organizing."
          }
          action={
            !search && sectionFilter === "all"
              ? {
                  label: "Create Carton",
                  onClick: () => {
                    window.location.href = "/inventory/cartons/new";
                  },
                }
              : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pl-6">Code</th>
                  <th className="text-left">Label</th>
                  <th className="text-left">Section</th>
                  <th className="text-left">Location</th>
                  <th className="text-right">Batches</th>
                  <th className="text-right pr-6">Units</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => {
                      window.location.href = `/inventory/cartons/${c.id}`;
                    }}
                  >
                    <td className="text-left pl-6 font-mono font-medium text-foreground">
                      {c.code}
                    </td>
                    <td className="text-left">{c.label}</td>
                    <td className="text-xs text-muted-foreground">{c.sectionName || "—"}</td>
                    <td className="text-xs text-muted-foreground">{c.locationNote || "—"}</td>
                    <td className="text-right tabular-nums">{c.batchCount}</td>
                    <td className="text-right pr-6 font-medium tabular-nums">{c.totalUnits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/inventory/cartons/${c.id}`}
                className="block rounded-lg border p-3 space-y-2 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium text-foreground">{c.code}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                  </div>
                  <Badge
                    variant={c.isActive ? "default" : "secondary"}
                    className="text-[10px] shrink-0"
                  >
                    {c.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {c.sectionName || "No section"}
                  {c.locationNote && ` · ${c.locationNote}`}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {c.batchCount} batch{c.batchCount !== 1 ? "es" : ""}
                  </span>
                  <span>·</span>
                  <span className="font-semibold text-foreground tabular-nums">{c.totalUnits}</span>
                  <span>units</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}