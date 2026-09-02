"use client";

import {
  Pill,
  Package,
  AlertTriangle,
  Clock,
  XCircle,
  Truck,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import type { DashboardSummary } from "@/lib/offline/dashboard-repository";

const cards: Array<{
  key: keyof DashboardSummary;
  title: string;
  icon: typeof Pill;
  variant: "default" | "info" | "warning" | "danger" | "success";
  description: string;
}> = [
  {
    key: "totalMedicines",
    title: "Total Medicines",
    icon: Pill,
    variant: "default",
    description: "Unique medicine entries",
  },
  {
    key: "totalStock",
    title: "Total Stock",
    icon: Package,
    variant: "info",
    description: "Warehouse units",
  },
  {
    key: "lowStockCount",
    title: "Low Stock",
    icon: AlertTriangle,
    variant: "warning",
    description: "Below threshold",
  },
  {
    key: "expiringSoonCount",
    title: "Expiring Soon",
    icon: Clock,
    variant: "warning",
    description: `Within 90 days`,
  },
  {
    key: "expiredCount",
    title: "Expired",
    icon: XCircle,
    variant: "danger",
    description: "With remaining stock",
  },
  {
    key: "activeConvoyCount",
    title: "Active Convoys",
    icon: Truck,
    variant: "success",
    description: "In progress",
  },
];

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((c) => (
        <StatCard
          key={c.key}
          title={c.title}
          value={summary[c.key] as number}
          icon={c.icon}
          variant={c.variant}
          description={
            c.key === "totalStock"
              ? `Across ${summary.totalBatches} batches`
              : c.description
          }
        />
      ))}
    </div>
  );
}