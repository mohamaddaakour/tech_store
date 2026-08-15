import type { Product } from "../../types/product";
import { ProductTile } from "./ProductTile";

interface ProductGridProps {
  products: Product[];
}

/**
 * A responsive grid of product tiles.
 *
 * Purely presentational — it takes products and renders them. It deliberately does
 * *not* fetch: the Store page owns filtering and sorting, and a component that both
 * fetched and displayed could not be reused for filtered results, search results, or
 * a wishlist.
 *
 * Column counts match `ProductGridSkeleton` exactly, which is what makes the
 * loading-to-loaded transition seamless. Change one, change the other.
 */
export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <ProductTile
          // Keyed by database id, never by array index. React matches elements
          // between renders by key, so an index key makes it reuse the wrong DOM
          // node when the list is filtered or re-sorted — which shows up as an
          // animation playing on the wrong tile. This grid is filtered constantly.
          key={product.id}
          product={product}
          // The index IS correct for the stagger delay: that is about visual
          // position, not identity.
          index={index}
        />
      ))}
    </div>
  );
}
