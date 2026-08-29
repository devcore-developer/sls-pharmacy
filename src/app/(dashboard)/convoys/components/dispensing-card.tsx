"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dispenseMedicine } from "@/lib/offline/convoy-item-repository";
import type { ConvoyItem } from "@/types";

interface Props {
  item: ConvoyItem;
  onUpdated: () => void;
}

export function DispensingCard({ item, onUpdated }: Props) {
  const [error, setError] = useState("");
  const remaining = item.quantityTaken - item.quantityDispensed;
  const isFullyDispensed = remaining <= 0;

  async function handleDelta(delta: number) {
    setError("");
    const result = await dispenseMedicine(item.id, delta);
    if (result.success) {
      onUpdated();
    } else {
      setError(result.error || "Error");
      setTimeout(() => setError(""), 3000);
    }
  }

  return (
    <div className={cn(
      "rounded-xl border p-4 sm:p-5 space-y-4 transition-colors",
      isFullyDispensed && "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
    )}>
      <div>
        <p className="text-base sm:text-lg font-semibold text-foreground leading-tight">{item.medicineName}</p>
        <p className="text-sm text-muted-foreground">{item.genericName}</p>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">Batch: {item.batchNumber}</p>
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Remaining</p>
        <p className={cn(
          "text-5xl sm:text-6xl font-bold tabular-nums leading-none",
          isFullyDispensed ? "text-green-600 dark:text-green-400" : "text-foreground"
        )}>
          {remaining}
        </p>
        {isFullyDispensed && (
          <div className="flex items-center justify-center gap-1.5 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Fully Dispensed</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 rounded-full text-2xl font-bold p-0 disabled:opacity-30"
          onClick={() => handleDelta(-1)}
          disabled={item.quantityDispensed <= 0}
        >
          −
        </Button>
        <span className="text-2xl font-semibold tabular-nums w-12 text-center">{item.quantityDispensed}</span>
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 rounded-full text-2xl font-bold p-0 disabled:opacity-30"
          onClick={() => handleDelta(1)}
          disabled={isFullyDispensed}
        >
          +
        </Button>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Taken: {item.quantityTaken}</span>
        <span>Dispensed: {item.quantityDispensed}</span>
      </div>

      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );
}