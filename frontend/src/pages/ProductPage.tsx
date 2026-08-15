import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ArrowLeft, Check, ShieldCheck, Truck } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { useProduct, useProducts } from "../hooks/useProducts";
import { extractSpecs, getBrand, getCategory } from "../lib/catalog";
import { formatPrice } from "../lib/format";
import { useRecentlyViewedStore } from "../store/recentlyViewedStore";
import { ProductRow } from "../components/products/ProductRow";
import { PurchasePanel } from "../components/products/PurchasePanel";
import { Badge } from "../components/ui/Badge";
import { ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";

/**
 * The immersive full-screen product view (SUBJECT.md "Product Details Experience").
 *
 * Includes cinematic artwork with a 3D tilt, animated specification panels, a stock
 * meter, quantity stepper, add-to-cart and wishlist actions, and a related-products
 * row. Viewing the page records it to "recently viewed", which is what feeds the
 * dashboard's "Jump back in" row.
 *
 * Reviews, variants and product comparison from the spec are Phase 5 features
 * needing backend support, so they are deliberately absent rather than faked.
 */
export default function ProductPage() {
  const { id } = useParams<{ id: string }>();

  /**
   * `Number(id)` can be `NaN` for a URL like `/product/abc`. Normalising to
   * `undefined` lets the hook skip the request entirely rather than firing a
   * guaranteed-404 for `/api/products/NaN`.
   */
  const productId = Number(id);
  const validId = Number.isFinite(productId) ? productId : undefined;

  const { data: product, isPending, error } = useProduct(validId);
  const { data: allProducts } = useProducts();

  const recordView = useRecentlyViewedStore((state) => state.record);
  const reduceMotion = useReducedMotion();

  /**
   * Record the view once the product has actually loaded.
   *
   * Depends on the loaded product rather than the URL param, so a 404 is never
   * recorded — the dashboard's "Jump back in" row must only contain real products.
   *
   * This is a legitimate effect: it synchronises React state out to an external store
   * as a result of rendering, rather than setting this component's own state.
   */
  useEffect(() => {
    if (product) recordView(product.id);
  }, [product, recordView]);

  // ---- 3D tilt on the artwork ----
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 120, damping: 20 });
  const smoothY = useSpring(pointerY, { stiffness: 120, damping: 20 });
  // Pointer position maps to rotation, so the panel appears to tip toward the cursor.
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-9, 9]);
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [7, -7]);

  function handlePointerMove(event: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  /** Related: same category, excluding this product. Falls back to anything else. */
  const related = useMemo(() => {
    if (!allProducts || !product) return [];

    const category = getCategory(product);
    const sameCategory = allProducts.filter(
      (candidate) => candidate.id !== product.id && getCategory(candidate) === category,
    );

    if (sameCategory.length > 0) return sameCategory;
    return allProducts.filter((candidate) => candidate.id !== product.id);
  }, [allProducts, product]);

  const specs = useMemo(() => (product ? extractSpecs(product) : []), [product]);

  // ---- Loading ----
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

  // ---- Not found / error ----
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

  /** How full the stock bar is. Capped at 20 units so a 120-unit item is not pegged. */
  const stockPercent = Math.min(100, (product.stock / 20) * 100);

  return (
    <div className="flex flex-col gap-12">
      {/* ---- Back link ----
          A real link to the store rather than `history.back()`, which would send
          someone who arrived from a shared URL to whatever page preceded ours. */}
      <Link
        to="/store"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-3.5" />
        Back to store
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        {/* ================= ARTWORK ================= */}
        <div
          onMouseMove={handlePointerMove}
          onMouseLeave={() => {
            pointerX.set(0);
            pointerY.set(0);
          }}
          // `perspective` is what makes rotateX/rotateY read as 3D rather than as a
          // flat skew. Without it the tilt looks like a shear.
          style={{ perspective: 1200 }}
          className="relative"
        >
          <motion.div
            style={{
              rotateX: reduceMotion ? 0 : rotateX,
              rotateY: reduceMotion ? 0 : rotateY,
              transformStyle: "preserve-3d",
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
            className="relative overflow-hidden rounded-panel bg-surface ring-1 ring-line"
          >
            {/* Blurred copy of the artwork as a colour bed, so the panel picks up the
                product's own palette. */}
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

            {/* Sheen across the top edge — a glass highlight that sells the depth. */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
          </motion.div>

          {/* Trust badges. Real reassurance, positioned under the artwork where the
              eye lands after the image. */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: Truck, label: "Free delivery", hint: "Orders over $500" },
              { icon: ShieldCheck, label: "2-year warranty", hint: "Manufacturer" },
              { icon: Check, label: "30-day returns", hint: "No questions" },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.3 + index * 0.08 }}
                className="flex flex-col items-center gap-1 rounded-card glass px-2 py-3 text-center"
              >
                <item.icon className="size-4 text-accent" />
                <span className="text-[11px] font-semibold text-ink">{item.label}</span>
                <span className="text-[9px] text-ink-faint">{item.hint}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ================= DETAILS ================= */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{getBrand(product)}</Badge>
            <Badge tone="neutral">{getCategory(product)}</Badge>
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
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
              className="text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl"
            >
              {product.name}
            </motion.h1>

            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{product.description}</p>
          </div>

          <div className="flex items-end gap-3">
            <span className="text-3xl font-black tabular-nums text-ink">
              {formatPrice(product.priceCents)}
            </span>
            <span className="pb-1 text-[11px] text-ink-faint">incl. VAT</span>
          </div>

          {/* ---- Stock meter ----
              A bar communicates scarcity faster than a number. Animating the width
              from 0 draws the eye to it on load. */}
          {product.inStock && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-ink-muted">Availability</span>
                <span className="font-semibold tabular-nums text-ink">{product.stock} units</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stockPercent}%` }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
                  className={cn(
                    "h-full rounded-full",
                    product.stock <= 5 ? "bg-warn" : "gradient-accent",
                  )}
                />
              </div>
            </div>
          )}

          {/* ---- Actions ----
              `key={product.id}` is load-bearing: it makes React remount the panel when
              you navigate to a different product, which resets its quantity to 1
              without needing an effect. See PurchasePanel's own comment. */}
          <PurchasePanel key={product.id} product={product} />

          {/* ---- Specifications ----
              Parsed from the product's own text by `lib/catalog`. Each row slides in
              on a stagger, which is the "animated specification panels" the spec
              asks for. */}
          <div className="mt-2 overflow-hidden rounded-card bg-surface ring-1 ring-line">
            <h2 className="border-b border-line px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-faint">
              Specifications
            </h2>
            <dl className="divide-y divide-line">
              {specs.map((spec, index) => (
                <motion.div
                  key={spec.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={
                    reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.15 + index * 0.06 }
                  }
                  className="flex items-center justify-between gap-4 px-4 py-2.5"
                >
                  <dt className="text-xs text-ink-muted">{spec.label}</dt>
                  <dd className="text-xs font-semibold text-ink">{spec.value}</dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <ProductRow
        title="You might also like"
        subtitle={`More in ${getCategory(product)}`}
        products={related}
      />
    </div>
  );
}
