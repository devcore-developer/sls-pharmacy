"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createConvoy } from "@/lib/offline/convoy-repository";
import type { ConvoyFormData } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateConvoyDialog({ open, onOpenChange, onCreated }: Props) {
  const [form, setForm] = useState<ConvoyFormData>({
    name: "", date: new Date().toISOString().split("T")[0], location: "", responsiblePerson: "", notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.date) e.date = "Date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createConvoy(form);
      onOpenChange(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Convoy</DialogTitle>
          <DialogDescription>Create a new medical convoy for distribution.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Alexandria Medical Convoy #12" autoFocus />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date <span className="text-destructive">*</span></label>
            <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
            {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Borg El Arab" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Responsible Person</label>
            <Input value={form.responsiblePerson} onChange={(e) => setForm((p) => ({ ...p, responsiblePerson: e.target.value }))} placeholder="e.g. Ahmed Mohamed" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Convoy"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}