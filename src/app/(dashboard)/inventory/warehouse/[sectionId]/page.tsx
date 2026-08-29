"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Box, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { getSectionDetail, getSectionCartons } from "@/lib/offline/warehouse-repository";
import { formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { SectionDetail, SectionCartonItem } from "@/types";

export default function SectionDetailPage() {
  const params = useParams();
  const sectionId = params.id as string;
  const [section, setSection] = useState<SectionDetail | null>(null);
  const [cartons, setCartons] = useState<SectionCartonItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSectionDetail(sectionId), getSectionCartons(sectionId)]).then(
      ([detail, carts]) => {
        setSection(detail);
        setCartons(carts);
        setLoading(false);
      }
    );
  }, [sectionId]);

  if (loading) return <LoadingState message="Loading section..." />;

  if (!section) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Section not found.</p>
        <Link href="/inventory/warehouse">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Warehouse
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        href="/inventory/warehouse"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Warehouse
      </Link>

      {/* Section Header */}
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">{section.name}</h1>
            <p className="text-sm text-muted-foreground font-mono">{section.code}</p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {section.organizationType}
          </Badge>
        </div>
        {section.description && (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm pt-2">
          <span className="text-muted-foreground">Batches</span>
          <span className="font-semibold text-foreground tabular-nums">{section.batchCount}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-semibold text-foreground tabular-nums">{section.totalUnits}</span>
          <span className="text-muted-foreground">units</span>
        </div>
        {section.expiringSoonCount > 0 && (
          <p className="text-sm text-warning">
            ⚠ {section.expiringSoonCount} batch{section.expiringSoonCount !== 1 ? "es" : ""} expiring within 90 days
          </p>
        )}
        {section.expiredCount > 0 && (
          <p className="text-sm text-destructive">
            ✕ {section.expiredCount} expired batch{section.expiredCount !== 1 ? "es" : ""}
          </p>
        )}
      </div>

      {/* Cartons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Cartons ({section.cartonCount})
          </h2>
          <Link href={`/inventory/cartons/new?sectionId=${section.id}`}>
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Carton
            </Button>
          </Link>
        </div>

        {cartons.length === 0 ? (
          <EmptyState
            icon={Box}
            title="No cartons in this section"
            description="Add a carton to start organizing stock."
            action={{
              label: "Add Carton",
              onClick: () => {
                window.location.href = `/inventory/cartons/new?sectionId=${section.id}`;
              },
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cartons.map((carton) => (
              <Link
                key={carton.id}
                href={`/inventory/cartons/${carton.id}`}
                className="rounded-lg border p-4 space-y-2 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-medium text-foreground">{carton.code}</p>
                    <p className="text-xs text-muted-foreground truncate">{carton.label}</p>
                  </div>
                  <Badge
                    variant={carton.isActive ? "default" : "secondary"}
                    className="text-[10px] shrink-0"
                  >
                    {carton.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {carton.locationNote && (
                  <p className="text-xs text-muted-foreground truncate">{carton.locationNote}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {carton.batchCount} batch{carton.batchCount !== 1 ? "es" : ""}
                  </span>
                  <span>·</span>
                  <span className="font-semibold text-foreground tabular-nums">{carton.totalUnits}</span>
                  <span>units</span>
                </div>
                {carton.expiringSoonCount > 0 && (
                  <p className="text-xs text-warning">{carton.expiringSoonCount} expiring soon</p>
                )}
                {carton.expiredCount > 0 && (
                  <p className="text-xs text-destructive">{carton.expiredCount} expired</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}