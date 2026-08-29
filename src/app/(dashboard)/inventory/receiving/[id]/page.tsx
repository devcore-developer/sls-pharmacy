// src/app/(dashboard)/inventory/receiving/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/shared/loading-state";
import { getReceiptById } from "@/lib/offline/stock-receipt-repository";
import { formatDate } from "@/lib/utils";
import { RECEIPT_SOURCE_TYPES } from "@/types";
import type { ReceiptDetail } from "@/types";
import { useParams } from "next/navigation";
import Link from "next/link";

const sourceLabels: Record<string, string> = {
  DONATION: "Donation",
  SUPPLY: "Supply",
  OTHER: "Other",
};

export default function ReceiptDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReceiptById(id).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <LoadingState message="Loading receipt..." />;
  if (!data) return <p className="text-sm text-muted-foreground text-center py-12">Receipt not found.</p>;

  const totalUnits = data.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link href="/inventory/receiving" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Receipts
      </Link>

      <div className="rounded-lg border p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="font-mono text-lg font-bold">{data.receiptNumber}</p>
            <p className="text-sm text-muted-foreground">{formatDate(new Date(data.date))}</p>
          </div>
          <Badge variant="outline">{sourceLabels[data.sourceType] || data.sourceType}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {data.sourceName && (
            <div>
              <p className="text-xs text-muted-foreground">Source</p>
              <p className="font-medium">{data.sourceName}</p>
            </div>
          )}
          {data.responsiblePerson && (
            <div>
              <p className="text-xs text-muted-foreground">Responsible</p>
              <p className="font-medium">{data.responsiblePerson}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="font-medium">{formatDate(data.createdAt)}</p>
          </div>
        </div>

        {data.notes && (
          <>
            <Separator />
            <p className="text-sm text-muted-foreground">{data.notes}</p>
          </>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Items</h3>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{data.items.length} item{data.items.length !== 1 ? "s" : ""}</span>
            <span className="font-semibold tabular-nums">{totalUnits.toLocaleString()} units</span>
          </div>
        </div>

        {data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No items in this receipt.</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground px-6 py-3">Medicine</th>
                    <th className="text-left font-medium text-muted-foreground px-6 py-3">Batch</th>
                    <th className="text-left font-medium text-muted-foreground px-6 py-3">Expiry</th>
                    <th className="text-right font-medium text-muted-foreground px-6 py-3">Quantity</th>
                    <th className="text-left font-medium text-muted-foreground px-6 py-3">Carton</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-6 py-3">
                        <p className="font-medium text-foreground">{item.medicineName}</p>
                        <p className="text-xs text-muted-foreground">{item.genericName}</p>
                      </td>
                      <td className="px-6 py-3 font-mono text-xs">{item.batchNumber}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{formatDate(item.expiryDate)}</td>
                      <td className="px-6 py-3 text-right font-semibold tabular-nums">+{item.quantity}</td>
                      <td className="px-6 py-3 text-xs">{item.cartonCode || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {data.items.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.medicineName}</p>
                      <p className="text-xs text-muted-foreground">{item.genericName}</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-success shrink-0">+{item.quantity}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono">{item.batchNumber}</span>
                    <span>Exp: {formatDate(item.expiryDate)}</span>
                    {item.cartonCode && <span>Carton: {item.cartonCode}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}