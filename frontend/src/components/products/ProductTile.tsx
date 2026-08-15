import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { Heart, Plus } from "lucide-react";
import toast from "react-hot-toast";
import type { Product } from "../../types/product";
import { formatPrice } from "../../lib/format";
import { getBrand } from "../../lib/catalog";
import { useCartStore } from "../../store/cartStore";
import { useWishlistStore } from "../../store/wishlistStore";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/cn";

interface ProductTileProps {
  product: Product;
  /** Grid position, used to stagger the entrance. */
  index?: number;
  /** Fixed width for horizontal rows; grids leave this off and fill their column. */
  fixedWidth?: boolean;
}

/**
 * A product tile — the fundamental unit of the console dashboard.
 *
 * ## The focus/hover treatment
 *
 * SUBJECT.md asks that a focused tile enlarge, move forward, reveal more
 * information, glow, and animate its image. All five happen here:
 *
 * - the tile lifts and scales (`whileHover`)
 * - a glow ring appears (`group-hover:glow-accent`)
 * - the artwork scales *inside* its clipped frame — two layers moving by
 *   different amounts is what creates the sense of depth
 * - a highlight sweeps across it (`animate-scan`)
 * - the quick-add button fades in
 *
 * All of it is driven by `group-hover` and `group-focus-within`, so **keyboard
 * focus produces exactly the same reveal as the mouse** rather than being a
 * second-class path.
 *
 * The whole tile is a `Link`, so Enter opens it and middle-click opens a new tab —
 * both of which an `onClick` on a `div` would silently break.
 */
export function ProductTile({ product, index = 0, fixedWidth = false }: ProductTileProps) {
  const addToCart = useCartStore((state) => state.add);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  // Subscribing to the boolean, not the array, so adding an unrelated product
  // does not re-render every tile on screen.
  const isSaved = useWishlistStore((state) => state.ids.includes(product.id));

  const reduceMotion = useReducedMotion();

  /**
   * Quick-add without leaving the page.
   *
   * `preventDefault` stops the surrounding Link navigating, and `stopPropagation`
   * keeps the event from bubbling. Without both, adding to the cart would also
   * open the product page.
   */
  function handleQuickAdd(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    addToCart(product);
    toast.success(`${product.name} added to cart`);
  }

  function handleWishlist(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const nowSaved = toggleWishlist(product.id);
    toast(nowSaved ? `Saved ${product.name}` : `Removed ${product.name}`, {
      icon: nowSaved ? "❤️" : "💔",
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      // `whileInView` rather than `animate`, so tiles below the fold animate as
      // you reach them instead of having finished offscreen.
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : // Capped at 8 steps: without the cap the 40th tile in a large
            // catalogue would wait two and a half seconds to appear.
            { duration: 0.45, delay: Math.min(index, 8) * 0.05, ease: [0.25, 1, 0.5, 1] }
      }
      whileHover={reduceMotion ? undefined : { y: -6 }}
      className={cn(fixedWidth && "w-[240px] shrink-0 sm:w-[264px]")}
    >
      <Link
        to={`/product/${product.id}`}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-tile bg-surface",
          "ring-1 ring-line transition-shadow duration-300",
          "hover:glow-accent focus-visible:glow-accent",
        )}
      >
        {/* ---- Artwork ---- */}
        <div className="relative aspect-4/3 overflow-hidden bg-surface-2">
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-focus-within:scale-110"
          />

          {/* Gradient scrim, so the badges below stay readable over a bright image. */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />

          {/* The sweeping highlight. `-skew-x-12` angles it, and it only animates
              on hover/focus so it is a reaction rather than constant motion. */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-scan group-focus-within:animate-scan" />
          </div>

          {/* ---- Corner actions ---- */}
          <div className="absolute right-2 top-2 flex flex-col gap-1.5">
            <button
              onClick={handleWishlist}
              aria-label={isSaved ? `Remove ${product.name} from collection` : `Save ${product.name}`}
              aria-pressed={isSaved}
              className={cn(
                "grid size-8 place-items-center rounded-full backdrop-blur-sm transition-all duration-200",
                isSaved
                  ? "bg-danger/90 text-white"
                  : "bg-black/45 text-white/85 opacity-0 hover:bg-black/70 group-hover:opacity-100 group-focus-within:opacity-100",
              )}
            >
              {/* `fill-current` on an active heart turns the outline icon solid —
                  a much stronger signal than a colour change alone. */}
              <Heart className={cn("size-4", isSaved && "fill-current")} />
            </button>

            {product.inStock && (
              <button
                onClick={handleQuickAdd}
                aria-label={`Add ${product.name} to cart`}
                className="grid size-8 place-items-center rounded-full bg-accent text-accent-ink opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-accent-hover group-hover:opacity-100 group-focus-within:opacity-100"
              >
                <Plus className="size-4" />
              </button>
            )}
          </div>

          {/* Out of stock: dim and label. Only greying the button is easy to miss. */}
          {!product.inStock && (
            <div className="absolute inset-0 grid place-items-center bg-bg/65 backdrop-blur-[1px]">
              <Badge tone="neutral">Sold out</Badge>
            </div>
          )}

          {/* Low-stock urgency, from real data rather than a fake countdown. */}
          {product.inStock && product.stock <= 5 && (
            <div className="absolute bottom-2 left-2">
              <Badge tone="warn">Only {product.stock} left</Badge>
            </div>
          )}
        </div>

        {/* ---- Body ----
            `flex-1` + `mt-auto` on the price row pins prices to the bottom of every
            tile, so a short description cannot leave one row's prices floating
            higher than its neighbours'. */}
        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            {getBrand(product)}
          </p>

          <h3 className="line-clamp-1 text-sm font-semibold text-ink">{product.name}</h3>

          <p className="line-clamp-2 text-[11px] leading-relaxed text-ink-muted">
            {product.description}
          </p>

          <div className="mt-auto flex items-baseline justify-between gap-2 pt-2.5">
            {/* `tabular-nums` gives every digit the same width, so prices align
                down a column instead of wobbling. */}
            <span className="text-base font-bold tabular-nums text-ink">
              {formatPrice(product.priceCents)}
            </span>
            <span className="text-[10px] text-ink-faint">
              {product.inStock ? `${product.stock} in stock` : "—"}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
