import { Link } from "react-router-dom";
import { useBrands } from "../../hooks/useProducts";
import { pluralize } from "../../lib/format";

export function BrandStrip() {
  const { data: brands } = useBrands();

  const stocked = (brands ?? [])
    .filter((brand) => brand.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount);

  if (stocked.length < 2) return null;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Featured brands</h2>
        <p className="text-xs text-ink-muted">Jump straight to a maker</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stocked.map((brand, index) => (
          <div key={brand.slug} style={{ animationDelay: `${index * 40}ms` }} className="animate-fade-in">
            <Link

              to={`/store?brand=${brand.slug}`}
              className="group flex h-full flex-col items-center justify-center gap-1 rounded-card glass px-3 py-5 text-center transition-all duration-300 hover:glow-accent"
            >
              <span className="text-sm font-bold tracking-wide text-ink transition-colors group-hover:text-accent">
                {brand.name}
              </span>
              <span className="text-[10px] text-ink-faint">
                {pluralize(brand.productCount, "product")}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
