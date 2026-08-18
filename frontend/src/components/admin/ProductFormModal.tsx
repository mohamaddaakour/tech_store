import { useState } from "react";
import { z } from "zod";
import { toast } from "../../store/toastStore";
import { getErrorMessage, getFieldErrors } from "../../api/client";
import { useCreateProduct, useUpdateProduct } from "../../hooks/useAdmin";
import { useBrands, useCategories } from "../../hooks/useProducts";
import type { Product } from "../../types/product";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

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
  categoryId: z.string(),
  brandId: z.string(),
});

interface FormState {
  name: string;
  description: string;
  priceDollars: string;
  stock: string;
  imageUrl: string;
  categoryId: string;
  brandId: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product;
}

export function ProductFormModal({ open, onClose, product }: ProductFormModalProps) {
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEditing = Boolean(product);
  const activeMutation = isEditing ? updateProduct : createProduct;

  const [values, setValues] = useState<FormState>(() => ({
    name: product?.name ?? "",
    description: product?.description ?? "",
    priceDollars: product ? String(product.priceCents / 100) : "0",
    stock: String(product?.stock ?? 0),
    imageUrl: product?.imageUrl ?? "https://placehold.co/600x400",
    categoryId: String(
      categories?.find((category) => category.slug === product?.categorySlug)?.id ?? "",
    ),
    brandId: String(brands?.find((brand) => brand.slug === product?.brandSlug)?.id ?? ""),
  }));
  const [errors, setErrors] = useState<FieldErrors>({});

  const serverFieldErrors = getFieldErrors(activeMutation.error);
  const formError =
    activeMutation.error && Object.keys(serverFieldErrors).length === 0
      ? getErrorMessage(activeMutation.error)
      : null;

  function updateField(field: keyof FormState, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result = schema.safeParse({
      ...values,
      priceDollars: Number(values.priceDollars),
      stock: Number(values.stock),
    });

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormState;
        fieldErrors[field] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    const parsed = result.data;
    const input = {
      name: parsed.name,
      description: parsed.description,
      priceCents: Math.round(parsed.priceDollars * 100),
      stock: parsed.stock,
      imageUrl: parsed.imageUrl,
      categoryId: parsed.categoryId ? Number(parsed.categoryId) : null,
      brandId: parsed.brandId ? Number(parsed.brandId) : null,
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
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Name"
          value={values.name}
          onChange={(event) => updateField("name", event.target.value)}
          error={errors.name ?? serverFieldErrors.name}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-description" className="text-xs font-medium text-ink-muted">
            Description
          </label>
          <textarea
            id="product-description"
            rows={3}
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
            className="w-full resize-y rounded-control bg-surface-2 px-3 py-2 text-sm text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
          />
          {errors.description && (
            <p role="alert" className="text-xs text-danger">
              {errors.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Price ($)"
            type="number"
            step="0.01"
            min="0"
            value={values.priceDollars}
            onChange={(event) => updateField("priceDollars", event.target.value)}
            error={errors.priceDollars ?? serverFieldErrors.priceCents}
          />
          <Input
            label="Stock"
            type="number"
            step="1"
            min="0"
            value={values.stock}
            onChange={(event) => updateField("stock", event.target.value)}
            error={errors.stock ?? serverFieldErrors.stock}
          />
        </div>

        <Input
          label="Image URL"
          value={values.imageUrl}
          onChange={(event) => updateField("imageUrl", event.target.value)}
          error={errors.imageUrl ?? serverFieldErrors.imageUrl}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="product-category" className="text-xs font-medium text-ink-muted">
              Category
            </label>
            <select
              id="product-category"
              value={values.categoryId}
              onChange={(event) => updateField("categoryId", event.target.value)}
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
              value={values.brandId}
              onChange={(event) => updateField("brandId", event.target.value)}
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
