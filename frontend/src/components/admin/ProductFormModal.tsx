import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { getErrorMessage, getFieldErrors } from "../../api/client";
import { useCreateProduct, useUpdateProduct } from "../../hooks/useAdmin";
import { useBrands, useCategories } from "../../hooks/useProducts";
import type { Product } from "../../types/product";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

/**
 * Form schema.
 *
 * Prices are entered in **dollars** but the API takes **cents**, so the conversion happens on submit.
 * Asking an admin to type "149900" for $1,499 would be a reliable source of hundred-fold pricing
 * mistakes.
 *
 * The numeric fields are plain `z.number()`, and the conversion from the input's string value happens
 * at registration with `{ valueAsNumber: true }`. That is deliberately *not* `z.coerce.number()`:
 * coercion makes the schema's input type `unknown`, which no longer matches its output type, and
 * `useForm` then needs three generic parameters to reconcile them. Converting at the input keeps one
 * type throughout. An empty field yields `NaN`, which `z.number()` rejects — hence the messages below.
 */
const schema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name is too long"),
  description: z.string().max(5000, "Description is too long"),
  priceDollars: z
    .number({ message: "Enter a price" })
    .min(0, "Price cannot be negative")
    .max(1_000_000, "Price is unrealistically high"),
  stock: z
    .number({ message: "Enter a stock level" })
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),
  imageUrl: z.string().max(500, "URL is too long"),
  // "" is the sentinel for "none" — a `<select>` cannot hold null.
  categoryId: z.string(),
  brandId: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  /** The product being edited, or undefined to create a new one. */
  product?: Product;
}

/**
 * Create/edit product form.
 *
 * One component for both modes, since they differ only in which mutation they call and the default
 * values. Two near-identical forms would inevitably drift.
 *
 * Server-side `fieldErrors` are merged into the display, so a rule only the backend knows about (a
 * category that was deleted between page load and submit) still lands on the right input.
 */
export function ProductFormModal({ open, onClose, product }: ProductFormModalProps) {
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEditing = Boolean(product);
  const activeMutation = isEditing ? updateProduct : createProduct;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    /**
     * Defaults are computed from `product`, and the modal is keyed by product id at the call site so
     * this component remounts when the selection changes. That is what makes the defaults reload —
     * `useForm` reads `defaultValues` only on mount, so without the key an edit form would keep
     * showing the previously selected product.
     */
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      priceDollars: product ? product.priceCents / 100 : 0,
      stock: product?.stock ?? 0,
      imageUrl: product?.imageUrl ?? "https://placehold.co/600x400",
      // Look up the id from the slug: ProductResponse carries names and slugs, not ids.
      categoryId: String(
        categories?.find((category) => category.slug === product?.categorySlug)?.id ?? "",
      ),
      brandId: String(brands?.find((brand) => brand.slug === product?.brandSlug)?.id ?? ""),
    },
  });

  const serverFieldErrors = getFieldErrors(activeMutation.error);
  const formError =
    activeMutation.error && Object.keys(serverFieldErrors).length === 0
      ? getErrorMessage(activeMutation.error)
      : null;

  function onSubmit(values: FormValues) {
    const input = {
      name: values.name,
      description: values.description,
      // Dollars back to cents. Math.round guards against floating-point drift: 49.99 * 100 is
      // 4998.999999999999 in binary, and a bare cast would store 4998.
      priceCents: Math.round(values.priceDollars * 100),
      stock: values.stock,
      imageUrl: values.imageUrl,
      categoryId: values.categoryId ? Number(values.categoryId) : null,
      brandId: values.brandId ? Number(values.brandId) : null,
    };

    const onSuccess = () => {
      toast.success(isEditing ? "Product updated" : "Product created");
      onClose();
    };

    if (product) updateProduct.mutate({ id: product.id, input }, { onSuccess });
    else createProduct.mutate(input, { onSuccess });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit product" : "New product"}
      description={isEditing ? product?.name : "Add an item to the catalogue"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input label="Name" {...register("name")} error={errors.name?.message ?? serverFieldErrors.name} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-description" className="text-xs font-medium text-ink-muted">
            Description
          </label>
          <textarea
            id="product-description"
            rows={3}
            {...register("description")}
            className="w-full resize-y rounded-control bg-surface-2 px-3 py-2 text-sm text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
          />
          {errors.description && (
            <p role="alert" className="text-xs text-danger">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Price ($)"
            type="number"
            // Cents precision, and `min` gives the browser's stepper sane bounds.
            step="0.01"
            min="0"
            // `valueAsNumber` makes RHF hand Zod a number instead of the input's string.
            {...register("priceDollars", { valueAsNumber: true })}
            error={errors.priceDollars?.message ?? serverFieldErrors.priceCents}
          />
          <Input
            label="Stock"
            type="number"
            step="1"
            min="0"
            {...register("stock", { valueAsNumber: true })}
            error={errors.stock?.message ?? serverFieldErrors.stock}
          />
        </div>

        <Input
          label="Image URL"
          {...register("imageUrl")}
          error={errors.imageUrl?.message ?? serverFieldErrors.imageUrl}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="product-category" className="text-xs font-medium text-ink-muted">
              Category
            </label>
            <select
              id="product-category"
              {...register("categoryId")}
              className="h-10 rounded-control bg-surface-2 px-2 text-sm text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">None</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="product-brand" className="text-xs font-medium text-ink-muted">
              Brand
            </label>
            <select
              id="product-brand"
              {...register("brandId")}
              className="h-10 rounded-control bg-surface-2 px-2 text-sm text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">None</option>
              {brands?.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {formError && (
          <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-xs text-danger">
            {formError}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={activeMutation.isPending}>
            {isEditing ? "Save changes" : "Create product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
