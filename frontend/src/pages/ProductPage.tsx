import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ShieldCheck, Truck } from "../components/ui/icons";
import { getErrorMessage } from "../api/client";
import { useProduct, useAllProducts } from "../hooks/useProducts";
import { extractSpecs, brandOf, categoryOf } from "../lib/catalog";
import { formatPrice } from "../lib/format";
import { useRecentlyViewedStore } from "../store/recentlyViewedStore";
import { ProductRow } from "../components/products/ProductRow";
import { PurchasePanel } from "../components/products/PurchasePanel";
import { Badge } from "../components/ui/Badge";
import { ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();

  const productId = Number(id);
  const validId = Number.isFinite(productId) ? productId : undefined;

  const { data: product, isPending, error } = useProduct(validId);
  const { data: allProducts } = useAllProducts();

  const recordView = useRecentlyViewedStore((state) => state.record);
  const [stockBarFilled, setStockBarFilled] = useState(false);

  useEffect(() => {
    if (product) recordView(product.id);
  }, [product, recordView]);

  useEffect(() => {
    const timer = setTimeout(() => setStockBarFilled(true), 30);
    return () => clearTimeout(timer);
  }, [product?.id]);

  const related = useMemo(() => {
    if (!allProducts || !product) return [];

    const category = categoryOf(product);
    const sameCategory = allProducts.filter(
      (candidate) => candidate.id !== product.id && categoryOf(candidate) === category,
    );

    if (sameCategory.length > 0) return sameCategory;
    return allProducts.filter((candidate) => candidate.id !== product.id);
  }, [allProducts, product]);

  const specs = useMemo(() => (product ? extractSpecs(product) : []), [product]);

  if (isPending && validId !== undefined) {
    return (
      <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading product">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-4/3 w-full rounded-panel" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <EmptyState
        icon="🔎"
        title="Product not found"
        message={error ? getErrorMessage(error) : `No product matches “${id}”.`}
        action={
          <ButtonLink to="/store" variant="secondary" size="sm">
            Back to store
          </ButtonLink>
        }
      />
    );
  }

  const stockPercent = Math.min(100, (product.stock / 20) * 100);

  return (
    <div className="flex flex-col gap-12">
      <Link
        to="/store"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-3.5" />
        Back to store
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div className="relative">
          <div className="animate-fade-in relative overflow-hidden rounded-panel bg-surface ring-1 ring-line transition-transform duration-300 hover:scale-[1.01]">
            <img
              src={product.imageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-full scale-125 object-cover opacity-25 blur-3xl"
            />

            <img
              src={product.imageUrl}
              alt={product.name}
              className="relative aspect-4/3 w-full object-cover"
            />

            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/10 via-transparent to-transparent" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: Truck, label: "Free delivery", hint: "Orders over $500" },
              { icon: ShieldCheck, label: "2-year warranty", hint: "Manufacturer" },
              { icon: Check, label: "30-day returns", hint: "No questions" },
            ].map((item, index) => (
              <div
                key={item.label}
                style={{ animationDelay: `${300 + index * 80}ms` }}
                className="animate-rise flex flex-col items-center gap-1 rounded-card glass px-2 py-3 text-center"
              >
                <item.icon className="size-4 text-accent" />
                <span className="text-[11px] font-semibold text-ink">{item.label}</span>
                <span className="text-[9px] text-ink-faint">{item.hint}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{brandOf(product)}</Badge>
            <Badge tone="neutral">{categoryOf(product)}</Badge>
            {product.inStock ? (
              product.stock <= 5 ? (
                <Badge tone="warn">Only {product.stock} left</Badge>
              ) : (
                <Badge tone="success">In stock</Badge>
              )
            ) : (
              <Badge tone="danger">Sold out</Badge>
            )}
          </div>

          <div>
            <h1 className="animate-rise text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
              {product.name}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{product.description}</p>
          </div>

          <div className="flex items-end gap-3">
            <span className="text-3xl font-black tabular-nums text-ink">
              {formatPrice(product.priceCents)}
            </span>
            <span className="pb-1 text-[11px] text-ink-faint">incl. VAT</span>
          </div>

          {product.inStock && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-ink-muted">Availability</span>
                <span className="font-semibold tabular-nums text-ink">{product.stock} units</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  style={{ width: stockBarFilled ? `${stockPercent}%` : 0 }}
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700 ease-out",
                    product.stock <= 5 ? "bg-warn" : "gradient-accent",
                  )}
                />
              </div>
            </div>
          )}

          <PurchasePanel key={product.id} product={product} />

          <div className="mt-2 overflow-hidden rounded-card bg-surface ring-1 ring-line">
            <h2 className="border-b border-line px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-faint">
              Specifications
            </h2>
            <dl className="divide-y divide-line">
              {specs.map((spec, index) => (
                <div
                  key={spec.label}
                  style={{ animationDelay: `${150 + index * 60}ms` }}
                  className="animate-rise flex items-center justify-between gap-4 px-4 py-2.5"
                >
                  <dt className="text-xs text-ink-muted">{spec.label}</dt>
                  <dd className="text-xs font-semibold text-ink">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <ProductRow
        title="You might also like"
        subtitle={`More in ${categoryOf(product)}`}
        products={related}
      />
    </div>
  );
}
