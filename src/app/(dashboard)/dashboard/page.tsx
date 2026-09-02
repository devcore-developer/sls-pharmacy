"use client";

import { useState, useEffect } from "react";
import { WifiOff, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/loading-state";
import { getPendingOperationsCount } from "@/lib/offline/sync-operations";
import { loadDashboardData } from "@/lib/offline/dashboard-repository";
import type { DashboardData } from "@/lib/offline/dashboard-repository";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { SummaryCards } from "./components/summary-cards";
import { ExpiryAlertsSection, ExpiredStockSection } from "./components/expiry-alerts";
import { LowStockSection } from "./components/low-stock-section";
import { RecentActivitySection } from "./components/recent-activity";
import { ActiveConvoysSection, RecentConvoysSection } from "./components/convoys-section";
import { QuickActions, CategorySummary, ClassSummary } from "./components/quick-actions";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { db } = await import("@/lib/offline/db");
        await db.open();

        if (cancelled) return;

        const dashboardData = await loadDashboardData();

        if (!cancelled) {
          setData(dashboardData);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    init();

    getPendingOperationsCount()
      .then(setPendingSync)
      .catch(() => setPendingSync(0));

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="rounded-xl bg-muted p-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            No medicines have been added yet
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Get started by adding your first medicine to the system.
          </p>
        </div>
        <QuickActions />
      </div>
    );
  }

  const isEmpty = data.summary.totalMedicines === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {getGreeting()}, {data?.summary ? "Admin" : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            SLS Pharmacy · {getFormattedDate()}
          </p>
          <div className="flex items-center gap-2 pt-1">
            {!isOnline && (
              <Badge variant="outline" className="text-[10px] gap-1 border-destructive/30 text-destructive bg-destructive/5">
                <WifiOff className="h-3 w-3" />
                Offline Mode
              </Badge>
            )}
            {pendingSync > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-warning/30 text-warning bg-warning/5">
                {pendingSync} change{pendingSync !== 1 ? "s" : ""} waiting to sync
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <div className="rounded-xl bg-muted p-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              No medicines have been added yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Get started by adding your first medicine to the system.
            </p>
          </div>
          <QuickActions />
        </div>
      ) : (
        <>
          <SummaryCards summary={data.summary} />
          <ActiveConvoysSection convoys={data.activeConvoys} />
          <QuickActions />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ExpiryAlertsSection alerts={data.expiryAlerts} />
            </div>
            <LowStockSection items={data.lowStock} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ExpiredStockSection items={data.expiredBatches} />
            </div>
            <CategorySummary categories={data.categories} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentActivitySection movements={data.recentMovements} />
            <RecentConvoysSection convoys={data.recentConvoys} />
          </div>
          <ClassSummary classes={data.classes} />
        </>
      )}
    </div>
  );
}