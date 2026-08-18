import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "../../components/ui/icons";
import { toast } from "../../store/toastStore";
import { getErrorMessage } from "../../api/client";
import {
  useCreateBrand,
  useCreateCategory,
  useDeleteBrand,
  useDeleteCategory,
  useUpdateBrand,
  useUpdateCategory,
} from "../../hooks/useAdmin";
import { useBrands, useCategories } from "../../hooks/useProducts";
import { pluralize } from "../../lib/format";
import type { Facet } from "../../types/product";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";

export default function AdminCatalogPage() {
  const { data: categories, isPending: categoriesPending } = useCategories();
  const { data: brands, isPending: brandsPending } = useBrands();

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <FacetPanel
        title="Categories"
        noun="category"
        facets={categories}
        isPending={categoriesPending}
        isBusy={createCategory.isPending || updateCategory.isPending || deleteCategory.isPending}
        onCreate={(name) =>
          createCategory.mutate(name, {
            onSuccess: () => toast.success(`Category “${name}” created`),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
        }
        onRename={(id, name) =>
          updateCategory.mutate(
            { id, name },
            {
              onSuccess: () => toast.success("Category renamed"),
              onError: (error) => toast.error(getErrorMessage(error)),
            },
          )
        }
        onDelete={(facet) =>
          deleteCategory.mutate(facet.id, {
            onSuccess: () => toast.success(`Category “${facet.name}” deleted`),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
        }
      />

      <FacetPanel
        title="Brands"
        noun="brand"
        facets={brands}
        isPending={brandsPending}
        isBusy={createBrand.isPending || updateBrand.isPending || deleteBrand.isPending}
        onCreate={(name) =>
          createBrand.mutate(name, {
            onSuccess: () => toast.success(`Brand “${name}” created`),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
        }
        onRename={(id, name) =>
          updateBrand.mutate(
            { id, name },
            {
              onSuccess: () => toast.success("Brand renamed"),
              onError: (error) => toast.error(getErrorMessage(error)),
            },
          )
        }
        onDelete={(facet) =>
          deleteBrand.mutate(facet.id, {
            onSuccess: () => toast.success(`Brand “${facet.name}” deleted`),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
        }
      />
    </div>
  );
}

interface FacetPanelProps {
  title: string;

  noun: string;
  facets: Facet[] | undefined;
  isPending: boolean;
  isBusy: boolean;
  onCreate: (name: string) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (facet: Facet) => void;
}

function FacetPanel({
  title,
  noun,
  facets,
  isPending,
  isBusy,
  onCreate,
  onRename,
  onDelete,
}: FacetPanelProps) {
  const [newName, setNewName] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  function submitNew(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    onCreate(trimmed);
    setNewName("");
  }

  function startEdit(facet: Facet) {
    setEditingId(facet.id);
    setEditingName(facet.name);
  }

  function commitEdit() {
    const trimmed = editingName.trim();

    if (editingId !== null && trimmed) onRename(editingId, trimmed);
    setEditingId(null);
  }

  return (
    <section className="flex flex-col rounded-card bg-surface p-5 ring-1 ring-line">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      <p className="mt-0.5 text-[11px] text-ink-muted">
        URL slugs are generated automatically from the name
      </p>

      <form onSubmit={submitNew} className="mt-4 flex gap-2">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder={`New ${noun} name`}
          className="h-9 flex-1 rounded-control bg-surface-2 px-3 text-xs text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
        />
        <Button type="submit" size="sm" disabled={!newName.trim()} loading={isBusy}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </form>

      <ul className="mt-4 divide-y divide-line">
        {isPending
          ? Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="py-2.5">
                <Skeleton className="h-6 w-full" />
              </li>
            ))
          : (facets ?? []).map((facet) => (
              <li key={facet.id} className="flex items-center gap-2 py-2.5">
                {editingId === facet.id ? (
                  <>
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}

                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitEdit();
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="h-8 flex-1 rounded-control bg-surface-2 px-2 text-xs text-ink ring-1 ring-accent outline-none"
                    />
                    <button
                      onClick={commitEdit}
                      aria-label="Save"
                      className="grid size-7 place-items-center rounded-control text-accent transition-colors hover:bg-surface-3"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel"
                      className="grid size-7 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-3"
                    >
                      <X className="size-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                      {facet.name}
                    </span>
                    <Badge tone={facet.productCount > 0 ? "neutral" : "warn"}>
                      {pluralize(facet.productCount, "product")}
                    </Badge>
                    <button
                      onClick={() => startEdit(facet)}
                      aria-label={`Rename ${facet.name}`}
                      className="grid size-7 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(facet)}
                      aria-label={`Delete ${facet.name}`}
                      className="grid size-7 place-items-center rounded-control text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </li>
            ))}
      </ul>

      <p className="mt-4 text-[10px] leading-relaxed text-ink-faint">
        Deleting a {noun} does not delete its products; they simply become unassigned.
      </p>
    </section>
  );
}
