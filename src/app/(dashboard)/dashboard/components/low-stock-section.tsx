"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LOW_STOCK_THRESHOLD } from "@/lib/offline/stock-utils";
import type { LowStockItem } from "@/lib/offline/dashboard-repository";

export function LowStockSection({ items }: { items: LowStockItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Low Stock
          {items.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground font-normal">
              Threshold: {LOW_STOCK_THRESHOLD}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            All medicines are above threshold.
          </p>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-thin pt-1">
            {items.map((item) => {
              const pct = Math.round((item.currentStock / item.threshold) * 100);
              return (
                <div key={item.medicineId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate max-w-[65%]">
                      {item.medicineName}
                    </p>
                    <span className="text-sm font-semibold tabular-nums text-warning">
                      {item.currentStock}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct <= 25
                            ? "bg-destructive"
                            : pct <= 50
                            ? "bg-warning"
                            : "bg-warning/60"
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-16 text-right">
                      {item.currentStock} / {item.threshold}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}