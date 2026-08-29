"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

interface SavedLocallyBannerProps {
  show: boolean;
  onHide: () => void;
}

export function SavedLocallyBanner({ show, onHide }: SavedLocallyBannerProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setExiting(false);
      const t1 = setTimeout(() => setExiting(true), 2200);
      const t2 = setTimeout(() => {
        setVisible(false);
        setExiting(false);
        onHide();
      }, 2800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [show, onHide]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-3 rounded-lg shadow-lg flex items-center gap-2.5 transition-all duration-300 ${
        exiting
          ? "opacity-0 translate-y-2"
          : "opacity-100 translate-y-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <CheckCircle className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">Saved locally</span>
    </div>
  );
}