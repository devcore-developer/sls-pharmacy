"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSections, createCarton } from "@/lib/offline/warehouse-repository";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewCartonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSection = searchParams.get("sectionId") || "";

  const [sections, setSections] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [sectionId, setSectionId] = useState(preselectedSection);
  const [locationNote, setLocationNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getSections().then((secs) => {
      setSections(secs.map((s) => ({ id: s.id, name: s.name, code: s.code })));
      setLoading(false);
    });
  }, []);

  async function handleCreate() {
    setError("");

    const codeTrimmed = code.trim();
    if (!codeTrimmed) {
      setError("Carton code is required.");
      return;
    }

    if (!label.trim()) {
      setError("Label is required.");
      return;
    }

    if (!sectionId) {
      setError("Section is required.");
      return;
    }

    setSubmitting(true);
    const result = await createCarton({
      code: codeTrimmed,
      label: label.trim(),
      sectionId,
      locationNote: locationNote.trim(),
    });
    setSubmitting(false);

    if (result.success) {
      router.push("/inventory/cartons");
    } else {
      setError(result.error || "Failed to create carton.");
    }
  }

  if (loading) return null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <Button
          variant="outline"
          onClick={() => router.push("/inventory/cartons")}
          className="mr-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cartons
        </Button>

        <div>
          <h1 className="text-xl font-semibold">New Carton</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add a new carton to organize your warehouse.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. C-001"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Cardiology Main"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="section">
              Section <span className="text-destructive">*</span>
            </Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger id="section">
                <SelectValue placeholder="Select section..." />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location Note</Label>
            <Input
              id="location"
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder="e.g. Shelf 2 / Level 3"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => router.push("/inventory/cartons")}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={submitting || !code.trim() || !label.trim() || !sectionId}
          >
            {submitting ? "Creating..." : "Create Carton"}
          </Button>
        </div>
      </div>
    </div>
  );
}