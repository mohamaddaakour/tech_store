import type { Product } from "../types/product";
import { apiGet } from "./client";

/** Every product in the catalog. Public — no token required. */
export function getAllProducts(): Promise<Product[]> {
  return apiGet<Product[]>("/products");
}

/** One product by id. Rejects with a 404 if it does not exist. */
export function getProductById(id: number): Promise<Product> {
  return apiGet<Product>(`/products/${id}`);
}
