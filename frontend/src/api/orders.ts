import type { CheckoutRequest, Order, OrderStatus, OrderSummary } from "../types/order";
import type { Page } from "../types/product";
import { apiClient, apiGet, apiPost } from "./client";

export function placeOrder(request: CheckoutRequest): Promise<Order> {
  return apiPost<Order, CheckoutRequest>("/orders", request);
}

export async function getMyOrders(page = 0, size = 10): Promise<Page<OrderSummary>> {
  const response = await apiClient.get<Page<OrderSummary>>("/orders", { params: { page, size } });
  return response.data;
}

export function getMyOrder(reference: string): Promise<Order> {
  return apiGet<Order>(`/orders/${reference}`);
}

export async function getAdminOrders(
  status: OrderStatus | "",
  page = 0,
  size = 20,
): Promise<Page<OrderSummary>> {
  const response = await apiClient.get<Page<OrderSummary>>("/admin/orders", {
    params: { ...(status ? { status } : {}), page, size },
  });

  return response.data;
}

export function getAdminOrder(reference: string): Promise<Order> {
  return apiGet<Order>(`/admin/orders/${reference}`);
}

export async function updateOrderStatus(reference: string, status: OrderStatus): Promise<Order> {
  const response = await apiClient.patch<Order>(`/admin/orders/${reference}/status`, { status });
  return response.data;
}
