"use client";

import { AlertTriangle, XCircle, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type {
  ExpiryAlertItem,
  ExpiredBatchItem,
} from "@/lib/offline/dashboard-repository";

const priorityConfig = {
  CRITICAL: {
    label: "Critical",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: XCircle,
  },
  WARNING: {
    label: "Warning",
    className: "bg-warning/10 text-warning border-warning/20",
    icon: AlertTriangle,
  },
};

export function ExpiryAlertsSection({
  alerts,
}: {
  alerts: ExpiryAlertItem[];
}) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Expiry Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No expiry alerts. Everything looks good.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Expiry Alerts
          <Badge variant="secondary" className="ml-auto text-xs">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
          {alerts.map((a) => {
            const cfg = priorityConfig[a.priority];
            const PIcon = cfg.icon;
            return (
              <div
                key={a.batchId}
                className="rounded-lg border border-border p-3 space-y-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {a.medicineName}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Batch: {a.batchNumber}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${cfg.className}`}
                  >
                    <PIcon className="h-3 w-3 mr-1" />
                    {cfg.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-border/50 pt-2">
                  <span className="text-muted-foreground">
                    Stock: {a.stock} units
                  </span>
                  <span
                    className={
                      a.daysUntilExpiry <= 0
                        ? "text-destructive font-medium"
                        : a.daysUntilExpiry <= 30
                        ? "text-warning font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {a.daysUntilExpiry <= 0
                      ? `Expired ${Math.abs(a.daysUntilExpiry)}d ago`
                      : `${a.daysUntilExpiry}d remaining`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpiredStockSection({
  items,
}: {
  items: ExpiredBatchItem[];
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            Expired Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No expired stock with remaining units.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-destructive" />
          Expired Stock
          <Badge variant="destructive" className="ml-auto text-[10px]">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
          {items.map((e) => (
            <div
              key={e.batchId}
              className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1"
            >
              <p className="text-sm font-medium text-foreground truncate">
                {e.medicineName}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                Batch: {e.batchNumber}
              </p>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-destructive/10">
                <span className="text-muted-foreground">
                  Stock: {e.stock} units
                </span>
                <span className="text-destructive font-medium">
                  Expired {e.daysExpired}d ago
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}