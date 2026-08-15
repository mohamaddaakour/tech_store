import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminOrder,
  getAdminOrders,
  getMyOrder,
  getMyOrders,
  placeOrder,
  updateOrderStatus,
} from "../api/orders";
import { productKeys } from "./useProducts";
import type { OrderStatus } from "../types/order";

export const orderKeys = {
  all: ["orders"] as const,
  mine: (page: number) => ["orders", "mine", page] as const,
  detail: (reference: string) => ["orders", reference] as const,
  admin: (status: string, page: number) => ["orders", "admin", status, page] as const,
  adminDetail: (reference: string) => ["orders", "admin", reference] as const,
};

/**
 * The caller's own order history.
 *
 * `options.enabled` lets a caller skip the request when there is no signed-in user. Without that
 * escape hatch, the dashboard would fire an unauthenticated request on every visit by a guest — a
 * guaranteed 401 that also triggers a pointless token-refresh attempt.
 */
export function useMyOrders(page = 0, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orderKeys.mine(page),
    queryFn: () => getMyOrders(page),
    enabled: options?.enabled ?? true,
  });
}

export function useMyOrder(reference: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(reference ?? ""),
    queryFn: () => getMyOrder(reference as string),
    enabled: Boolean(reference),
  });
}

/**
 * Checkout.
 *
 * The invalidations afterwards are the important part. A successful order changes three things the
 * cache already holds: the user's order list, product stock levels, and the admin dashboard's
 * figures. Marking them stale means those views refetch instead of showing pre-purchase numbers —
 * without this, the product page would still claim the old stock count.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: placeOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      // Prefix match: invalidates every product query — list, search and detail alike.
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

// ---------------------------------------------------------------------------- admin

export function useAdminOrders(status: OrderStatus | "", page = 0) {
  return useQuery({
    queryKey: orderKeys.admin(status, page),
    queryFn: () => getAdminOrders(status, page),
    placeholderData: (previous) => previous,
  });
}

export function useAdminOrder(reference: string | undefined) {
  return useQuery({
    queryKey: orderKeys.adminDetail(reference ?? ""),
    queryFn: () => getAdminOrder(reference as string),
    enabled: Boolean(reference),
  });
}

/** Advances an order's status, then refreshes anything whose numbers just changed. */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reference, status }: { reference: string; status: OrderStatus }) =>
      updateOrderStatus(reference, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      // A status change moves an order in or out of the revenue statuses, so every dashboard figure
      // is potentially stale.
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}
