import { useQuery } from "@tanstack/react-query";
import { getAllProducts, getProductById } from "../api/products";
import type { Product } from "../types/product";

/**
 * Query keys in one place.
 *
 * TanStack Query identifies cached data by this key, so a typo (`["product"]` vs
 * `["products"]`) silently means "different data" and cache invalidation appears
 * to do nothing. Defining them here makes that impossible.
 */
export const productKeys = {
  all: ["products"] as const,
  detail: (id: number) => ["products", id] as const,
};

/**
 * The whole catalog.
 *
 * `staleTime` of a minute means remounting a page — which happens on every route
 * change — reuses the cache instead of refetching. Without it, navigating between
 * the dashboard and the store would flash a loading state each time even though
 * the data is already in memory.
 */
export function useProducts() {
  return useQuery<Product[]>({
    queryKey: productKeys.all,
    queryFn: getAllProducts,
    staleTime: 60_000,
  });
}

/**
 * One product, for the detail page.
 *
 * `initialData` is the nice part: if the catalog list is already cached, we show
 * the product instantly from it and let the individual fetch confirm in the
 * background. Navigating from a tile to its product page therefore renders with
 * zero loading state.
 */
export function useProduct(id: number | undefined) {
  return useQuery<Product>({
    queryKey: productKeys.detail(id ?? -1),
    queryFn: () => getProductById(id as number),
    // Never fire the request for an unparseable URL param.
    enabled: typeof id === "number" && Number.isFinite(id),
    staleTime: 60_000,
  });
}
