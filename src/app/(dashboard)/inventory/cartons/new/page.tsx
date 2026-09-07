"use client";

import { useState } from "react";
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
import { createCarton } from "@/lib/offline/warehouse-repository";
import { useRouter } from "next/navigation";

// قائمة التخصصات والفئات التابعة لها (مرتبة أبجدياً)
const MEDICAL_SPECIALTIES: Record<string, string[]> = {
  "Cardiology": ["Hypertension", "Cholesterol & Lipids", "Heart Failure", "Antiplatelets"],
  "Endocrinology": ["Diabetes", "Thyroid Disorders", "Osteoporosis"],
  "Gastroenterology": ["Acidity & Ulcers", "Constipation", "Diarrhea & Vomiting", "Liver & Gallbladder"],
  "General": ["Pain Killers", "Antibiotics", "Vitamins & Supplements", "Cold & Flu", "First Aid"],
  "Neurology & Psychiatry": ["Epilepsy", "Depression & Anxiety", "Sleep Disorders", "Pain & Migraine"],
  "Respiratory": ["Asthma & COPD", "Cough & Cold", "Allergies"],
};

export default function NewCartonPage() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [category, setCategory] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [error, setError] = useState("");

  // جلب الفئات بناءً على التخصص المختار
  const availableCategories = specialty ? MEDICAL_SPECIALTIES[specialty] : [];

  async function handleCreate() {
    setError("");

    const codeTrimmed = code.trim();
    if (!codeTrimmed) {
      setError("Carton code is required.");
      return;
    }

    if (!specialty) {
      setError("Specialty is required.");
      return;
    }

    if (!category) {
      setError("Category is required.");
      return;
    }

    setSubmitting(true);
    const result = await createCarton({
      code: codeTrimmed,
      specialty,
      category,
      locationNote: locationNote.trim(),
    });
    setSubmitting(false);

    if (result.success) {
      router.push("/inventory/cartons");
    } else {
      setError(result.error || "Failed to create carton.");
    }
  }

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
            Add a new carton and assign its medical specialty.
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
            <Label htmlFor="specialty">
              Specialty <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={specialty} 
              onValueChange={(val) => {
                setSpecialty(val);
                setCategory(""); // إعادة تعيين الفئة عند تغيير التخصص
              }}
            >
              <SelectTrigger id="specialty">
                <SelectValue placeholder="Select specialty..." />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(MEDICAL_SPECIALTIES).sort().map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={category} 
              onValueChange={setCategory} 
              disabled={!specialty}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
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
            disabled={submitting || !code.trim() || !specialty || !category}
          >
            {submitting ? "Creating..." : "Create Carton"}
          </Button>
        </div>
      </div>
    </div>
  );
}