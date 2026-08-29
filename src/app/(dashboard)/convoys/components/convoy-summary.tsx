import type { ConvoyItem } from "@/types";
import { Separator } from "@/components/ui/separator";

interface Props {
  items: ConvoyItem[];
}

export function ConvoySummary({ items }: Props) {
  const totalTaken = items.reduce((s, i) => s + i.quantityTaken, 0);
  const totalDispensed = items.reduce((s, i) => s + i.quantityDispensed, 0);
  const totalRemaining = totalTaken - totalDispensed;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Medicines" value={items.length} />
        <SummaryCard label="Taken" value={totalTaken} />
        <SummaryCard label="Dispensed" value={totalDispensed} />
        <SummaryCard label="Remaining" value={totalRemaining} highlight />
      </div>

      <Separator />

      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left pl-6 py-2 font-medium text-muted-foreground">Medicine</th>
              <th className="text-left hidden sm:table-cell py-2 font-medium text-muted-foreground">Batch</th>
              <th className="text-right py-2 font-medium text-muted-foreground">Taken</th>
              <th className="text-right py-2 font-medium text-muted-foreground">Dispensed</th>
              <th className="text-right pr-6 py-2 font-medium text-muted-foreground">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="pl-6 py-2 font-medium">{item.medicineName}</td>
                <td className="hidden sm:table-cell text-muted-foreground font-mono text-xs">{item.batchNumber}</td>
                <td className="text-right tabular-nums">{item.quantityTaken}</td>
                <td className="text-right tabular-nums">{item.quantityDispensed}</td>
                <td className="text-right pr-6 tabular-nums font-medium">{item.quantityTaken - item.quantityDispensed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-lg border p-3 text-center space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${highlight ? "text-foreground" : "text-muted-foreground"}`}>{value}</p>
    </div>
  );
}