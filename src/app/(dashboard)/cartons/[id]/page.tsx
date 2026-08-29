"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Archive, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { SavedLocallyBanner } from "@/app/(dashboard)/medicines/components/saved-locally-banner";
import { getCartonById, archiveCarton } from "@/lib/offline/carton-repository";
import { getExpiryStatus } from "@/lib/offline/stock-utils";
import { formatDate } from "@/lib/utils";
import type { CartonWithContents } from "@/types";

export default function CartonDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [carton, setCarton] = useState<CartonWithContents | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showBanner, setShowBanner] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    getCartonById(params.id).then((data) => {
      setCarton(data);
      setLoading(false);
    });
  }, [params.id]);

  const contents = carton?.contents.filter((c) => !c.archivedAt) ?? [];
  const filtered = search
    ? contents.filter(
        (c) =>
          c.medicineName.toLowerCase().includes(search.toLowerCase()) ||
          c.genericName.toLowerCase().includes(search.toLowerCase()) ||
          c.batchNumber.toLowerCase().includes(search.toLowerCase())
      )
    : contents;

  async function handleArchive() {
    if (!carton) return;
    await archiveCarton(carton.id);
    setShowArchive(false);
    setShowBanner(true);
    router.push("/cartons");
  }

  if (loading) return <LoadingState message="Loading carton..." />;
  if (!carton) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carton Not Found" description="This carton does not exist or has been removed." />
        <EmptyState icon={Package} title="Carton not found" description="The carton you are looking for does not exist." action={{ label: "Back to Cartons", onClick: () => router.push("/cartons") }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Carton ${carton.code}`}
        description={carton.name}
        action={
          <Button variant="outline" onClick={() => router.push("/cartons")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="rounded-lg border p-5 space-y-3">
        <DetailRow label="Code" value={carton.code} />
        <DetailRow label="Name" value={carton.name} />
        {carton.categoryName && <DetailRow label="Category" value={carton.categoryName} />}
        <DetailRow label="Location" value={carton.location} />
        {carton.description && <DetailRow label="Description" value={carton.description} />}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <MiniStat label="Batches" value={carton.batchCount} />
          <MiniStat label="Total Units" value={carton.totalUnits} />
          <MiniStat label="Status" value={carton.archivedAt ? "Archived" : "Active"} />
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Contents ({filtered.length})</h3>
          <SearchInput value={search} onChange={setSearch} placeholder="Search contents..." className="max-w-xs" />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Package} title="No contents found" description={search ? "No matching batches." : "This carton has no assigned batches."} />
        ) : (
          <div className="overflow-x-auto -mx-6 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Generic Name</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.batchId}>
                    <TableCell className="font-medium text-foreground">{c.medicineName}</TableCell>
                    <TableCell className="text-muted-foreground">{c.genericName}</TableCell>
                    <TableCell className="font-mono text-xs">{c.batchNumber}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.quantity}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(c.expiryDate)}</TableCell>
                    <TableCell><StatusBadge status={getExpiryStatus(c.expiryDate)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex gap-3">
        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setShowArchive(true)}>
          <Archive className="h-4 w-4 mr-2" />
          Archive Carton
        </Button>
      </div>

      <SavedLocallyBanner show={showBanner} onHide={() => setShowBanner(false)} />

      {/* Archive confirmation - inline */}
      {showArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowArchive(false)}>
          <div className="bg-card rounded-lg border p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">Archive Carton</h3>
            <p className="text-sm text-muted-foreground mb-5">Are you sure you want to archive <span className="font-medium text-foreground">{carton.code}</span>? Contents will be unassigned but not deleted.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowArchive(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleArchive}>Archive</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-8">
      <p className="text-xs font-medium text-muted-foreground sm:w-28 shrink-0">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}