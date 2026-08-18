import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "../../components/ui/icons";
import { toast } from "../../store/toastStore";
import { getErrorMessage } from "../../api/client";
import { useAdminProducts, useDeleteProduct } from "../../hooks/useAdmin";
import { formatPrice, pluralize } from "../../lib/format";
import type { Product } from "../../types/product";
import { ProductFormModal } from "../../components/admin/ProductFormModal";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Product | undefined>();
  const [isFormOpen, setFormOpen] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Product | undefined>();

  const { data, isPending, error, refetch, isFetching } = useAdminProducts({
    ...(search ? { search } : {}),
    page,
  });
  const deleteProduct = useDeleteProduct();

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!pendingDelete) return;

    deleteProduct.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success(`${pendingDelete.name} deleted`);
        setPendingDelete(undefined);
      },
      onError: (deleteError) => toast.error(getErrorMessage(deleteError)),
    });
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Could not load products"
        message={getErrorMessage(error)}
        action={
          <Button variant="secondary" size="sm" loading={isFetching} onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const products = data?.content ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);

              setPage(0);
            }}
            placeholder="Search products…"
            className="h-10 w-full rounded-control bg-surface-2 pl-9 pr-3 text-sm text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <Button onClick={openCreate}>
          <Plus className="size-4" />
          New product
        </Button>
      </div>

      <p className="text-xs text-ink-muted">
        {isPending ? "Loading…" : pluralize(data?.totalElements ?? 0, "product")}
      </p>

      <div className="overflow-hidden rounded-card bg-surface ring-1 ring-line">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-widest text-ink-faint">
                <th className="px-4 py-3 font-bold">Product</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold">Brand</th>
                <th className="px-4 py-3 text-right font-bold">Price</th>
                <th className="px-4 py-3 text-right font-bold">Stock</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {isPending
                ? Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={6} className="px-4 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                : products.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="size-9 shrink-0 rounded-control object-cover ring-1 ring-line"
                          />
                          <span className="max-w-[16rem] truncate text-xs font-medium text-ink">
                            {product.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">
                        {product.categoryName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">
                        {product.brandName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-ink">
                        {formatPrice(product.priceCents)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {product.stock === 0 ? (
                          <Badge tone="danger">Sold out</Badge>
                        ) : product.stock <= 5 ? (
                          <Badge tone="warn">{product.stock}</Badge>
                        ) : (
                          <span className="text-xs tabular-nums text-ink-muted">{product.stock}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(product)}
                            aria-label={`Edit ${product.name}`}
                            className="grid size-8 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => setPendingDelete(product)}
                            aria-label={`Delete ${product.name}`}
                            className="grid size-8 place-items-center rounded-control text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isPending && products.length === 0 && (
          <p className="px-4 py-10 text-center text-xs text-ink-muted">
            {search ? `Nothing matches “${search}”.` : "No products yet."}
          </p>
        )}
      </div>

      {(data?.totalPages ?? 1) > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={data?.first}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <span className="text-xs tabular-nums text-ink-muted">
            {page + 1} / {data?.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={data?.last}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      )}

      <ProductFormModal
        key={editing?.id ?? "new"}
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
      />

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(undefined)}
        title="Delete product?"
        description={pendingDelete?.name}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs leading-relaxed text-ink-muted">
            This removes the product from the catalogue. Past orders keep their own record of the name
            and price it sold at, so sales history and receipts are unaffected.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setPendingDelete(undefined)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={deleteProduct.isPending}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
