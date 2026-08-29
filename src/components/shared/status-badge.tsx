import { Badge, type BadgeProps } from "@/components/ui/badge";

type StatusVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: string;
  variantMap?: Record<string, StatusVariant>;
  labelMap?: Record<string, string>;
}

const defaultVariantMap: Record<string, StatusVariant> = {
  active: "success",
  completed: "success",
  in_stock: "success",
  available: "success",
  valid: "success",
  in_progress: "warning",
  pending: "warning",
  expiring_soon: "warning",
  low_stock: "warning",
  expired: "destructive",
  out_of_stock: "destructive",
  failed: "destructive",
  cancelled: "destructive",
  draft: "secondary",
  inactive: "secondary",
  archived: "secondary",
};

function formatLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, variantMap, labelMap, className, ...props }: StatusBadgeProps) {
  const variants = variantMap ?? defaultVariantMap;
  const label = labelMap?.[status] ?? formatLabel(status);
  const variant = variants[status] ?? "secondary";

  return (
    <Badge variant={variant} className={className} {...props}>
      {label}
    </Badge>
  );
}