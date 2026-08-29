import { Construction } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export function ComingSoon({ module }: { module: string }) {
  return (
    <EmptyState
      icon={Construction}
      title={`${module} — Coming Soon`}
      description="This module is under development and will be available in a future phase."
    />
  );
}