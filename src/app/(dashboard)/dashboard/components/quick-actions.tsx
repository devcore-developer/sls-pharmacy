"use client";

import {
  Plus,
  Truck,
  SlidersHorizontal,
  Package,
  FileText,
  Pill,
  FlaskConical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";

const actions = [
  { label: "Add Medicine", href: "/medicines", icon: Plus, primary: true },
  { label: "New Convoy", href: "/convoys", icon: Truck, primary: false },
  { label: "Stock Adjustment", href: "/inventory", icon: SlidersHorizontal, primary: false },
  { label: "View Inventory", href: "/inventory", icon: Package, primary: false },
  { label: "View Movements", href: "/inventory/movements", icon: FileText, primary: false },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Link
          key={a.label}
          href={a.href}
          className={cn(
            "flex items-center gap-2 shrink-0 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all",
            a.primary
              ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm"
              : "bg-card text-foreground hover:bg-accent hover:border-border/80 border-border"
          )}
        >
          <a.icon className={cn("h-4 w-4", a.primary ? "text-primary-foreground" : "text-primary")} strokeWidth={2} />
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
        <CardTitle className="flex items-center gap-2">
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
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs hover:bg-accent transition-colors"
            >
              <span className="font-medium text-foreground">{c.name}</span>
              <span className="text-muted-foreground tabular-nums">· {c.count}</span>
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
        <CardTitle className="flex items-center gap-2">
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
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs hover:bg-accent transition-colors"
            >
              <span className="font-medium text-foreground">{c.name}</span>
              <span className="text-muted-foreground tabular-nums">· {c.count}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}