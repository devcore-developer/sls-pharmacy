import { PageHeader } from "@/components/shared/page-header";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate inventory reports, expiry analyses, and distribution summaries."
      />
      <ComingSoon module="Reports" />
    </div>
  );
}