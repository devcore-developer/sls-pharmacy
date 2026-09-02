"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { X, Camera, AlertCircle, Check, Loader2 } from "lucide-react";
import type { MedicineSearchResult } from "@/lib/offline/medicine-repository";

interface MedicineScannerProps {
  open: boolean;
  onClose: (
    medicineId: string | null,
    medicineName: string | null,
    medicine?: MedicineSearchResult | null
  ) => void;
}

const SCANNER_ELEMENT_ID = "medicine-scanner-viewfinder";

export function MedicineScanner({ open, onClose }: MedicineScannerProps) {
  const [status, setStatus] = useState<
    "idle" | "starting" | "scanning" | "found" | "not_found" | "error"
  >("idle");
  const [result, setResult] = useState<{
    found: boolean;
    medicineId?: string;
    medicineName?: string;
    barcode: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const scannerRef = useRef<unknown>(null);

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      const scanner = scannerRef.current as {
        isScanning?: boolean;
        stop: () => Promise<void>;
      };
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // Ignore stop errors
    }
    scannerRef.current = null;
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      // Stop immediately to prevent duplicate scans
      await stopScanner();

      const barcode = decodedText.trim();
      setStatus("idle");
      setResult(null);

      try {
        const { findMedicineByBarcode } = await import(
          "@/lib/offline/medicine-repository"
        );
        const medicine = await findMedicineByBarcode(barcode);

        if (medicine) {
          setResult({
            found: true,
            medicineId: medicine.id,
            medicineName: medicine.tradeName,
            barcode,
          });
          setStatus("found");
          setTimeout(() => {
            onClose(medicine.id, medicine.tradeName, medicine);
          }, 1200);
        } else {
          setResult({ found: false, barcode });
          setStatus("not_found");
        }
      } catch (err) {
        console.error("Barcode lookup error:", err);
        setResult({ found: false, barcode });
        setStatus("not_found");
      }
    },
    [stopScanner, onClose]
  );

  const startScanner = useCallback(async () => {
    await stopScanner();

    setStatus("starting");
    setErrorMessage("");
    setResult(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      const element = document.getElementById(SCANNER_ELEMENT_ID);
      if (!element) {
        throw new Error("Scanner element not found in DOM");
      }

      // Clear any previous content Html5Qrcode may have left
      element.innerHTML = "";

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;

      await scanner.start(
        // Use back camera on mobile, any camera on desktop
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScanSuccess,
        // Per-frame "not found" callback — silently ignore
        () => {}
      );

      setStatus("scanning");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start scanner";

      if (
        message.includes("Permission") ||
        message.includes("NotAllowedError")
      ) {
        setErrorMessage(
          "Camera permission denied. Please allow camera access in your browser settings and try again."
        );
      } else if (
        message.includes("NotFoundError") ||
        message.includes("Requested device not found")
      ) {
        setErrorMessage(
          "No camera found on this device. Please connect a camera and try again."
        );
      } else {
        setErrorMessage(message);
      }
      setStatus("error");
      scannerRef.current = null;
    }
  }, [stopScanner, handleScanSuccess]);

  const handleClose = useCallback(() => {
    stopScanner();
    onClose(null, null, null);
  }, [stopScanner, onClose]);

  const handleScanAgain = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setTimeout(startScanner, 300);
  }, [startScanner]);

  // Start when dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(startScanner, 400);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Medicine Barcode
          </DialogTitle>
          <DialogDescription>
            Point your camera at the medicine barcode or QR code
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Viewfinder — Html5Qrcode creates its own video element inside this div */}
          <div className="relative overflow-hidden rounded-lg bg-black aspect-square max-h-[300px]">
            <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />
            {(status === "starting" || status === "idle") && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                  <p className="text-sm text-white/80">
                    {status === "starting"
                      ? "Starting camera..."
                      : "Initializing scanner..."}
                  </p>
                </div>
              </div>
            )}
            {status === "scanning" && (
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  Scanning...
                </span>
              </div>
            )}
          </div>

          {/* Found */}
          {status === "found" && result && (
            <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-3 dark:bg-green-950/30 dark:border-green-800">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-green-900 dark:text-green-300">
                  Medicine Found
                </p>
                <p className="text-sm text-green-700 dark:text-green-400 truncate">
                  {result.medicineName}
                </p>
              </div>
            </div>
          )}

          {/* Not found */}
          {status === "not_found" && result && (
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
                  Barcode Not Registered
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 font-mono break-all">
                  {result.barcode}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  This barcode is not in the database. Please search and select
                  the medicine manually.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-3 dark:bg-red-950/30 dark:border-red-800">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-300">
                  Scanner Error
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            {(status === "not_found" || status === "error") && (
              <Button
                variant="outline"
                onClick={handleScanAgain}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan Again
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}