import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "warning" | "danger" | "success" | "info";
  description?: string;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
  info: "bg-secondary/10 text-secondary-foreground",
};

export function StatCard({ title, value, icon: Icon, variant = "default", description, className }: StatCardProps) {
  return (
    <Card className={cn("hover:shadow-card-hover hover:border-border/80 transition-all duration-200", className)}>
      <CardContent className="p-5 flex flex-col h-full justify-between min-h-[110px]">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", variantStyles[variant])}>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}