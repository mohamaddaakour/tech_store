import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "../../types/product";
import { ProductTile } from "./ProductTile";
import { cn } from "../../lib/cn";

interface ProductRowProps {
  title: string;
  subtitle?: string;
  products: Product[];
  /** Optional "see all" destination. */
  viewAllTo?: string;
}

/**
 * A horizontally scrolling row of tiles — the console dashboard's core layout unit.
 *
 * Scrolling is native (`overflow-x-auto` + `snap-x`), not a JS carousel. That is a
 * deliberate choice: native scroll gives touch swipe, trackpad gestures, keyboard
 * scrolling and momentum for free, and cannot desynchronise the way a hand-rolled
 * transform-based carousel does. The arrow buttons simply call `scrollBy`.
 *
 * The arrows hide themselves when there is nothing further to scroll, so the
 * control never lies about what it will do.
 */
export function ProductRow({ title, subtitle, products, viewAllTo }: ProductRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  /**
   * Recomputes which arrows are usable.
   *
   * The `- 1` absorbs sub-pixel rounding: at the far right, `scrollLeft +
   * clientWidth` often lands a fraction short of `scrollWidth`, which would leave
   * the right arrow enabled forever.
   */
  function updateArrows() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    setCanScrollLeft(scroller.scrollLeft > 4);
    setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1);
  }

  useEffect(() => {
    updateArrows();

    // Also react to viewport resizes: a row that needed arrows at 800px wide may
    // fit entirely at 1600px.
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
    // Re-runs when the product count changes, since that changes scrollWidth.
  }, [products.length]);

  function scrollByPage(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // Scroll by 80% of the visible width rather than 100%, so a partially visible
    // tile stays on screen as a visual anchor for where you were.
    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: "smooth" });
  }

  // Render nothing at all rather than an empty titled row — a heading over blank
  // space looks like a failed request.
  if (products.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {viewAllTo && (
            <Link
              to={viewAllTo}
              className="text-xs font-medium text-accent transition-opacity hover:opacity-75"
            >
              See all
            </Link>
          )}

          {/* Arrows are desktop-only: on touch you simply swipe, and the buttons
              would just consume space. */}
          <div className="hidden items-center gap-1 sm:flex">
            <RowArrow direction="left" disabled={!canScrollLeft} onClick={() => scrollByPage(-1)} />
            <RowArrow direction="right" disabled={!canScrollRight} onClick={() => scrollByPage(1)} />
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={updateArrows}
        // `snap-x` + `snap-start` on each child makes scrolling settle with a tile
        // aligned to the left edge instead of stopping mid-tile.
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2"
      >
        {products.map((product, index) => (
          <div key={product.id} className="snap-start">
            <ProductTile product={product} index={index} fixedWidth />
          </div>
        ))}
      </div>
    </section>
  );
}

/** One scroll arrow. Split out purely to keep the row markup readable. */
function RowArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Scroll ${direction}`}
      className={cn(
        "grid size-8 place-items-center rounded-full bg-surface-2 text-ink-muted ring-1 ring-line",
        "transition-all duration-150 hover:bg-surface-3 hover:text-ink",
        // Fade rather than vanish, so the row's controls do not shift position
        // when one becomes unavailable.
        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
