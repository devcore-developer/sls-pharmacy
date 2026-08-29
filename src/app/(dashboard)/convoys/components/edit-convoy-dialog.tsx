"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateConvoy } from "@/lib/offline/convoy-repository";
import type { ConvoyDetail, ConvoyFormData } from "@/types";

interface Props {
  convoy: ConvoyDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function EditConvoyDialog({ convoy, open, onOpenChange, onUpdated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const initial: ConvoyFormData | undefined = convoy
    ? { name: convoy.name, date: convoy.date, location: convoy.location, responsiblePerson: convoy.responsiblePerson, notes: convoy.notes }
    : undefined;

  const [form, setForm] = useState<ConvoyFormData>(
    initial || { name: "", date: "", location: "", responsiblePerson: "", notes: "" }
  );

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!convoy || !form.name.trim() || !form.date) return;
    setSubmitting(true);
    try {
      await updateConvoy(convoy.id, form);
      onOpenChange(false);
      onUpdated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Convoy</DialogTitle>
          <DialogDescription>Update {convoy?.name}.</DialogDescription>
        </DialogHeader>
        {initial && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date <span className="text-destructive">*</span></label>
              <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Responsible Person</label>
              <Input value={form.responsiblePerson} onChange={(e) => setForm((p) => ({ ...p, responsiblePerson: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}