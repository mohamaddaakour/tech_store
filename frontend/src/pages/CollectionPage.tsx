import { useMemo } from "react";
import { toast } from "../store/toastStore";
import { useAllProducts } from "../hooks/useProducts";
import { useWishlistStore } from "../store/wishlistStore";
import { useCartStore } from "../store/cartStore";
import { formatPrice, pluralize } from "../lib/format";
import { ProductGrid } from "../components/products/ProductGrid";
import { ProductGridSkeleton } from "../components/products/ProductGridSkeleton";
import { Button, ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

export default function CollectionPage() {
  const { data: products, isPending } = useAllProducts();
  const savedIds = useWishlistStore((state) => state.ids);
  const clearWishlist = useWishlistStore((state) => state.clear);
  const addToCart = useCartStore((state) => state.add);

  const savedProducts = useMemo(() => {
    if (!products) return [];
    return savedIds.flatMap((id) => {
      const match = products.find((product) => product.id === id);
      return match ? [match] : [];
    });
  }, [products, savedIds]);

  const inStockProducts = savedProducts.filter((product) => product.inStock);
  const totalCents = inStockProducts.reduce((total, product) => total + product.priceCents, 0);

  function addAllToCart() {
    inStockProducts.forEach((product) => addToCart(product));
    toast.success(`${pluralize(inStockProducts.length, "item")} added to cart`);
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded bg-surface-2" />
        <ProductGridSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Collection</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {savedProducts.length === 0
              ? "Nothing saved yet"
              : `${pluralize(savedProducts.length, "product")} saved · ${formatPrice(totalCents)} in stock`}
          </p>
        </div>

        {savedProducts.length > 0 && (
          <div className="flex gap-2">
            {inStockProducts.length > 0 && (
              <Button size="sm" onClick={addAllToCart}>
                Add all to cart
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearWishlist}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {savedProducts.length === 0 ? (
        <EmptyState
          icon="❤️"
          title="Your collection is empty"
          message="Tap the heart on any product to save it here for later."
          action={
            <ButtonLink to="/store" variant="secondary" size="sm">
              Browse the store
            </ButtonLink>
          }
        />
      ) : (
        <ProductGrid products={savedProducts} />
      )}
    </div>
  );
}
