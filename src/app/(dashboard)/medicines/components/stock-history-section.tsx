// src/app/(dashboard)/medicines/components/stock-history-section.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { History, ArrowUpCircle, ArrowDownCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/loading-state";
import { Badge } from "@/components/ui/badge";
import { getMovementsByMedicine } from "@/lib/offline/stock-movement-repository";
import { formatDate } from "@/lib/utils";
import { getMovementTypeLabel } from "@/lib/offline/stock-utils";
import type { StockMovementListItem } from "@/types";

interface Props {
  medicineId: string;
}

export function StockHistorySection({ medicineId }: Props) {
  const [movements, setMovements] = useState<StockMovementListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getMovementsByMedicine(medicineId, 20);
    setMovements(data);
    setLoading(false);
  }, [medicineId]);

  useEffect(() => {
    load();
  }, [load]);

  const dirIcon = (dir: string) => {
    if (dir === "IN") return <ArrowUpCircle className="h-3.5 w-3.5 text-success" />;
    if (dir === "OUT") return <ArrowDownCircle className="h-3.5 w-3.5 text-destructive" />;
    return <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  if (loading) return <LoadingState message="" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Stock History</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={load}>
          Refresh
        </Button>
      </div>
      {movements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No stock movements yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {movements.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
            >
              {dirIcon(m.direction)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {m.typeLabel}
                  </span>
                  {m.convoyName && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {m.convoyName}
                    </Badge>
                  )}
                </div>
                {m.batchNumber && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {m.batchNumber}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    m.direction === "IN"
                      ? "text-success"
                      : m.direction === "OUT"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {m.direction === "IN" ? "+" : m.direction === "OUT" ? "-" : ""}
                  {m.quantity}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDate(m.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}