"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MedicineAutocomplete } from "@/components/medicine/medicine-autocomplete";
import { MedicineScanner } from "@/components/medicine/medicine-scanner";
import type { MedicineFormData, CategoryItem, PharmacologicalClassItem } from "@/types";
import type { MedicineSearchResult } from "@/lib/offline/medicine-repository";

interface MedicineFormProps {
  initialData?: MedicineFormData;
  categories: CategoryItem[];
  classes: PharmacologicalClassItem[];
  onSubmit: (data: MedicineFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
}

export function MedicineForm({
  initialData,
  categories,
  classes,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = "Save",
}: MedicineFormProps) {
  const [form, setForm] = useState<MedicineFormData>(
    initialData ?? {
      id: undefined,
      tradeName: "",
      genericName: "",
      manufacturer: "",
      barcode: "",
      pharmacologicalClassIds: [],
      categoryIds: [],
      notes: "",
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scannerOpen, setScannerOpen] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.tradeName.trim()) next.tradeName = "Trade name is required";
    if (!form.genericName.trim()) next.genericName = "Generic name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  }

  function toggleCategory(catId: string) {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(catId)
        ? prev.categoryIds.filter((id) => id !== catId)
        : [...prev.categoryIds, catId],
    }));
  }

  function toggleClass(classId: string) {
    setForm((prev) => ({
      ...prev,
      pharmacologicalClassIds: prev.pharmacologicalClassIds.includes(classId)
        ? prev.pharmacologicalClassIds.filter((id) => id !== classId)
        : [...prev.pharmacologicalClassIds, classId],
    }));
  }

  function handleAutocompleteChange(
    value: string,
    medicineId: string | null,
    medicine?: MedicineSearchResult
  ) {
    if (medicine) {
      // دواء موجود مسبقاً: تعبئة الحقول ومنع التكرار
      setForm((prev) => ({
        ...prev,
        id: medicine.id,
        tradeName: medicine.tradeName,
        genericName: medicine.genericName,
        manufacturer: medicine.manufacturer || "",
        barcode: medicine.barcode || "",
      }));
    } else {
      // دواء جديد
      setForm((prev) => ({
        ...prev,
        id: undefined,
        tradeName: value,
      }));
    }
  }

  function handleScannerClose(
    medicineId: string | null,
    medicineName: string | null,
    medicine?: MedicineSearchResult | null
  ) {
    setScannerOpen(false);
    if (medicine) {
      setForm((prev) => ({
        ...prev,
        id: medicine.id,
        tradeName: medicine.tradeName,
        genericName: medicine.genericName,
        manufacturer: medicine.manufacturer || "",
        barcode: medicine.barcode || "",
      }));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="tradeName" className="text-sm font-medium text-foreground">
            Trade Name <span className="text-destructive">*</span>
          </label>
          <MedicineAutocomplete
            value={form.tradeName}
            onChange={handleAutocompleteChange}
            medicineId={form.id ?? null}
            placeholder="Search or enter trade name..."
            onScan={() => setScannerOpen(true)}
          />
          {errors.tradeName && <p className="text-xs text-destructive">{errors.tradeName}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="genericName" className="text-sm font-medium text-foreground">
            Generic Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="genericName"
            value={form.genericName}
            onChange={(e) => setForm((p) => ({ ...p, genericName: e.target.value }))}
            placeholder="e.g. Paracetamol"
          />
          {errors.genericName && <p className="text-xs text-destructive">{errors.genericName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="manufacturer" className="text-sm font-medium text-foreground">Manufacturer</label>
          <Input
            id="manufacturer"
            value={form.manufacturer}
            onChange={(e) => setForm((p) => ({ ...p, manufacturer: e.target.value }))}
            placeholder="e.g. GSK, Pfizer"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="barcode" className="text-sm font-medium text-foreground">Barcode</label>
          <Input
            id="barcode"
            value={form.barcode || ""}
            onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))}
            placeholder="Scan or enter barcode"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Pharmacological Classes</label>
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => {
            const selected = form.pharmacologicalClassIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleClass(c.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-input hover:bg-accent"
                )}
              >
                {c.name}
              </button>
            );
          })}
          {classes.length === 0 && (
            <p className="text-xs text-muted-foreground">No pharmacological classes configured.</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Categories</label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const selected = form.categoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-input hover:bg-accent"
                )}
              >
                {cat.name}
              </button>
            );
          })}
          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground">No categories configured.</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium text-foreground">Notes</label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Additional notes..."
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : submitLabel}</Button>
      </div>

      <MedicineScanner open={scannerOpen} onClose={handleScannerClose} />
    </form>
  );
}