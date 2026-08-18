import type { AdminUser, Dashboard, ProductInput } from "../types/admin";
import type { Role } from "../types/auth";
import type { Facet, Page, Product } from "../types/product";
import { apiClient, apiGet, apiPost } from "./client";

export function getDashboard(): Promise<Dashboard> {
  return apiGet<Dashboard>("/admin/dashboard");
}

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

export async function getAdminUsers(page = 0, size = 20): Promise<Page<AdminUser>> {
  const response = await apiClient.get<Page<AdminUser>>("/admin/users", { params: { page, size } });
  return response.data;
}

export async function updateUserRole(userId: number, role: Role): Promise<AdminUser> {
  const response = await apiClient.patch<AdminUser>(`/admin/users/${userId}/role`, { role });
  return response.data;
}
