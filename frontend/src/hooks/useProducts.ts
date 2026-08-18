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

export const productKeys = {
  all: ["products"] as const,
  list: ["products", "list"] as const,
  search: (query: ProductQuery) => ["products", "search", query] as const,
  detail: (id: number) => ["products", id] as const,
  meta: ["products", "meta"] as const,
  categories: ["categories"] as const,
  brands: ["brands"] as const,
};

export function useProductSearch(query: ProductQuery) {
  return useQuery<Page<Product>>({
    queryKey: productKeys.search(query),
    queryFn: () => searchProducts(query),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

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

    enabled: typeof id === "number" && Number.isFinite(id),
    staleTime: 60_000,
  });
}

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
