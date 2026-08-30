"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BatchFormData } from "@/types";

interface BatchFormProps {
  initialData?: BatchFormData;
  cartons: Array<{ id: string; code: string; label: string }>;
  onSubmit: (data: BatchFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}

const EMPTY_FORM: BatchFormData = {
  batchNumber: "",
  quantity: "",
  expiryDate: "",
  cartonId: "",
};

export function BatchForm({
  initialData,
  cartons,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: BatchFormProps) {
  const [data, setData] = useState<BatchFormData>(initialData ?? EMPTY_FORM);

  useEffect(() => {
    if (initialData) setData(initialData);
  }, [initialData]);

  function update(field: keyof BatchFormData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="batchNumber" className="text-xs font-medium">
            Batch / Lot Number
          </Label>
          <Input
            id="batchNumber"
            value={data.batchNumber}
            onChange={(e) => update("batchNumber", e.target.value)}
            placeholder="e.g. ABC123"
            disabled={isSubmitting}
            className="text-sm h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="batchExpiry" className="text-xs font-medium">
            Expiry Date
          </Label>
          <Input
            id="batchExpiry"
            type="date"
            value={data.expiryDate}
            onChange={(e) => update("expiryDate", e.target.value)}
            disabled={isSubmitting}
            className="text-sm h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="batchQty" className="text-xs font-medium">
            Quantity
          </Label>
          <Input
            id="batchQty"
            type="number"
            min={1}
            value={data.quantity}
            onChange={(e) => update("quantity", e.target.value)}
            placeholder="Units"
            disabled={isSubmitting}
            className="text-sm h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="batchCarton" className="text-xs font-medium">
            Carton
          </Label>
          <Select
            value={data.cartonId || "__none__"}
            onValueChange={(v) => update("cartonId", v === "__none__" ? "" : v)}
            disabled={isSubmitting}
          >
            <SelectTrigger className="text-sm h-9">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No Carton</SelectItem>
              {cartons.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}