// src/app/(dashboard)/dashboard/components/convoys-section.tsx

"use client";

import { Truck, ArrowRight, MapPin, Calendar, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateShort } from "@/lib/date-utils";
import type {
  ActiveConvoyItem,
  RecentConvoyItem,
} from "@/lib/offline/dashboard-repository";

export function ActiveConvoysSection({
  convoys,
}: {
  convoys: ActiveConvoyItem[];
}) {
  if (convoys.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          Active Convoys
          <Badge variant="default" className="ml-auto text-xs">
            {convoys.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {convoys.map((c) => (
            <a
              key={c.id}
              href={`/convoys/${c.id}`}
              className="rounded-lg border p-4 space-y-3 hover:shadow-sm hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {c.name}
                  </p>
                  {c.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {c.location}
                    </p>
                  )}
                </div>
                <StatusBadge status="ACTIVE" />
              </div>
              {c.date && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDateShort(new Date(c.date))}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Taken</p>
                  <p className="text-sm font-bold tabular-nums">{c.totalTaken}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Dispensed</p>
                  <p className="text-sm font-bold tabular-nums text-primary">
                    {c.totalDispensed}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Remaining</p>
                  <p className="text-sm font-bold tabular-nums text-warning">
                    {c.totalRemaining}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {c.itemCount} medicine{c.itemCount !== 1 ? "s" : ""}
              </p>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentConvoysSection({
  convoys,
}: {
  convoys: RecentConvoyItem[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Recent Convoys</CardTitle>
        <a
          href="/convoys"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View All <ArrowRight className="h-3 w-3" />
        </a>
      </CardHeader>
      <CardContent>
        {convoys.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No convoy history yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {convoys.map((c) => (
              <a
                key={c.id}
                href={`/convoys/${c.id}`}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {c.name}
                    </p>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    {c.location && <span>{c.location}</span>}
                    <span>{c.itemCount} items</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums">
                    {c.totalTaken}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {c.totalDispensed} dispensed
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}