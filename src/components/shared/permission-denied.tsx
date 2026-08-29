"use client";

import { ShieldX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PermissionDeniedProps {
  message?: string;
  onBack?: () => void;
}

export function PermissionDenied({ message, onBack }: PermissionDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <ShieldX className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {message ?? "You don't have permission to access this section."}
      </p>
      {onBack && (
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}
    </div>
  );
}