import type { Facet, Page, Product, ProductQuery } from "../types/product";
import { apiClient, apiGet } from "./client";

/**
 * Catalogue reads. All public — no token required.
 */

/**
 * Search, filter, sort and paginate the catalogue.
 *
 * Filtering now happens in SQL rather than in the browser. Passing the query object to axios as
 * `params` means axios builds and URL-encodes the query string, so a brand containing a space or an
 * ampersand cannot produce a malformed URL.
 */
export async function searchProducts(query: ProductQuery): Promise<Page<Product>> {
  const response = await apiClient.get<Page<Product>>("/products", {
    params: query,
    /**
     * Strip empty values so the request is `?page=0` rather than
     * `?search=&category=&brand=&maxPrice=`. The backend treats blank as absent anyway, but a clean
     * URL is far easier to debug in the network tab.
     */
    paramsSerializer: {
      indexes: null,
    },
  });

  return response.data;
}

/**
 * The whole catalogue in one call, for views that genuinely need every product: the dashboard's
 * horizontal rows, the search overlay, the saved collection, and related products.
 *
 * `size` is capped at the backend's maximum of 60. Once the catalogue outgrows that, these callers
 * need real pagination or dedicated endpoints — this is the one place that assumption lives, which
 * is why it is stated here rather than spread across five components.
 */
export async function getAllProducts(): Promise<Product[]> {
  const page = await searchProducts({ size: 60, sort: "newest" });
  return page.content;
}

export function getProductById(id: number): Promise<Product> {
  return apiGet<Product>(`/products/${id}`);
}

/** Facts the filter UI needs before it can render — currently the price-slider ceiling. */
export function getProductMeta(): Promise<{ maxPriceCents: number }> {
  return apiGet<{ maxPriceCents: number }>("/products/meta");
}

export function getCategories(): Promise<Facet[]> {
  return apiGet<Facet[]>("/categories");
}

export function getBrands(): Promise<Facet[]> {
  return apiGet<Facet[]>("/brands");
}
