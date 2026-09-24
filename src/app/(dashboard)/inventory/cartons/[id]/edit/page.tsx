"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getCartonById, updateCarton } from "@/lib/offline/warehouse-repository";
import { LoadingState } from "@/components/shared/loading-state";

export default function EditCartonPage() {
  const router = useRouter();
  const params = useParams();
  const cartonId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [category, setCategory] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const carton = await getCartonById(cartonId);
      if (carton) {
        setCode(carton.code);
        setLabel(carton.label || "");
        setSpecialty(carton.specialty || "");
        setCategory(carton.category || "");
        setLocationNote(carton.locationNote || "");
      }
      setLoading(false);
    }
    load();
  }, [cartonId]);

  async function handleUpdate() {
    setError("");
    if (!code.trim()) {
      setError("Carton code is required.");
      return;
    }
    setSubmitting(true);
    try {
      await updateCarton(cartonId, {
        label: label.trim(),
        specialty: specialty.trim() || undefined,
        category: category.trim() || undefined,
        locationNote: locationNote.trim(),
      });
      router.push(`/inventory/cartons/${cartonId}`);
    } catch (err) {
      setError("Failed to update carton.");
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState message="Loading carton..." />;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mr-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div>
          <h1 className="text-xl font-semibold">Edit Carton</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update carton details.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. C-001"
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Emergency Medicines"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Specialization (Optional)</Label>
            <Input
              id="specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g. Acidity, Cold & Flu"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. General, Pediatrics"
            />
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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}