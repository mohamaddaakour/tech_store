import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ArrowRight, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import type { Product } from "../../types/product";
import { formatPrice } from "../../lib/format";
import { extractSpecs, getBrand } from "../../lib/catalog";
import { useCartStore } from "../../store/cartStore";
import { Badge } from "../ui/Badge";
import { Button, ButtonLink } from "../ui/Button";

interface FeaturedHeroProps {
  product: Product;
}

/**
 * The cinematic hero panel at the top of the dashboard.
 *
 * ## The parallax
 *
 * Moving the mouse across the panel shifts the artwork one way and the text the
 * other, by different amounts. That difference is what the eye reads as depth —
 * a single layer moving would just look like it was sliding.
 *
 * Two implementation details make it feel good rather than twitchy:
 *
 * - Mouse position is normalised to −0.5…0.5 of the panel, so the effect is
 *   identical on a phone and an ultrawide.
 * - The raw values go through `useSpring`, which adds momentum and smoothing.
 *   Wiring the pointer straight to the transform makes the image jitter with every
 *   micro-movement of the hand.
 *
 * All of it is disabled under reduced motion, where the panel is simply static.
 */
export function FeaturedHero({ product }: FeaturedHeroProps) {
  const addToCart = useCartStore((state) => state.add);
  const reduceMotion = useReducedMotion();

  // Normalised pointer position within the panel.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  // Smoothed versions. Low stiffness + high damping = heavy, liquid motion.
  const smoothX = useSpring(pointerX, { stiffness: 90, damping: 22 });
  const smoothY = useSpring(pointerY, { stiffness: 90, damping: 22 });

  // The two layers move in opposite directions, and the artwork moves further.
  const artworkX = useTransform(smoothX, [-0.5, 0.5], [26, -26]);
  const artworkY = useTransform(smoothY, [-0.5, 0.5], [18, -18]);
  const copyX = useTransform(smoothX, [-0.5, 0.5], [-10, 10]);

  function handlePointerMove(event: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  /** Recentre on leave, so the panel settles rather than freezing mid-tilt. */
  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  // Only the parsed specs, minus the brand/category rows the panel shows elsewhere.
  const specs = extractSpecs(product).slice(2, 6);

  return (
    <div
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      className="relative overflow-hidden rounded-panel ring-1 ring-line"
    >
      {/* ---- Background artwork ----
          The product image, blown up, blurred and dimmed. It fills the panel with
          colour drawn from the product itself, which is why every hero feels
          bespoke without any per-product design work. */}
      <div className="absolute inset-0">
        <img
          src={product.imageUrl}
          alt=""
          aria-hidden="true"
          className="size-full scale-110 object-cover opacity-30 blur-2xl"
        />
        {/* Two scrims: one darkens left-to-right so the copy stays readable, one
            grounds the bottom edge. */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
      </div>

      <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-4 lg:p-14">
        {/* ---- Copy ---- */}
        <motion.div
          style={{ x: reduceMotion ? 0 : copyX }}
          className="flex flex-col items-start gap-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">Featured</Badge>
            <Badge tone="neutral">{getBrand(product)}</Badge>
            {product.stock <= 5 && product.inStock && (
              <Badge tone="warn">Only {product.stock} left</Badge>
            )}
          </div>

          {/* Staggered entrance: heading, then blurb, then actions. The eye is led
              down the panel in the order the content should be read. */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
            className="text-3xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl"
          >
            {product.name}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.6, delay: 0.1, ease: [0.25, 1, 0.5, 1] }
            }
            className="max-w-md text-sm leading-relaxed text-ink-muted sm:text-base"
          >
            {product.description}
          </motion.p>

          {/* Spec chips, parsed from the real description. */}
          {specs.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {specs.map((spec, index) => (
                <motion.li
                  key={spec.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={
                    reduceMotion ? { duration: 0 } : { duration: 0.35, delay: 0.2 + index * 0.06 }
                  }
                  className="rounded-full glass px-3 py-1 text-[11px] font-medium text-ink-muted"
                >
                  {spec.value}
                </motion.li>
              ))}
            </ul>
          )}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.25, ease: [0.25, 1, 0.5, 1] }
            }
            className="flex flex-wrap items-center gap-3 pt-1"
          >
            <span className="text-2xl font-black tabular-nums text-ink sm:text-3xl">
              {formatPrice(product.priceCents)}
            </span>

            <Button
              disabled={!product.inStock}
              onClick={() => {
                addToCart(product);
                toast.success(`${product.name} added to cart`);
              }}
            >
              <ShoppingCart className="size-4" />
              {product.inStock ? "Add to cart" : "Sold out"}
            </Button>

            <ButtonLink to={`/product/${product.id}`} variant="secondary">
              Details
              <ArrowRight className="size-4" />
            </ButtonLink>
          </motion.div>
        </motion.div>

        {/* ---- Foreground artwork ----
            `hidden lg:block`: the parallax needs real space to be legible, and on a
            phone the panel is already carrying the blurred background version. */}
        <motion.div
          style={{ x: reduceMotion ? 0 : artworkX, y: reduceMotion ? 0 : artworkY }}
          className="hidden lg:block"
        >
          <motion.img
            src={product.imageUrl}
            alt={product.name}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
            className="mx-auto w-full max-w-lg rounded-card object-cover shadow-2xl ring-1 ring-line-strong"
          />
        </motion.div>
      </div>
    </div>
  );
}
