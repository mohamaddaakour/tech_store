import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBrand,
  createCategory,
  createProduct,
  deleteBrand,
  deleteCategory,
  deleteProduct,
  getAdminProducts,
  getAdminUsers,
  getDashboard,
  updateBrand,
  updateCategory,
  updateProduct,
  updateUserRole,
} from "../api/admin";
import { productKeys } from "./useProducts";
import type { ProductInput } from "../types/admin";
import type { Role } from "../types/auth";

export const adminKeys = {
  all: ["admin"] as const,
  dashboard: ["admin", "dashboard"] as const,
  products: (params: object) => ["admin", "products", params] as const,
  users: (page: number) => ["admin", "users", page] as const,
};

/**
 * The dashboard aggregate.
 *
 * A short `staleTime` — revenue and order counts genuinely move, and an operator watching this
 * screen expects it to be current. Contrast with categories, cached for five minutes.
 */
export function useDashboard() {
  return useQuery({
    queryKey: adminKeys.dashboard,
    queryFn: getDashboard,
    staleTime: 15_000,
  });
}

export function useAdminProducts(params: {
  search?: string;
  category?: string;
  brand?: string;
  sort?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: adminKeys.products(params),
    queryFn: () => getAdminProducts(params),
    placeholderData: (previous) => previous,
  });
}

export function useAdminUsers(page = 0) {
  return useQuery({
    queryKey: adminKeys.users(page),
    queryFn: () => getAdminUsers(page),
    placeholderData: (previous) => previous,
  });
}

/**
 * Invalidates everything a catalogue write can affect.
 *
 * Extracted because all seven mutations below need the same refresh: the admin tables, the
 * storefront's product queries (a renamed product must not stay stale on the store page), and the
 * dashboard (product counts, inventory value, low-stock list).
 *
 * Getting this wrong is the classic TanStack Query bug — the mutation succeeds, the server is
 * correct, and the UI keeps showing old data until a manual reload.
 */
function useCatalogInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.all });
    queryClient.invalidateQueries({ queryKey: productKeys.all });
    queryClient.invalidateQueries({ queryKey: productKeys.categories });
    queryClient.invalidateQueries({ queryKey: productKeys.brands });
  };
}

// -------------------------------------------------------------------------- products

export function useCreateProduct() {
  const invalidate = useCatalogInvalidation();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const invalidate = useCatalogInvalidation();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ProductInput }) => updateProduct(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useCatalogInvalidation();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: invalidate,
  });
}

// ------------------------------------------------------------- categories and brands

export function useCreateCategory() {
  const invalidate = useCatalogInvalidation();
  return useMutation({ mutationFn: createCategory, onSuccess: invalidate });
}

export function useUpdateCategory() {
  const invalidate = useCatalogInvalidation();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateCategory(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useCatalogInvalidation();
  return useMutation({ mutationFn: deleteCategory, onSuccess: invalidate });
}

export function useCreateBrand() {
  const invalidate = useCatalogInvalidation();
  return useMutation({ mutationFn: createBrand, onSuccess: invalidate });
}

export function useUpdateBrand() {
  const invalidate = useCatalogInvalidation();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateBrand(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteBrand() {
  const invalidate = useCatalogInvalidation();
  return useMutation({ mutationFn: deleteBrand, onSuccess: invalidate });
}

// ----------------------------------------------------------------------------- users

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: Role }) => updateUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}
