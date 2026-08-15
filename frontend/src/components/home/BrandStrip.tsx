import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import type { Product } from "../../types/product";
import { getBrand } from "../../lib/catalog";
import { pluralize } from "../../lib/format";

interface BrandStripProps {
  products: Product[];
}

/**
 * "Featured brands" — one tile per brand present in the catalogue, linking into a
 * pre-filtered store view.
 *
 * Brands are derived client-side (see `lib/catalog.ts`) because the backend has no
 * `Brand` entity yet. Deriving them from real products rather than hardcoding a
 * logo wall means the strip stays honest: it can only ever show brands that
 * actually have stock.
 *
 * Each tile deep-links to `/store?brand=…`, so the filter state lives in the URL and
 * is shareable and back-button friendly.
 */
export function BrandStrip({ products }: BrandStripProps) {
  const reduceMotion = useReducedMotion();

  /**
   * Group products by brand and count them.
   *
   * A `Map` rather than a plain object because it preserves insertion order and has
   * no prototype keys to collide with — a brand literally named "constructor" would
   * break an object accumulator.
   */
  const brandCounts = products.reduce<Map<string, number>>((counts, product) => {
    const brand = getBrand(product);
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
    return counts;
  }, new Map());

  const brands = [...brandCounts.entries()].sort((a, b) => b[1] - a[1]);

  // A single brand is not a "featured brands" section, it is noise.
  if (brands.length < 2) return null;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Featured brands</h2>
        <p className="text-xs text-ink-muted">Jump straight to a maker</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {brands.map(([brand, count], index) => (
          <motion.div
            key={brand}
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.35, delay: index * 0.04 }}
          >
            <Link
              // `encodeURIComponent` matters: a brand containing a space or an
              // ampersand would otherwise produce a malformed query string.
              to={`/store?brand=${encodeURIComponent(brand)}`}
              className="group flex h-full flex-col items-center justify-center gap-1 rounded-card glass px-3 py-5 text-center transition-all duration-300 hover:glow-accent"
            >
              {/* Set in a wide tracking to read as a wordmark rather than body text. */}
              <span className="text-sm font-bold tracking-wide text-ink transition-colors group-hover:text-accent">
                {brand}
              </span>
              <span className="text-[10px] text-ink-faint">{pluralize(count, "product")}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
