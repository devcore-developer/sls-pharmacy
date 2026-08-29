"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Tag, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SavedLocallyBanner } from "@/app/(dashboard)/medicines/components/saved-locally-banner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/offline/category-repository";
import {
  getAllPharmacologicalClasses,
  createPharmacologicalClass,
  updatePharmacologicalClass,
  deletePharmacologicalClass,
} from "@/lib/offline/pharmacological-class-repository";
import type {
  CategoryItem,
  PharmacologicalClassItem,
  CategoryFormData,
  PharmacologicalClassFormData,
} from "@/types";

type Tab = "categories" | "classes";

export default function CategoriesPage() {
  const [tab, setTab] = useState<Tab>("categories");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [pharmClasses, setPharmClasses] = useState<PharmacologicalClassItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  const [showCatDialog, setShowCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [deletingCat, setDeletingCat] = useState<CategoryItem | null>(null);
  const [catForm, setCatForm] = useState<CategoryFormData>({
    name: "",
    description: "",
  });
  const [catSubmitting, setCatSubmitting] = useState(false);

  const [showClassDialog, setShowClassDialog] = useState(false);
  const [editingClass, setEditingClass] =
    useState<PharmacologicalClassItem | null>(null);
  const [deletingClass, setDeletingClass] =
    useState<PharmacologicalClassItem | null>(null);
  const [classForm, setClassForm] = useState<PharmacologicalClassFormData>({
    name: "",
    description: "",
  });
  const [classSubmitting, setClassSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, cls] = await Promise.all([
        getAllCategories(),
        getAllPharmacologicalClasses(),
      ]);
      setCategories(cats);
      setPharmClasses(cls);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleSaved() {
    setShowBanner(true);
    loadData();
  }

  function openAddCat() {
    setEditingCat(null);
    setCatForm({ name: "", description: "" });
    setShowCatDialog(true);
  }

  function openEditCat(cat: CategoryItem) {
    setEditingCat(cat);
    setCatForm({ name: cat.name, description: "" });
    setShowCatDialog(true);
  }

  async function submitCat() {
    if (!catForm.name.trim()) return;
    setCatSubmitting(true);
    try {
      if (editingCat) {
        await updateCategory(editingCat.id, catForm);
      } else {
        await createCategory(catForm);
      }
      setShowCatDialog(false);
      handleSaved();
    } finally {
      setCatSubmitting(false);
    }
  }

  async function confirmDeleteCat() {
    if (!deletingCat) return;
    await deleteCategory(deletingCat.id);
    setDeletingCat(null);
    handleSaved();
  }

  function openAddClass() {
    setEditingClass(null);
    setClassForm({ name: "", description: "" });
    setShowClassDialog(true);
  }

  function openEditClass(cls: PharmacologicalClassItem) {
    setEditingClass(cls);
    setClassForm({ name: cls.name, description: "" });
    setShowClassDialog(true);
  }

  async function submitClass() {
    if (!classForm.name.trim()) return;
    setClassSubmitting(true);
    try {
      if (editingClass) {
        await updatePharmacologicalClass(editingClass.id, classForm);
      } else {
        await createPharmacologicalClass(classForm);
      }
      setShowClassDialog(false);
      handleSaved();
    } finally {
      setClassSubmitting(false);
    }
  }

  async function confirmDeleteClass() {
    if (!deletingClass) return;
    await deletePharmacologicalClass(deletingClass.id);
    setDeletingClass(null);
    handleSaved();
  }

  if (loading) return <LoadingState message="Loading..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classifications"
        description="Manage categories and pharmacological classifications."
      />

      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setTab("categories")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
            tab === "categories"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Tag className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          Categories ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("classes")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
            tab === "classes"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FlaskConical className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          Pharmacological Classes ({pharmClasses.length})
        </button>
      </div>

      {tab === "categories" && (
        <div>
          <div className="flex justify-end">
            <Button size="sm" onClick={openAddCat}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Category
            </Button>
          </div>
          {categories.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No categories configured"
              description="Create categories to organize your medicines."
              action={{ label: "Add Category", onClick: openAddCat }}
            />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead className="w-[100px] pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="pl-6 font-medium text-foreground">
                        {cat.name}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEditCat(cat)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingCat(cat)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {tab === "classes" && (
        <div>
          <div className="flex justify-end">
            <Button size="sm" onClick={openAddClass}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Class
            </Button>
          </div>
          {pharmClasses.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No pharmacological classes configured"
              description="Create classifications for your medicines."
              action={{ label: "Add Class", onClick: openAddClass }}
            />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead className="w-[100px] pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pharmClasses.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="pl-6 font-medium text-foreground">
                        {cls.name}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEditClass(cls)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingClass(cls)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingCat ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCat
                ? "Update category details."
                : "Create a new category."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={catForm.name}
                onChange={(e) =>
                  setCatForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Cardiology"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={catForm.description}
                onChange={(e) =>
                  setCatForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCatDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={submitCat}
                disabled={catSubmitting || !catForm.name.trim()}
              >
                {catSubmitting
                  ? "Saving..."
                  : editingCat
                    ? "Save Changes"
                    : "Add Category"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingCat !== null}
        onOpenChange={(o) => {
          if (!o) setDeletingCat(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingCat?.name}
              </span>
              ? Medicine associations will be removed but medicines will not
              be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeletingCat(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCat}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showClassDialog} onOpenChange={setShowClassDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingClass ? "Edit Class" : "Add Pharmacological Class"}
            </DialogTitle>
            <DialogDescription>
              {editingClass
                ? "Update class details."
                : "Create a new pharmacological classification."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={classForm.name}
                onChange={(e) =>
                  setClassForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Antibiotics"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={classForm.description}
                onChange={(e) =>
                  setClassForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowClassDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={submitClass}
                disabled={classSubmitting || !classForm.name.trim()}
              >
                {classSubmitting
                  ? "Saving..."
                  : editingClass
                    ? "Save Changes"
                    : "Add Class"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingClass !== null}
        onOpenChange={(o) => {
          if (!o) setDeletingClass(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Pharmacological Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingClass?.name}
              </span>
              ? Medicine associations will be removed but medicines will not
              be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeletingClass(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteClass}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SavedLocallyBanner
        show={showBanner}
        onHide={() => setShowBanner(false)}
      />
    </div>
  );
}