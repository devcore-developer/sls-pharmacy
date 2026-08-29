"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Play, CheckCircle2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SavedLocallyBanner } from "@/app/(dashboard)/medicines/components/saved-locally-banner";
import { ConvoyStatusBadge } from "../components/convoy-status-badge";
import { ConvoyItemsTable } from "../components/convoy-items-table";
import { DispensingCard } from "../components/dispensing-card";
import { ReconciliationSection } from "../components/reconciliation-section";
import { EditConvoyDialog } from "../components/edit-convoy-dialog";
import { AddConvoyMedicineDialog } from "../components/add-convoy-medicine-dialog";
import { CompleteConvoyDialog } from "../components/complete-convoy-dialog";
import {
  getConvoyDetail,
  startConvoy,
  deleteConvoy,
} from "@/lib/offline/convoy-repository";
import { removeConvoyItem } from "@/lib/offline/convoy-item-repository";
import { formatDate } from "@/lib/utils";
import type { ConvoyDetail } from "@/types";

export default function ConvoyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [convoy, setConvoy] = useState<ConvoyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showBanner, setShowBanner] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const loadConvoy = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConvoyDetail(params.id);
      setConvoy(data);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { loadConvoy(); }, [loadConvoy]);

  const filteredItems = useMemo(() => {
    if (!convoy) return [];
    if (!search) return convoy.items;
    const q = search.toLowerCase();
    return convoy.items.filter(
      (i) =>
        i.medicineName.toLowerCase().includes(q) ||
        i.genericName.toLowerCase().includes(q) ||
        i.batchNumber.toLowerCase().includes(q)
    );
  }, [convoy, search]);

  async function handleStart() {
    setStarting(true);
    setError("");
    const result = await startConvoy(params.id);
    if (result.success) { await loadConvoy(); }
    else { setError(result.error || "Failed to start."); }
    setStarting(false);
  }

  async function handleRemoveItem(itemId: string) {
    await removeConvoyItem(itemId);
    setShowBanner(true);
    loadConvoy();
  }

  async function handleDelete() {
    await deleteConvoy(params.id);
    setShowDelete(false);
    router.push("/convoys");
  }

  if (loading) return <LoadingState message="Loading convoy..." />;
  if (!convoy) {
    return (
      <div className="space-y-6">
        <PageHeader title="Convoy Not Found" description="This convoy does not exist." />
        <EmptyState icon={Trash2} title="Not found" description="The convoy may have been deleted."
          action={{ label: "Back to Convoys", onClick: () => router.push("/convoys") }} />
      </div>
    );
  }

  const isDraft = convoy.status === "DRAFT";
  const isActive = convoy.status === "ACTIVE";
  const isCompleted = convoy.status === "COMPLETED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={convoy.name}
        description={`${formatDate(convoy.date)}${convoy.location ? ` · ${convoy.location}` : ""}`}
        action={
          <Button variant="outline" onClick={() => router.push("/convoys")}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <ConvoyStatusBadge status={convoy.status} />
        {convoy.responsiblePerson && <Badge variant="outline">{convoy.responsiblePerson}</Badge>}
      </div>

      {convoy.notes && <p className="text-sm text-muted-foreground">{convoy.notes}</p>}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isDraft && (
          <>
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
            <Button size="sm" onClick={handleStart} disabled={starting}>
              <Play className="h-3.5 w-3.5 mr-1" />{starting ? "Starting..." : "Start Convoy"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddMed(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Medicine</Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
            </Button>
          </>
        )}
        {isActive && (
          <Button size="sm" onClick={() => setShowComplete(true)}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Complete Convoy
          </Button>
        )}
      </div>

      <Separator />

      {isDraft && (
        <ConvoyItemsTable items={convoy.items} canEdit onRemove={handleRemoveItem} />
      )}

      {isActive && (
        <div className="space-y-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search medicines, batches..." className="max-w-md" />
          {filteredItems.length === 0 ? (
            <EmptyState icon={Plus} title="No medicines found" description={search ? "Try adjusting your search." : "No medicines in this convoy."} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <DispensingCard key={item.id} item={item} onUpdated={loadConvoy} />
              ))}
            </div>
          )}
        </div>
      )}

      {isCompleted && (
        <ReconciliationSection convoyId={convoy.id} items={convoy.items} onUpdated={() => { setShowBanner(true); loadConvoy(); }} />
      )}

      <EditConvoyDialog convoy={convoy} open={showEdit} onOpenChange={setShowEdit} onUpdated={() => { setShowBanner(true); loadConvoy(); }} />
      <AddConvoyMedicineDialog convoyId={convoy.id} open={showAddMed} onOpenChange={setShowAddMed} onAdded={() => { setShowBanner(true); loadConvoy(); }} />
      <CompleteConvoyDialog convoyId={convoy.id} open={showComplete} onOpenChange={setShowComplete} onCompleted={() => { setShowBanner(true); loadConvoy(); }} />

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDelete(false)}>
          <div className="bg-card rounded-lg border p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">Delete Convoy</h3>
            <p className="text-sm text-muted-foreground mb-5">Are you sure you want to delete <span className="font-medium text-foreground">{convoy.name}</span>? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      <SavedLocallyBanner show={showBanner} onHide={() => setShowBanner(false)} />
    </div>
  );
}