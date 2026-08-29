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
  info: "bg-secondary/10 text-secondary",
};

export function StatCard({ title, value, icon: Icon, variant = "default", description, className }: StatCardProps) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", variantStyles[variant])}>
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}