// src/app/(dashboard)/inventory/receiving/new/page.tsx

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft, ArrowRight, Check, Plus, Trash2, Pencil, AlertTriangle, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MedicineAutocomplete } from "@/components/medicine/medicine-autocomplete";
import { MedicineScanner } from "@/components/medicine/medicine-scanner";
import { formatDate } from "@/lib/utils";
import { getAllCartonsSimple } from "@/lib/offline/warehouse-repository";
import { getAllCategories } from "@/lib/offline/category-repository";
import { findExistingBatch, confirmReceipt, generateReceiptNumber } from "@/lib/offline/stock-receipt-repository";
import { RECEIPT_SOURCE_TYPES } from "@/types";
import type { CategoryItem } from "@/types";
import type { MedicineSearchResult } from "@/lib/offline/medicine-repository";
import { useRouter } from "next/navigation";

type Step = "info" | "items" | "review" | "confirmed";

interface ItemForm {
  tempId: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  cartonId: string;
  newCartonCode: string;
  newCartonName: string;
  newCartonCategory: string;
  notes: string;
  existingBatchId: string | null;
  expiredWarning: boolean;
}

function createEmptyItem(): ItemForm {
  return {
    tempId: crypto.randomUUID(),
    medicineId: "",
    medicineName: "",
    genericName: "",
    batchNumber: "",
    expiryDate: "",
    quantity: "",
    cartonId: "",
    newCartonCode: "",
    newCartonName: "",
    newCartonCategory: "",
    notes: "",
    existingBatchId: null,
    expiredWarning: false,
  };
}

const stepLabels = ["Receipt Info", "Medicines", "Review", "Confirmed"];

export default function NewReceiptPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Info
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [sourceType, setSourceType] = useState("DONATION");
  const [sourceName, setSourceName] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [notes, setNotes] = useState("");

  // Items
  const [items, setItems] = useState<ItemForm[]>([]);
  const [cartons, setCartons] = useState<Array<{ id: string; code: string; label: string }>>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<ItemForm>(createEmptyItem());
  const [createNewCarton, setCreateNewCarton] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Result
  const [receiptNumber, setReceiptNumber] = useState("");

  useEffect(() => {
    Promise.all([getAllCartonsSimple(), getAllCategories()]).then(
      ([c, cat]) => {
        setCartons(c);
        setCategories(cat);
      }
    );
  }, []);

  const totals = useMemo(() => {
    const medSet = new Set(items.map((i) => i.medicineId));
    return {
      medicines: medSet.size,
      items: items.length,
      units: items.reduce((s, i) => s + (parseInt(i.quantity, 10) || 0), 0),
    };
  }, [items]);

  function resetItemForm() {
    setCurrentItem(createEmptyItem());
    setCreateNewCarton(false);
    setEditingTempId(null);
  }

  async function checkBatch(medId: string, batchNum: string, expDate: string) {
    if (!medId || !batchNum || !expDate) return null;
    return findExistingBatch(medId, batchNum.trim(), expDate);
  }

  const handleMedicineSelect = useCallback(
    async (
      value: string,
      medicineId: string | null,
      medicine?: MedicineSearchResult
    ) => {
      if (!medicineId || !medicine) {
        setCurrentItem((prev) => ({
          ...prev,
          medicineId: "",
          medicineName: value,
          genericName: "",
        }));
        return;
      }

      const updated: ItemForm = {
        ...currentItem,
        medicineId,
        medicineName: medicine.tradeName,
        genericName: medicine.genericName,
      };
      setCurrentItem(updated);

      if (updated.batchNumber && updated.expiryDate) {
        const existingId = await checkBatch(
          updated.medicineId,
          updated.batchNumber,
          updated.expiryDate
        );
        setCurrentItem((prev) => ({ ...prev, existingBatchId: existingId }));
      }
    },
    [currentItem]
  );

  const handleScanResult = useCallback(
    (medicineId: string | null, medicineName: string | null) => {
      setScannerOpen(false);
      if (medicineId && medicineName) {
        // Fetch full medicine data for generic name
        import("@/lib/offline/medicine-repository").then(
          async ({ findMedicineByBarcode }) => {
            const med = await findMedicineByBarcode(
              medicineName
            ); // medicineName might be the barcode actually
            // Actually, handleScanResult gives us medicineId and medicineName (trade name)
            // We need the generic name too
            const { getMedicineById } = await import(
              "@/lib/offline/medicine-repository"
            );
            const fullMed = await getMedicineById(medicineId);
            const updated: ItemForm = {
              ...currentItem,
              medicineId,
              medicineName: medicineName,
              genericName: fullMed?.genericName || "",
            };
            setCurrentItem(updated);
          }
        );
      }
    },
    [currentItem]
  );

  function handleExpiryChange(val: string) {
    const expired =
      val ? new Date(val) < new Date(new Date().toDateString()) : false;
    setCurrentItem((prev) => ({
      ...prev,
      expiryDate: val,
      expiredWarning: expired,
    }));
    if (currentItem.medicineId && currentItem.batchNumber && val) {
      checkBatch(currentItem.medicineId, currentItem.batchNumber, val).then(
        (id) => {
          setCurrentItem((prev) => ({ ...prev, existingBatchId: id }));
        }
      );
    }
  }

  function handleBatchChange(val: string) {
    setCurrentItem((prev) => ({ ...prev, batchNumber: val }));
    if (currentItem.medicineId && val && currentItem.expiryDate) {
      checkBatch(currentItem.medicineId, val, currentItem.expiryDate).then(
        (id) => {
          setCurrentItem((prev) => ({ ...prev, existingBatchId: id }));
        }
      );
    }
  }

  function addItemToList() {
    const qty = parseInt(currentItem.quantity, 10);
    if (!currentItem.medicineId) {
      setError("Select a medicine.");
      return;
    }
    if (!currentItem.batchNumber.trim()) {
      setError("Enter batch number.");
      return;
    }
    if (!currentItem.expiryDate) {
      setError("Enter expiry date.");
      return;
    }
    if (!qty || qty <= 0) {
      setError("Enter a valid quantity.");
      return;
    }
    if (createNewCarton && !currentItem.newCartonCode.trim()) {
      setError("Enter carton code.");
      return;
    }

    const dup = items.find(
      (i) =>
        i.medicineId === currentItem.medicineId &&
        i.batchNumber.trim() === currentItem.batchNumber.trim() &&
        i.tempId !== editingTempId
    );
    if (dup) {
      setError(
        "This medicine + batch already exists in the receipt. Edit the existing line instead."
      );
      return;
    }

    setError("");
    if (editingTempId) {
      setItems((prev) =>
        prev.map((i) => (i.tempId === editingTempId ? currentItem : i))
      );
    } else {
      setItems((prev) => [...prev, currentItem]);
    }
    resetItemForm();
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  }

  function startEdit(tempId: string) {
    const item = items.find((i) => i.tempId === tempId);
    if (!item) return;
    setCurrentItem({ ...item });
    setEditingTempId(tempId);
    if (!item.cartonId && item.newCartonCode) setCreateNewCarton(true);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      const receiptItems = items.map((i) => ({
        medicineId: i.medicineId,
        batchNumber: i.batchNumber.trim(),
        expiryDate: i.expiryDate,
        quantity: parseInt(i.quantity, 10),
        cartonId: createNewCarton ? "" : i.cartonId,
        newCarton: createNewCarton
          ? {
              code: i.newCartonCode.trim(),
              name: i.newCartonName.trim() || i.newCartonCode.trim(),
              categoryId: i.newCartonCategory,
              location: "",
            }
          : null,
        notes: i.notes,
        useExistingBatch: !!i.existingBatchId,
      }));

      const result = await confirmReceipt({
        date,
        sourceType,
        sourceName,
        responsiblePerson,
        notes,
        items: receiptItems,
      });

      if (result.success) {
        setReceiptNumber(result.receiptNumber || "");
        setStep("confirmed");
      } else {
        setError(result.error || "Failed to confirm receipt.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const stepIndex = stepLabels.indexOf(step);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                i < stepIndex
                  ? "bg-primary text-primary-foreground"
                  : i === stepIndex
                  ? "border-2 border-primary text-primary"
                  : "border-2 border-muted text-muted-foreground"
              }`}
            >
              {i < stepIndex ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-xs hidden sm:inline ${
                i === stepIndex
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < stepLabels.length - 1 && (
              <div
                className={`w-6 h-px ${
                  i < stepIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* STEP 1: Receipt Info */}
      {step === "info" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Receipt Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Receipt Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Source Type <span className="text-destructive">*</span>
              </label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECEIPT_SOURCE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Name</label>
              <Input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g. WHO, Anonymous Donor"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Responsible Person</label>
              <Input
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                placeholder="e.g. Ahmed"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this receipt..."
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setStep("items")}
              disabled={!date || !sourceType}
            >
              Next: Add Medicines <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Add Medicines */}
      {step === "items" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Add Medicines</h2>
            {!currentItem.medicineId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!currentItem.medicineId) {
                    resetItemForm();
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Medicine
              </Button>
            )}
          </div>

          {/* Medicine Autocomplete — always visible when no medicine selected */}
          {!currentItem.medicineId && (
            <div className="rounded-lg border p-4 space-y-3">
              <MedicineAutocomplete
                value={currentItem.medicineName}
                onChange={handleMedicineSelect}
                medicineId={
                  currentItem.medicineId || null
                }
                placeholder="Search by trade name, generic name, or barcode..."
                onScan={() => setScannerOpen(true)}
              />
            </div>
          )}

          {/* Item Form */}
          {currentItem.medicineId && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {currentItem.medicineName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentItem.genericName}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetItemForm}
                >
                  Cancel
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Batch/Lot Number{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={currentItem.batchNumber}
                    onChange={(e) => handleBatchChange(e.target.value)}
                    placeholder="e.g. ABC123"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Expiry Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={currentItem.expiryDate}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Quantity <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={currentItem.quantity}
                    onChange={(e) =>
                      setCurrentItem((p) => ({
                        ...p,
                        quantity: e.target.value,
                      }))
                    }
                    placeholder="Units received"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Carton</label>
                  <Select
                    value={
                      createNewCarton
                        ? "__new__"
                        : currentItem.cartonId || "__none__"
                    }
                    onValueChange={(v) => {
                      if (v === "__new__") {
                        setCreateNewCarton(true);
                        setCurrentItem((p) => ({ ...p, cartonId: "" }));
                      } else {
                        setCreateNewCarton(false);
                        setCurrentItem((p) => ({
                          ...p,
                          cartonId: v === "__none__" ? "" : v,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Carton</SelectItem>
                      {cartons.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} — {c.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">
                        + Create New Carton
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {createNewCarton && (
                <div className="rounded-md border border-dashed p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    New Carton
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      value={currentItem.newCartonCode}
                      onChange={(e) =>
                        setCurrentItem((p) => ({
                          ...p,
                          newCartonCode: e.target.value,
                        }))
                      }
                      placeholder="Code *"
                      className="text-xs h-8"
                    />
                    <Input
                      value={currentItem.newCartonName}
                      onChange={(e) =>
                        setCurrentItem((p) => ({
                          ...p,
                          newCartonName: e.target.value,
                        }))
                      }
                      placeholder="Name"
                      className="text-xs h-8"
                    />
                    <Select
                      value={currentItem.newCartonCategory}
                      onValueChange={(v) =>
                        setCurrentItem((p) => ({
                          ...p,
                          newCartonCategory: v,
                        }))
                      }
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {currentItem.existingBatchId && (
                <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 rounded-md px-3 py-2">
                  <Package className="h-3.5 w-3.5" />
                  Existing batch found — quantity will be added to it.
                </div>
              )}

              {currentItem.expiredWarning && (
                <div className="flex items-center gap-2 text-xs text-warning bg-warning/5 rounded-md px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Warning: This batch is already expired.
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium">Notes</label>
                <Input
                  value={currentItem.notes}
                  onChange={(e) =>
                    setCurrentItem((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Optional"
                  className="text-xs h-8"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <Button size="sm" onClick={addItemToList}>
                {editingTempId ? "Update Item" : "Add to Receipt"}
              </Button>
            </div>
          )}

          {/* Items List */}
          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {items.length} item{items.length !== 1 ? "s" : ""} added
              </p>
              {items.map((item) => (
                <div
                  key={item.tempId}
                  className="rounded-lg border p-3 space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.medicineName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.genericName}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(item.tempId)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeItem(item.tempId)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono">{item.batchNumber}</span>
                    <span>
                      Exp:{" "}
                      {item.expiryDate
                        ? formatDate(new Date(item.expiryDate))
                        : "—"}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {item.quantity} units
                    </span>
                    {item.cartonId && (
                      <span>
                        Carton:{" "}
                        {cartons.find((c) => c.id === item.cartonId)?.code ||
                          "—"}
                      </span>
                    )}
                    {item.expiredWarning && (
                      <span className="text-warning font-medium">EXPIRED</span>
                    )}
                    {item.existingBatchId && (
                      <span className="text-primary">Existing batch</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !currentItem.medicineId && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setStep("info");
                setError("");
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button
              onClick={() => {
                setError("");
                setStep("review");
              }}
              disabled={items.length === 0}
            >
              Next: Review <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === "review" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Review & Confirm</h2>
          <div className="rounded-lg border p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Receipt Date</p>
                <p className="font-medium">{formatDate(new Date(date))}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="font-medium">
                  {RECEIPT_SOURCE_TYPES.find((s) => s.value === sourceType)
                    ?.label}{" "}
                  {sourceName && `— ${sourceName}`}
                </p>
              </div>
              {responsiblePerson && (
                <div>
                  <p className="text-xs text-muted-foreground">Responsible</p>
                  <p className="font-medium">{responsiblePerson}</p>
                </div>
              )}
            </div>
            {notes && (
              <p className="text-sm text-muted-foreground border-t pt-2">
                {notes}
              </p>
            )}
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex gap-4 text-sm font-medium">
              <span>
                Medicines:{" "}
                <span className="tabular-nums">{totals.medicines}</span>
              </span>
              <span>
                Items:{" "}
                <span className="tabular-nums">{totals.items}</span>
              </span>
              <span>
                Units:{" "}
                <span className="tabular-nums">
                  {totals.units.toLocaleString()}
                </span>
              </span>
            </div>
          </div>

          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.tempId}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.medicineName}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {item.batchNumber} &middot; Exp:{" "}
                    {item.expiryDate
                      ? formatDate(new Date(item.expiryDate))
                      : "—"}
                  </p>
                </div>
                <span className="font-semibold tabular-nums shrink-0">
                  +{item.quantity}
                </span>
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setStep("items");
                setError("");
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Processing..." : "Confirm Receipt"}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Confirmed */}
      {step === "confirmed" && (
        <div className="space-y-6 text-center py-8">
          <div className="rounded-full bg-success/10 p-4 w-fit mx-auto">
            <Check className="h-8 w-8 text-success" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Receipt Confirmed</h2>
            <p className="text-muted-foreground">
              Stock has been updated successfully.
            </p>
          </div>
          <div className="rounded-lg border p-4 inline-block text-left space-y-1">
            <p className="text-sm text-muted-foreground">Receipt Number</p>
            <p className="text-lg font-mono font-bold">{receiptNumber}</p>
            <p className="text-sm text-muted-foreground">
              {totals.units.toLocaleString()} units across{" "}
              {totals.medicines} medicine{totals.medicines !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/inventory/receiving")}
            >
              View All Receipts
            </Button>
            <Button onClick={() => window.location.reload()}>
              Create Another
            </Button>
          </div>
        </div>
      )}

      {/* Barcode Scanner */}
      <MedicineScanner open={scannerOpen} onClose={handleScanResult} />
    </div>
  );
}