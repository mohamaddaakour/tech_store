import type { AdminUser, Dashboard, ProductInput } from "../types/admin";
import type { Role } from "../types/auth";
import type { Facet, Page, Product } from "../types/product";
import { apiClient, apiGet, apiPost } from "./client";

/**
 * Admin endpoints (SUBJECT.md Phase 6). All require an ADMIN role; the backend enforces it with a
 * single `/api/admin/**` rule, so a CUSTOMER token gets a 403 here regardless of what the UI shows.
 */

/** Every figure the dashboard renders, in one call. */
export function getDashboard(): Promise<Dashboard> {
  return apiGet<Dashboard>("/admin/dashboard");
}

// -------------------------------------------------------------------------- products

/**
 * The admin product table.
 *
 * Note it does NOT pass `inStock`, so sold-out products are included — those are precisely the rows
 * an admin managing inventory needs to see.
 */
export async function getAdminProducts(params: {
  search?: string;
  category?: string;
  brand?: string;
  sort?: string;
  page?: number;
  size?: number;
}): Promise<Page<Product>> {
  const response = await apiClient.get<Page<Product>>("/admin/products", { params });
  return response.data;
}

export function createProduct(input: ProductInput): Promise<Product> {
  return apiPost<Product, ProductInput>("/admin/products", input);
}

export async function updateProduct(id: number, input: ProductInput): Promise<Product> {
  const response = await apiClient.put<Product>(`/admin/products/${id}`, input);
  return response.data;
}

export async function deleteProduct(id: number): Promise<void> {
  await apiClient.delete(`/admin/products/${id}`);
}

// ------------------------------------------------------------- categories and brands

export function createCategory(name: string): Promise<Facet> {
  return apiPost<Facet, { name: string }>("/admin/categories", { name });
}

export async function updateCategory(id: number, name: string): Promise<Facet> {
  const response = await apiClient.put<Facet>(`/admin/categories/${id}`, { name });
  return response.data;
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/admin/categories/${id}`);
}

export function createBrand(name: string): Promise<Facet> {
  return apiPost<Facet, { name: string }>("/admin/brands", { name });
}

export async function updateBrand(id: number, name: string): Promise<Facet> {
  const response = await apiClient.put<Facet>(`/admin/brands/${id}`, { name });
  return response.data;
}

export async function deleteBrand(id: number): Promise<void> {
  await apiClient.delete(`/admin/brands/${id}`);
}

// ----------------------------------------------------------------------------- users

export async function getAdminUsers(page = 0, size = 20): Promise<Page<AdminUser>> {
  const response = await apiClient.get<Page<AdminUser>>("/admin/users", { params: { page, size } });
  return response.data;
}

/**
 * Promotes or demotes an account.
 *
 * The server refuses to let an admin change their own role — otherwise the last admin could lock
 * everyone out of the panel with no way back except raw SQL.
 */
export async function updateUserRole(userId: number, role: Role): Promise<AdminUser> {
  const response = await apiClient.patch<AdminUser>(`/admin/users/${userId}/role`, { role });
  return response.data;
}
