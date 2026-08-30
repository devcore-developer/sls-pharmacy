"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
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
        <div className="rounded-full bg-muted p-4">
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
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold text-foreground">
            {getGreeting()}
          </h1>
          <p className="text-sm text-muted-foreground">
            SLS Pharmacy · {getFormattedDate()}
          </p>
          <div className="flex items-center gap-2 pt-1">
            {!isOnline && (
              <Badge variant="outline" className="text-[10px] gap-1 border-destructive/30 text-destructive">
                <WifiOff className="h-3 w-3" />
                Offline Mode
              </Badge>
            )}
            {pendingSync > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-warning/30 text-warning">
                {pendingSync} change{pendingSync !== 1 ? "s" : ""} waiting to sync
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <div className="rounded-full bg-muted p-4">
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

function Package({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  );
}