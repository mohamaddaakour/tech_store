import { useQuery } from "@tanstack/react-query";
import {
  getAllProducts,
  getBrands,
  getCategories,
  getProductById,
  getProductMeta,
  searchProducts,
} from "../api/products";
import type { Facet, Page, Product, ProductQuery } from "../types/product";

/**
 * Query keys in one place.
 *
 * TanStack Query identifies cached data by these, so a typo means "different data" and cache
 * invalidation silently does nothing. Note `search` includes the whole query object: each distinct
 * filter combination is cached separately, which is what makes paging back and forth instant.
 */
export const productKeys = {
  all: ["products"] as const,
  list: ["products", "list"] as const,
  search: (query: ProductQuery) => ["products", "search", query] as const,
  detail: (id: number) => ["products", id] as const,
  meta: ["products", "meta"] as const,
  categories: ["categories"] as const,
  brands: ["brands"] as const,
};

/**
 * Server-side search for the Store page.
 *
 * `placeholderData` keeps the previous page's results on screen while the next page loads, instead
 * of flashing an empty grid. Combined with the query key including the filters, paging feels instant
 * once a page has been seen.
 */
export function useProductSearch(query: ProductQuery) {
  return useQuery<Page<Product>>({
    queryKey: productKeys.search(query),
    queryFn: () => searchProducts(query),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

/**
 * The whole catalogue, for views that need every product — dashboard rows, search overlay, saved
 * collection, related products.
 *
 * Capped at 60 by the API (see `getAllProducts`). Kept as a distinct hook from `useProductSearch` so
 * it has its own cache entry and does not thrash when Store filters change.
 */
export function useAllProducts() {
  return useQuery<Product[]>({
    queryKey: productKeys.list,
    queryFn: getAllProducts,
    staleTime: 60_000,
  });
}

export function useProduct(id: number | undefined) {
  return useQuery<Product>({
    queryKey: productKeys.detail(id ?? -1),
    queryFn: () => getProductById(id as number),
    // Never fire the request for an unparseable URL param.
    enabled: typeof id === "number" && Number.isFinite(id),
    staleTime: 60_000,
  });
}

/**
 * Filter facets and the price ceiling.
 *
 * Long `staleTime` on purpose: categories and brands change when an admin edits them, which is rare.
 * Refetching them alongside every product query would be pure waste.
 */
export function useCategories() {
  return useQuery<Facet[]>({
    queryKey: productKeys.categories,
    queryFn: getCategories,
    staleTime: 5 * 60_000,
  });
}

export function useBrands() {
  return useQuery<Facet[]>({
    queryKey: productKeys.brands,
    queryFn: getBrands,
    staleTime: 5 * 60_000,
  });
}

export function useProductMeta() {
  return useQuery({
    queryKey: productKeys.meta,
    queryFn: getProductMeta,
    staleTime: 5 * 60_000,
  });
}
