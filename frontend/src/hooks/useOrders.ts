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

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: placeOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });

      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

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

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reference, status }: { reference: string; status: OrderStatus }) =>
      updateOrderStatus(reference, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });

      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}
