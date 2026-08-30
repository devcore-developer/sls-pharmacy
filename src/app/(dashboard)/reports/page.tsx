"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  AlertTriangle,
  ArrowLeftRight,
  Truck,
  Download,
  Pill,
  RotateCcw,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ReportLoading } from "./components/shared";
import type { LucideIcon } from "lucide-react";

interface ReportCard {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

const reportCards: ReportCard[] = [
  {
    title: "Current Inventory",
    description: "Medicine stock levels, batches, locations, and status overview.",
    icon: Package,
    href: "/reports/inventory",
    color: "text-blue-600 bg-blue-50",
  },
  {
    title: "Expiry Report",
    description: "Track expired and near-expiry batches across all inventory.",
    icon: AlertTriangle,
    href: "/reports/expiry",
    color: "text-amber-600 bg-amber-50",
  },
  {
    title: "Stock Movements",
    description: "Complete history of stock ins, outs, adjustments, and transfers.",
    icon: ArrowLeftRight,
    href: "/reports/movements",
    color: "text-purple-600 bg-purple-50",
  },
  {
    title: "Convoys",
    description: "Convoy status, dispensing, returns, and reconciliation summary.",
    icon: Truck,
    href: "/reports/convoys",
    color: "text-green-600 bg-green-50",
  },
  {
    title: "Receiving",
    description: "Stock receipts from donations, supplies, and other sources.",
    icon: Download,
    href: "/reports/receiving",
    color: "text-cyan-600 bg-cyan-50",
  },
  {
    title: "Dispensing",
    description: "Medicine dispensing activity associated with convoys.",
    icon: Pill,
    href: "/reports/dispensing",
    color: "text-rose-600 bg-rose-50",
  },
  {
    title: "Returns",
    description: "Medicine returns from convoys back to warehouse stock.",
    icon: RotateCcw,
    href: "/reports/returns",
    color: "text-orange-600 bg-orange-50",
  },
  {
    title: "Medicine Activity",
    description: "Detailed timeline of a specific medicine's stock activity.",
    icon: Activity,
    href: "/reports/medicine-activity",
    color: "text-indigo-600 bg-indigo-50",
  },
];

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <ReportLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Analyze pharmacy inventory, convoys, stock activity, and receiving history."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reportCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-5 flex flex-col gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${card.color}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}