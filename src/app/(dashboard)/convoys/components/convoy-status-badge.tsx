import { Badge } from "@/components/ui/badge";
import type { ConvoyStatus } from "@/types";
import { cn } from "@/lib/utils";

const config: Record<ConvoyStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-secondary text-secondary-foreground hover:bg-secondary" },
  ACTIVE: { label: "Active", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-100" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100" },
};

export function ConvoyStatusBadge({ status }: { status: ConvoyStatus }) {
  const c = config[status] || config.DRAFT;
  return (
    <Badge variant="secondary" className={cn("font-medium", c.className)}>
      {c.label}
    </Badge>
  );
}