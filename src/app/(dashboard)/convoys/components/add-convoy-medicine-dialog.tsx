"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MedicineAutocomplete } from "@/components/medicine/medicine-autocomplete";
import { MedicineScanner } from "@/components/medicine/medicine-scanner";
import { Search, Package, ArrowLeft, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  getAvailableBatchesForMedicine,
  addConvoyItem,
  addCartonToConvoyItems,
} from "@/lib/offline/convoy-item-repository";
import { getAllCartonsSimple, getCartonContents } from "@/lib/offline/warehouse-repository";
import type { MedicineWithRelations, BatchAvailability, CartonContentItem } from "@/types";
import type { MedicineSearchResult } from "@/lib/offline/medicine-repository";

interface Props {
  convoyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export function AddConvoyMedicineDialog({
  convoyId,
  open,
  onOpenChange,
  onAdded,
}: Props) {
  const [tab, setTab] = useState<"medicines" | "cartons">("medicines");
  
  // Medicines State
  const [selectedMed, setSelectedMed] = useState<MedicineWithRelations | null>(null);
  const [medValue, setMedValue] = useState("");
  const [medId, setMedId] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchAvailability[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchAvailability | null>(null);
  const [quantity, setQuantity] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  
  // Cartons State
  const [cartons, setCartons] = useState<Array<{ id: string; code: string; label: string }>>([]);
  const [cartonSearch, setCartonSearch] = useState("");
  const [selectedCartonId, setSelectedCartonId] = useState<string | null>(null);
  const [cartonContents, setCartonContents] = useState<CartonContentItem[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);

  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      setMedValue("");
      setMedId(null);
      setSelectedMed(null);
      setSelectedBatch(null);
      setQuantity("");
      setBatches([]);
      setSelectedCartonId(null);
      setCartonContents([]);
      
      if (cartons.length === 0) {
        getAllCartonsSimple().then(c => setCartons(c.sort((a, b) => a.code.localeCompare(b.code))));
      }
    }
  }, [open]);

  const handleMedicineChange = useCallback(
    async (
      value: string,
      medicineId: string | null,
      medicine?: MedicineSearchResult
    ) => {
      setMedValue(value);
      setMedId(medicineId);

      if (medicineId && medicine) {
        setError("");
        try {
          const { getMedicineById } = await import("@/lib/offline/medicine-repository");
          const med = await getMedicineById(medicineId);
          if (med) {
            setSelectedMed(med);
            setSelectedBatch(null);
            setQuantity("");
            const avail = await getAvailableBatchesForMedicine(med.id, convoyId);
            setBatches(avail);
            if (avail.length === 0) {
              setError("No available batches for this medicine.");
            }
          }
        } catch (err) {
          console.error("Error loading medicine:", err);
        }
      } else {
        setSelectedMed(null);
        setBatches([]);
        setSelectedBatch(null);
      }
    },
    [convoyId]
  );

  const handleScanResult = useCallback(
    (medicineId: string | null, medicineName: string | null) => {
      setScannerOpen(false);
      if (medicineId && medicineName) {
        handleMedicineChange(medicineName, medicineId);
      }
    },
    [handleMedicineChange]
  );

  function selectBatch(batch: BatchAvailability) {
    setSelectedBatch(batch);
    setQuantity("");
    setError("");
  }

  async function handleAddMedicine() {
    if (!selectedMed || !selectedBatch) return;
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      setError("Enter a valid quantity.");
      return;
    }
    if (qty > selectedBatch.availableQuantity) {
      setError(`Insufficient stock. Available: ${selectedBatch.availableQuantity}`);
      return;
    }
    setAdding(true);
    setError("");
    try {
      const result = await addConvoyItem({
        convoyId,
        medicineId: selectedMed.id,
        batchId: selectedBatch.batchId,
        quantityTaken: qty,
      });
      if (result.success) {
        onAdded();
        onOpenChange(false);
      } else {
        setError(result.error || "Failed to add.");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleAddCarton() {
    if (!selectedCartonId) return;
    setAdding(true);
    setError("");
    try {
      const result = await addCartonToConvoyItems(convoyId, selectedCartonId);
      if (result.success) {
        onAdded();
        onOpenChange(false);
      } else {
        setError(result.error || "Failed to add carton.");
      }
    } finally {
      setAdding(false);
    }
  }

  useEffect(() => {
    if (selectedCartonId) {
      setLoadingContents(true);
      getCartonContents(selectedCartonId).then(contents => {
        setCartonContents(contents.sort((a, b) => a.medicineName.localeCompare(b.medicineName)));
        setLoadingContents(false);
      });
    }
  }, [selectedCartonId]);

  const filteredCartons = useMemo(() => {
    if (!cartonSearch) return cartons;
    const q = cartonSearch.toLowerCase();
    return cartons.filter(c => c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q));
  }, [cartons, cartonSearch]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0 rounded-t-lg">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Add to Convoy</SheetTitle>
            <SheetDescription>Select individual medicines or add a full carton.</SheetDescription>
          </SheetHeader>

          <div className="flex border-b">
            <Button 
              variant={tab === "medicines" ? "default" : "ghost"} 
              className="flex-1 rounded-none"
              onClick={() => setTab("medicines")}
            >
              Medicines
            </Button>
            <Button 
              variant={tab === "cartons" ? "default" : "ghost"} 
              className="flex-1 rounded-none"
              onClick={() => setTab("cartons")}
            >
              Cartons
            </Button>
          </div>

          {tab === "medicines" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="sticky top-0 bg-background z-10 pb-2">
                <MedicineAutocomplete
                  value={medValue}
                  onChange={handleMedicineChange}
                  medicineId={medId}
                  placeholder="Search by trade name, generic name..."
                  onScan={() => setScannerOpen(true)}
                />
              </div>
              
              {selectedMed && !selectedBatch && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{selectedMed.tradeName}</p>
                      <p className="text-xs text-muted-foreground">{selectedMed.genericName}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedMed(null); setMedValue(""); }}>
                      &larr; Back
                    </Button>
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <p className="text-xs font-medium text-muted-foreground">Select a batch (FEFO order):</p>
                  <div className="max-h-[40vh] overflow-y-auto space-y-1">
                    {batches.map((b) => (
                      <button
                        key={b.batchId}
                        type="button"
                        onClick={() => selectBatch(b)}
                        className="w-full text-left rounded-lg border px-3 py-2.5 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-mono font-medium">{b.batchNumber}</p>
                          <p className="text-xs text-muted-foreground">Exp: {formatDate(b.expiryDate)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Available: {b.availableQuantity} units</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedMed && selectedBatch && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{selectedMed.tradeName}</p>
                      <p className="text-xs text-muted-foreground">{selectedMed.genericName} · Batch {selectedBatch.batchNumber}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedBatch(null); setError(""); }}>
                      &larr; Back
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity Taken <span className="text-destructive">*</span></label>
                    <Input
                      type="number"
                      min={1}
                      max={selectedBatch.availableQuantity}
                      value={quantity}
                      onChange={(e) => { setQuantity(e.target.value); setError(""); }}
                      placeholder={`Max: ${selectedBatch.availableQuantity}`}
                    />
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <Button onClick={handleAddMedicine} disabled={adding || !quantity} className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> {adding ? "Adding..." : "Add to Convoy"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {tab === "cartons" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!selectedCartonId ? (
                <>
                  <div className="sticky top-0 bg-background z-10 pb-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        value={cartonSearch} 
                        onChange={(e) => setCartonSearch(e.target.value)} 
                        placeholder="Search cartons..." 
                        className="pl-10" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {filteredCartons.map(carton => (
                      <div 
                        key={carton.id} 
                        className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 flex items-center justify-between"
                        onClick={() => setSelectedCartonId(carton.id)}
                      >
                        <div>
                          <p className="font-medium">{carton.code}</p>
                          <p className="text-sm text-muted-foreground">{carton.label || "No label"}</p>
                        </div>
                        <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCartonId(null)}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <Button onClick={handleAddCarton} disabled={adding || loadingContents}>                      <Package className="h-4 w-4 mr-1" /> Add Carton
                    </Button>
                  </div>
                  {loadingContents ? (
                    <p>Loading contents...</p>
                  ) : (
                    <div className="space-y-2">
                      {cartonContents.map(item => (
                        <div key={item.batchId} className="flex justify-between border-b py-2 text-sm">
                          <div>
                            <p className="font-medium">{item.medicineName}</p>
                            <p className="text-xs text-muted-foreground">{item.genericName}</p>
                          </div>
                          <p className="font-medium tabular-nums">{item.quantity}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <MedicineScanner open={scannerOpen} onClose={handleScanResult} />
    </>
  );
}