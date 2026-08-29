// src/app/(dashboard)/dashboard/components/quick-actions.tsx

"use client";

import {
  Plus,
  Truck,
  SlidersHorizontal,
  Package,
  FileText,
  Pill,
  FlaskConical,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const actions = [
  { label: "Add Medicine", href: "/medicines", icon: Plus },
  { label: "New Convoy", href: "/convoys", icon: Truck },
  { label: "Stock Adjustment", href: "/inventory", icon: SlidersHorizontal },
  { label: "View Inventory", href: "/inventory", icon: Package },
  { label: "View Movements", href: "/inventory/movements", icon: FileText },
];

export function QuickActions() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {actions.map((a) => (
        <Link
          key={a.label}
          href={a.href}
          className="flex items-center gap-2 shrink-0 rounded-lg border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/50 hover:border-primary/30 transition-colors"
        >
          <a.icon className="h-4 w-4 text-primary" />
          <span className="whitespace-nowrap">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

export function CategorySummary({
  categories,
}: {
  categories: Array<{ id: string; name: string; count: number }>;
}) {
  if (categories.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Pill className="h-4 w-4 text-muted-foreground" />
          Categories
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              href="/inventory"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors"
            >
              <span className="font-medium text-foreground">{c.name}</span>
              <span className="text-muted-foreground tabular-nums">{c.count}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ClassSummary({
  classes,
}: {
  classes: Array<{ id: string; name: string; count: number }>;
}) {
  if (classes.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-muted-foreground" />
          Pharmacological Classes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => (
            <Link
              key={c.id}
              href="/inventory"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors"
            >
              <span className="font-medium text-foreground">{c.name}</span>
              <span className="text-muted-foreground tabular-nums">{c.count}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}