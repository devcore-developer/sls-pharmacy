// src/app/(dashboard)/inventory/receiving/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Plus, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Badge } from "@/components/ui/badge";
import { getAllReceipts } from "@/lib/offline/stock-receipt-repository";
import { formatDate } from "@/lib/utils";
import { RECEIPT_SOURCE_TYPES } from "@/types";
import type { ReceiptListItem } from "@/types";
import Link from "next/link";

const sourceLabels: Record<string, string> = {
  DONATION: "Donation",
  SUPPLY: "Supply",
  OTHER: "Other",
};

export default function ReceivingPage() {
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllReceipts().then((r) => {
      setReceipts(r);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState message="Loading receipts..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receive Stock"
        description="Record donated and incoming medicines into the warehouse."
        action={
          <Link href="/inventory/receiving/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Receipt
            </Button>
          </Link>
        }
      />

      {receipts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No stock receipts yet"
          description="Create your first receipt to start recording incoming medicines."
          action={{
            label: "Create First Receipt",
            onClick: () => {
              window.location.href = "/inventory/receiving/new";
            },
          }}
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium text-muted-foreground px-6 py-3">Receipt #</th>
                  <th className="text-left font-medium text-muted-foreground px-6 py-3">Date</th>
                  <th className="text-left font-medium text-muted-foreground px-6 py-3">Source</th>
                  <th className="text-right font-medium text-muted-foreground px-6 py-3">Items</th>
                  <th className="text-right font-medium text-muted-foreground px-6 py-3">Total Units</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/inventory/receiving/${r.id}`}>
                    <td className="px-6 py-3 font-mono font-medium text-foreground">{r.receiptNumber}</td>
                    <td className="px-6 py-3 text-muted-foreground">{formatDate(new Date(r.date))}</td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {sourceLabels[r.sourceType] || r.sourceType}
                      </Badge>
                      {r.sourceName && (
                        <span className="ml-2 text-xs text-muted-foreground">{r.sourceName}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">{r.itemCount}</td>
                    <td className="px-6 py-3 text-right font-medium tabular-nums">{r.totalUnits.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {receipts.map((r) => (
              <Link key={r.id} href={`/inventory/receiving/${r.id}`} className="block rounded-lg border p-4 space-y-2 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <p className="font-mono text-sm font-semibold text-foreground">{r.receiptNumber}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {sourceLabels[r.sourceType] || r.sourceType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(new Date(r.date))}</p>
                {r.sourceName && (
                  <p className="text-xs text-muted-foreground">{r.sourceName}</p>
                )}
                <div className="flex items-center gap-4 text-xs">
                  <span><strong className="text-foreground tabular-nums">{r.itemCount}</strong> items</span>
                  <span><strong className="text-foreground tabular-nums">{r.totalUnits.toLocaleString()}</strong> units</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}