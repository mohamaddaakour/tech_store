import { useMemo } from "react";
import { getErrorMessage } from "../api/client";
import { useProducts } from "../hooks/useProducts";
import { useAuthStore } from "../store/authStore";
import { useRecentlyViewedStore } from "../store/recentlyViewedStore";
import { FeaturedHero } from "../components/products/FeaturedHero";
import { ProductRow } from "../components/products/ProductRow";
import { QuickActions } from "../components/home/QuickActions";
import { BrandStrip } from "../components/home/BrandStrip";
import { ProductGridSkeleton } from "../components/products/ProductGridSkeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";

/**
 * The dashboard — the console home screen.
 *
 * Structured the way SUBJECT.md describes a console dashboard: one large featured
 * tile, a row of smaller quick-action tiles, then horizontal product rows
 * (trending, recently viewed, and the full catalogue) plus featured brands.
 *
 * The rows are derived from a single `/api/products` request rather than one request
 * per row. With no dedicated "trending" or "recommended" endpoints, deriving them
 * client-side from one cached response is both the only option and the faster one.
 * Each `useMemo` documents what the row actually means.
 */
export default function HomePage() {
  const { data: products, isPending, error, refetch, isFetching } = useProducts();
  const user = useAuthStore((state) => state.user);
  const recentIds = useRecentlyViewedStore((state) => state.ids);

  /** The hero: the most expensive item, as a stand-in for "flagship". */
  const featured = useMemo(() => {
    if (!products?.length) return undefined;
    return [...products].sort((a, b) => b.priceCents - a.priceCents)[0];
  }, [products]);

  /**
   * "Trending" — lowest stock first among in-stock items, i.e. what is selling.
   * A real implementation would rank by order volume (Phase 6 analytics); this is an
   * honest proxy from the data we have.
   */
  const trending = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => p.inStock).sort((a, b) => a.stock - b.stock);
  }, [products]);

  /** Best value: cheapest first. */
  const affordable = useMemo(() => {
    if (!products) return [];
    return [...products].sort((a, b) => a.priceCents - b.priceCents);
  }, [products]);

  /**
   * Recently viewed, in the order they were viewed.
   *
   * Mapping over `recentIds` (not over `products`) is what preserves recency order.
   * `flatMap` with an array-or-empty return is a neat way to both look up and filter
   * out ids whose product has since been deleted.
   */
  const recentlyViewed = useMemo(() => {
    if (!products) return [];
    return recentIds.flatMap((id) => {
      const match = products.find((product) => product.id === id);
      return match ? [match] : [];
    });
  }, [products, recentIds]);

  // ---- Loading ----
  if (isPending) {
    return (
      <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading dashboard">
        <Skeleton className="h-[22rem] w-full rounded-panel" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-tile" />
          ))}
        </div>
        <ProductGridSkeleton count={4} />
      </div>
    );
  }

  // ---- Error ----
  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Could not reach the store"
        message={getErrorMessage(error)}
        action={
          <Button variant="secondary" size="sm" loading={isFetching} onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  // ---- Empty ----
  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="The catalogue is empty"
        message="Seed the database and reload to populate the dashboard."
      />
    );
  }

  // ---- Loaded ----
  return (
    <div className="flex flex-col gap-10">
      {/* Greeting. Personalised when signed in, which is a small touch that makes
          the dashboard feel like *your* console rather than a shop window. */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-accent">
          {user ? "Welcome back" : "Welcome to TechStore"}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-ink sm:text-3xl">
          {user ? user.email.split("@")[0] : "Your technology console"}
        </h1>
      </div>

      {featured && <FeaturedHero product={featured} />}

      <QuickActions />

      {/* Rows render nothing when their product list is empty (see ProductRow), so
          "Jump back in" simply does not exist until you have viewed something. */}
      <ProductRow
        title="Jump back in"
        subtitle="Recently viewed"
        products={recentlyViewed}
      />

      <ProductRow
        title="Trending now"
        subtitle="Moving fast — low stock"
        products={trending}
        viewAllTo="/store"
      />

      <ProductRow
        title="Best value"
        subtitle="Most affordable first"
        products={affordable}
        viewAllTo="/store"
      />

      <BrandStrip products={products} />
    </div>
  );
}
