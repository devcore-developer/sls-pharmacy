"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Pencil, Package, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/shared/loading-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { getCartonById, getCartonContents, getBatchLocationHistory } from "@/lib/offline/warehouse-repository";
import { moveBatchCarton } from "@/lib/offline/warehouse-repository";
import { formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DeactivateCartonDialog } from "../components/deactivate-carton-dialog";
import { MoveBatchDialog } from "../components/move-batch-dialog";
import type { CartonDetail, CartonContentItem, LocationHistoryEntry } from "@/types";

export default function CartonDetailPage() {
  const params = useParams();
  const cartonId = params.id as string;
  const [carton, setCarton] = useState<CartonDetail | null>(null);
  const [contents, setContents] = useState<CartonContentItem[]>([]);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [moveBatch, setMoveBatch] = useState<CartonContentItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [detail, cont] = await Promise.all([
      getCartonById(cartonId),
      getCartonContents(cartonId),
    ]);
    setCarton(detail);
    setContents(cont);
    setLoading(false);
  }, [cartonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMoveBatch = async (batchId: string, toCartonId: string, note?: string) => {
    const result = await moveBatchCarton(batchId, toCartonId, note);
    if (result.success) {
      setMoveBatch(null);
      loadData();
    }
    return result;
  };

  if (loading) return <LoadingState message="Loading carton..." />;

  if (!carton) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Carton not found.</p>
        <Link href="/inventory/cartons">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cartons
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        href="/inventory/cartons"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Cartons
      </Link>

      {/* Carton Header */}
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">{carton.code}</h1>
            <p className="text-sm text-muted-foreground">{carton.label}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={carton.isActive ? "default" : "secondary"} className="text-xs">
              {carton.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        {carton.sectionName && (
          <p className="text-xs text-muted-foreground">Section: {carton.sectionName}</p>
        )}
        {carton.locationNote && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {carton.locationNote}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Batches</p>
          <p className="text-lg font-bold text-foreground tabular-nums">{carton.batchCount}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Units</p>
          <p className="text-lg font-bold text-foreground tabular-nums">{carton.totalUnits}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Expiring Soon</p>
          <p className="text-lg font-bold text-warning tabular-nums">{carton.expiringSoonCount}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Expired</p>
          <p className="text-lg font-bold text-destructive tabular-nums">{carton.expiredCount}</p>
        </div>
      </div>

      {/* Actions */}
      {carton.isActive && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/inventory/cartons/${carton.id}/edit`}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeactivateOpen(true)}
          >
            Deactivate
          </Button>
        </div>
      )}

      <Separator />

      {/* Contents */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Contents ({contents.length})</h2>
        {contents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No batches in this carton.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pl-6">Medicine</th>
                    <th className="text-left">Generic</th>
                    <th className="text-left">Batch</th>
                    <th className="text-right">Expiry</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right pr-6">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contents.map((item) => (
                    <tr
                      key={item.batchId}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="text-left pl-6">
                        <Link
                          href={`/medicines/${item.medicineId}`}
                          className="text-sm font-medium text-foreground hover:underline"
                        >
                          {item.medicineName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{item.genericName}</p>
                      </td>
                      <td className="text-left font-mono text-xs">{item.batchNumber}</td>
                      <td className="text-right text-xs">{formatDate(item.expiryDate)}</td>
                      <td className="text-right font-medium tabular-nums">{item.quantity}</td>
                      <td className="text-right pr-6">
                        <StatusBadge status={item.expiryStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {contents.map((item) => (
                <div key={item.batchId} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.medicineName}</p>
                      <p className="text-xs text-muted-foreground">{item.genericName}</p>
                    </div>
                    <StatusBadge status={item.expiryStatus} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{item.batchNumber}</span>
                    <span>{formatDate(item.expiryDate)}</span>
                    <span className="font-medium text-foreground tabular-nums">{item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Deactivate Dialog */}
      <DeactivateCartonDialog
        carton={
          carton
            ? {
                id: carton.id,
                code: carton.code,
                label: carton.label,
                batchCount: carton.batchCount,
              }
            : null
        }
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        onDeactivated={loadData}
      />

      {/* Move Batch Dialog */}
      {moveBatch && (
        <MoveBatchDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setMoveBatch(null);
          }}
          batchId={moveBatch.batchId}
          currentCartonId={cartonId}
          currentCartonCode={carton.code}
          medicineName={moveBatch.medicineName}
          batchNumber={moveBatch.batchNumber}
          quantity={moveBatch.quantity}
          onMoved={() => handleMoveBatch(moveBatch.batchId, "")}
        />
      )}
    </div>
  );
}