import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { useBrands } from "../../hooks/useProducts";
import { pluralize } from "../../lib/format";

/**
 * "Featured brands" — one tile per brand, linking into a pre-filtered store view.
 *
 * Brands now come from `GET /api/brands` with real product counts, rather than being reduced out of
 * the product list client-side. That means the strip shows every brand the store carries, including
 * ones that happen to be out of stock — which the old derived version could never do, since it only
 * knew about brands attached to products it had already downloaded.
 *
 * Each tile deep-links to `/store?brand=<slug>`, so filter state stays in the URL and is shareable.
 */
export function BrandStrip() {
  const { data: brands } = useBrands();
  const reduceMotion = useReducedMotion();

  // Busiest brands first, and skip brands with nothing to sell.
  const stocked = (brands ?? [])
    .filter((brand) => brand.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount);

  // One brand is not a "featured brands" section, it is noise.
  if (stocked.length < 2) return null;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Featured brands</h2>
        <p className="text-xs text-ink-muted">Jump straight to a maker</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stocked.map((brand, index) => (
          <motion.div
            key={brand.slug}
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.35, delay: index * 0.04 }}
          >
            <Link
              // The slug is already URL-safe (generated server-side by Slugs.from), so no
              // encoding gymnastics are needed here.
              to={`/store?brand=${brand.slug}`}
              className="group flex h-full flex-col items-center justify-center gap-1 rounded-card glass px-3 py-5 text-center transition-all duration-300 hover:glow-accent"
            >
              {/* Wide tracking so it reads as a wordmark rather than body text. */}
              <span className="text-sm font-bold tracking-wide text-ink transition-colors group-hover:text-accent">
                {brand.name}
              </span>
              <span className="text-[10px] text-ink-faint">
                {pluralize(brand.productCount, "product")}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
