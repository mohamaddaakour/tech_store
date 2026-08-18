import { useMemo } from "react";
import { getErrorMessage } from "../api/client";
import { useAllProducts } from "../hooks/useProducts";
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

export default function HomePage() {
  const { data: products, isPending, error, refetch, isFetching } = useAllProducts();
  const user = useAuthStore((state) => state.user);
  const recentIds = useRecentlyViewedStore((state) => state.ids);

  const featured = useMemo(() => {
    if (!products?.length) return undefined;
    return [...products].sort((a, b) => b.priceCents - a.priceCents)[0];
  }, [products]);

  const trending = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => p.inStock).sort((a, b) => a.stock - b.stock);
  }, [products]);

  const affordable = useMemo(() => {
    if (!products) return [];
    return [...products].sort((a, b) => a.priceCents - b.priceCents);
  }, [products]);

  const recentlyViewed = useMemo(() => {
    if (!products) return [];
    return recentIds.flatMap((id) => {
      const match = products.find((product) => product.id === id);
      return match ? [match] : [];
    });
  }, [products, recentIds]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading dashboard">
        <Skeleton className="h-88 w-full rounded-panel" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-tile" />
          ))}
        </div>
        <ProductGridSkeleton count={4} />
      </div>
    );
  }

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

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="The catalogue is empty"
        message="Seed the database and reload to populate the dashboard."
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
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

      <BrandStrip />
    </div>
  );
}
