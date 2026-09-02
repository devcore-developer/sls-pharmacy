"use client";

import { ArrowUpCircle, ArrowDownCircle, MinusCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateShort } from "@/lib/date-utils";
import type { RecentMovementItem } from "@/lib/offline/dashboard-repository";

const dirConfig: Record<string, { icon: typeof ArrowUpCircle; color: string; bg: string }> = {
  IN: { icon: ArrowUpCircle, color: "text-success", bg: "bg-success/10" },
  OUT: { icon: ArrowDownCircle, color: "text-destructive", bg: "bg-destructive/10" },
  NEUTRAL: { icon: MinusCircle, color: "text-muted-foreground", bg: "bg-muted" },
};

export function RecentActivitySection({
  movements,
}: {
  movements: RecentMovementItem[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>
          Recent Stock Activity
        </CardTitle>
        <a
          href="/inventory/movements"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View All <ArrowRight className="h-3 w-3" />
        </a>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No stock movements yet. Stock activity will appear here once inventory operations begin.
          </p>
        ) : (
          <div className="space-y-1">
            {movements.map((m) => {
              const cfg = dirConfig[m.direction] || dirConfig.NEUTRAL;
              const Icon = cfg.icon;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2 -mx-2.5 hover:bg-muted/50 transition-colors cursor-default"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${cfg.color}`} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.medicineName}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.typeLabel}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${cfg.color}`}>
                      {m.direction === "IN" ? "+" : m.direction === "OUT" ? "-" : ""}
                      {m.quantity}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateShort(m.date)}
                    </p>
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