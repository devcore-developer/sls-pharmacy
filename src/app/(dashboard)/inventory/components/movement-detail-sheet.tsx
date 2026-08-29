"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Calendar, User, Smartphone, FileText, Truck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getStockMovementById } from "@/lib/offline/stock-movement-repository";
import { formatDate } from "@/lib/utils";
import type { StockMovementDetail } from "@/types";
import { useRouter } from "next/navigation";

interface Props {
  movementId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const dirColors: Record<string, string> = {
  IN: "bg-success/10 text-success border-success/20",
  OUT: "bg-destructive/10 text-destructive border-destructive/20",
  NEUTRAL: "bg-muted text-muted-foreground border-muted",
};

export function MovementDetailSheet({ movementId, open, onOpenChange }: Props) {
  const [detail, setDetail] = useState<StockMovementDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (open && movementId) {
      setLoading(true);
      getStockMovementById(movementId).then((d) => {
        setDetail(d);
        setLoading(false);
      });
    }
    if (!open) setDetail(null);
  }, [open, movementId]);

  if (!detail && !loading) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Movement Details</SheetTitle>
          <SheetDescription>
            {loading ? "Loading..." : `${detail?.typeLabel || "Movement"}`}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="relative h-6 w-6">
              <div className="absolute inset-0 rounded-full border-2 border-muted" />
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={dirColors[detail.direction]} variant="outline">
                {detail.direction === "IN"
                  ? `+${detail.quantity}`
                  : detail.direction === "OUT"
                  ? `-${detail.quantity}`
                  : detail.quantity}{" "}
                units
              </Badge>
              <Badge variant="secondary">{detail.typeLabel}</Badge>
            </div>

            <Separator />

            <div className="space-y-3">
              <DetailRow icon={FileText} label="Medicine" value={detail.medicineName} />
              <DetailRow label="Generic Name" value={detail.genericName} />
              {detail.batchNumber && (
                <DetailRow label="Batch" value={detail.batchNumber} mono />
              )}
              {detail.batchExpiry && (
                <DetailRow label="Batch Expiry" value={formatDate(detail.batchExpiry)} />
              )}
              {detail.cartonCode && (
                <DetailRow label="Carton" value={detail.cartonCode} mono />
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <DetailRow icon={Calendar} label="Date" value={formatDate(detail.date)} />
              <DetailRow icon={User} label="User" value={detail.userName || "System"} />
              <DetailRow icon={Smartphone} label="Device" value={detail.deviceId} />
              {detail.reason && (
                <DetailRow label="Reason" value={detail.reason} />
              )}
              {detail.note && (
                <DetailRow label="Note" value={detail.note} />
              )}
            </div>

            {detail.convoyId && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Related Convoy
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/convoys/${detail.convoyId}`);
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {detail.convoyName || "View Convoy"}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}

            {detail.receiptId && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Related Receipt
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/inventory/receiving/${detail.receiptId}`);
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {detail.receiptNumber || "View Receipt"}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Movement not found.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon?: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-sm text-foreground ${
            mono ? "font-mono" : "font-medium"
          } break-words`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}