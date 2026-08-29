"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Truck, ClipboardList, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SavedLocallyBanner } from "@/app/(dashboard)/medicines/components/saved-locally-banner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CreateConvoyDialog } from "./components/create-convoy-dialog";
import { ConvoyStatusBadge } from "./components/convoy-status-badge";
import { getAllConvoys } from "@/lib/offline/convoy-repository";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { ConvoyListItem } from "@/types";

export default function ConvoysPage() {
  const router = useRouter();
  const [convoys, setConvoys] = useState<ConvoyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllConvoys();
      setConvoys(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const draft = convoys.filter((c) => c.status === "DRAFT").length;
  const active = convoys.filter((c) => c.status === "ACTIVE").length;
  const completed = convoys.filter((c) => c.status === "COMPLETED").length;

  if (loading) return <LoadingState message="Loading convoys..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Convoys"
        description="Prepare, manage and track medicine distribution during charity medical convoys."
        action={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />New Convoy</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Truck} label="Total" value={convoys.length} />
        <StatCard icon={ClipboardList} label="Active" value={active} accent />
        <StatCard icon={Truck} label="Draft" value={draft} />
        <StatCard icon={CheckCircle2} label="Completed" value={completed} />
      </div>

      {/* List */}
      {convoys.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No convoys yet"
          description="Create your first medical convoy to start distributing medicines."
          action={{ label: "New Convoy", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Convoy</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Medicines</TableHead>
                  <TableHead className="text-right">Taken</TableHead>
                  <TableHead className="text-right">Dispensed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {convoys.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/convoys/${c.id}`)}>
                    <TableCell className="pl-6 font-medium text-foreground">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(c.date)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.location || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.itemCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.totalTaken}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.totalDispensed}</TableCell>
                    <TableCell><ConvoyStatusBadge status={c.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {convoys.map((c) => (
              <div key={c.id} onClick={() => router.push(`/convoys/${c.id}`)}
                className="rounded-lg border p-4 space-y-2 active:bg-accent/50 cursor-pointer transition-colors">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-foreground leading-tight">{c.name}</p>
                  <ConvoyStatusBadge status={c.status} />
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(c.date)}{c.location ? ` · ${c.location}` : ""}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{c.itemCount} meds</span>
                  <span>Taken: {c.totalTaken}</span>
                  <span>Dispensed: {c.totalDispensed}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CreateConvoyDialog open={showCreate} onOpenChange={setShowCreate} onCreated={() => { setShowBanner(true); loadData(); }} />
      <SavedLocallyBanner show={showBanner} onHide={() => setShowBanner(false)} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-xl font-bold tabular-nums ${accent ? "text-blue-600 dark:text-blue-400" : "text-foreground"}`}>{value}</p>
    </div>
  );
}