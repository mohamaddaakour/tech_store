import type { Facet, Page, Product, ProductQuery } from "../types/product";
import { apiClient, apiGet } from "./client";

export async function searchProducts(query: ProductQuery): Promise<Page<Product>> {
  const response = await apiClient.get<Page<Product>>("/products", {
    params: query,

    paramsSerializer: {
      indexes: null,
    },
  });

  return response.data;
}

export async function getAllProducts(): Promise<Product[]> {
  const page = await searchProducts({ size: 60, sort: "newest" });
  return page.content;
}

export function getProductById(id: number): Promise<Product> {
  return apiGet<Product>(`/products/${id}`);
}

export function getProductMeta(): Promise<{ maxPriceCents: number }> {
  return apiGet<{ maxPriceCents: number }>("/products/meta");
}

export function getCategories(): Promise<Facet[]> {
  return apiGet<Facet[]>("/categories");
}

export function getBrands(): Promise<Facet[]> {
  return apiGet<Facet[]>("/brands");
}
