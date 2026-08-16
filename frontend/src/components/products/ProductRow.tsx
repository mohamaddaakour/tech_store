import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "../ui/icons";
import type { Product } from "../../types/product";
import { ProductTile } from "./ProductTile";
import { cn } from "../../lib/cn";

interface ProductRowProps {
  title: string;
  subtitle?: string;
  products: Product[];

  viewAllTo?: string;
}

export function ProductRow({ title, subtitle, products, viewAllTo }: ProductRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateArrows() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    setCanScrollLeft(scroller.scrollLeft > 4);
    setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1);
  }

  useEffect(() => {
    updateArrows();

    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [products.length]);

  function scrollByPage(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: "smooth" });
  }

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

          <div className="hidden items-center gap-1 sm:flex">
            <RowArrow direction="left" disabled={!canScrollLeft} onClick={() => scrollByPage(-1)} />
            <RowArrow direction="right" disabled={!canScrollRight} onClick={() => scrollByPage(1)} />
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={updateArrows}

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

        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
