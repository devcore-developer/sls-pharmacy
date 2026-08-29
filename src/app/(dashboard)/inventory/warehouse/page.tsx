"use client";

import { useState, useEffect } from "react";
import { Layers, Box, Package, Truck, AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWarehouseOverview, getSections, getUnassignedBatches } from "@/lib/offline/warehouse-repository";
import { formatDate } from "@/lib/utils";
import type { WarehouseOverview, StorageSectionItem, UnassignedBatch } from "@/types";

export default function WarehousePage() {
  const [overview, setOverview] = useState<WarehouseOverview | null>(null);
  const [sections, setSections] = useState<StorageSectionItem[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getWarehouseOverview(), getSections(), getUnassignedBatches()]).then(
      ([ov, secs, unass]) => {
        setOverview(ov);
        setSections(secs);
        setUnassigned(unass);
        setLoading(false);
      }
    );
  }, []);

  if (loading) return <LoadingState message="Loading warehouse..." />;
  if (!overview) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse"
        description="Organize storage sections, cartons, and batch locations."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Sections" value={overview.totalSections} icon={Layers} variant="default" description="Active" />
        <StatCard title="Cartons" value={overview.totalCartons} icon={Box} variant="info" description={`${overview.occupiedCartons} occupied`} />
        <StatCard title="Empty" value={overview.emptyCartons} icon={Box} variant="warning" description="Available" />
        <StatCard title="Batches" value={overview.totalBatches} icon={Package} variant="default" description="Active" />
        <StatCard title="Units" value={overview.totalUnits} icon={Package} variant="info" description="Total stock" />
        <StatCard title="Convoys" value={overview.activeConvoys} icon={Truck} variant="success" description="Active" />
      </div>

      {/* Storage Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Storage Sections</h2>
          <Link href="/inventory/warehouse/new-section">
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Section
            </Button>
          </Link>
        </div>

        {sections.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No storage sections yet"
            description="Create sections to organize your warehouse."
            action={{
              label: "Create Section",
              onClick: () => {
                window.location.href = "/inventory/warehouse/new-section";
              },
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sections.map((section) => (
              <Link
                key={section.id}
                href={`/inventory/warehouse/${section.id}`}
                className="rounded-lg border p-4 space-y-2 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{section.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{section.code}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {section.organizationType}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {section.cartonCount} carton{section.cartonCount !== 1 ? "s" : ""}
                  </span>
                  <span>·</span>
                  <span>
                    {section.batchCount} batch{section.batchCount !== 1 ? "es" : ""}
                  </span>
                  <span>·</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {section.totalUnits} units
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Unassigned Stock */}
      {unassigned.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Unassigned Stock
            <Badge variant="warning" className="text-xs">
              {unassigned.length}
            </Badge>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {unassigned.slice(0, 6).map((item) => (
              <div
                key={item.batchId}
                className="rounded-lg border border-warning/20 bg-warning/5 p-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground truncate">{item.medicineName}</p>
                  <span className="text-sm font-semibold tabular-nums shrink-0">{item.quantity}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.genericName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{item.batchNumber}</span>
                  <span>·</span>
                  <span>{formatDate(item.expiryDate)}</span>
                </div>
              </div>
            ))}
          </div>
          {unassigned.length > 6 && (
            <p className="text-xs text-muted-foreground text-center">
              + {unassigned.length - 6} more unassigned batches
            </p>
          )}
        </div>
      )}
    </div>
  );
}