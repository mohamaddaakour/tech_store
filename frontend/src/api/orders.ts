import type { CheckoutRequest, Order, OrderStatus, OrderSummary } from "../types/order";
import type { Page } from "../types/product";
import { apiClient, apiGet, apiPost } from "./client";

/**
 * Order endpoints.
 *
 * All of these require a valid access token — an order needs an owner. The axios interceptor
 * attaches it and transparently refreshes on a 401, so nothing here deals with tokens.
 */

/**
 * Checkout.
 *
 * Sends only product ids and quantities. Prices are looked up server-side inside the stock-safe
 * transaction; a client-supplied price would let anyone buy a laptop for a cent.
 */
export function placeOrder(request: CheckoutRequest): Promise<Order> {
  return apiPost<Order, CheckoutRequest>("/orders", request);
}

/** The caller's own order history, newest first. */
export async function getMyOrders(page = 0, size = 10): Promise<Page<OrderSummary>> {
  const response = await apiClient.get<Page<OrderSummary>>("/orders", { params: { page, size } });
  return response.data;
}

/** One of the caller's own orders. Another customer's reference returns 404, not their data. */
export function getMyOrder(reference: string): Promise<Order> {
  return apiGet<Order>(`/orders/${reference}`);
}

// ---------------------------------------------------------------------------- admin

/** All orders, optionally filtered by status (ADMIN only). */
export async function getAdminOrders(
  status: OrderStatus | "",
  page = 0,
  size = 20,
): Promise<Page<OrderSummary>> {
  const response = await apiClient.get<Page<OrderSummary>>("/admin/orders", {
    // Omit `status` entirely when empty — sending `?status=` would fail the backend's enum binding.
    params: { ...(status ? { status } : {}), page, size },
  });

  return response.data;
}

export function getAdminOrder(reference: string): Promise<Order> {
  return apiGet<Order>(`/admin/orders/${reference}`);
}

/**
 * Moves an order to a new status.
 *
 * PATCH, because this modifies one field rather than replacing the order. The server validates the
 * transition against its state machine, so an invalid one returns 400 rather than corrupting state.
 */
export async function updateOrderStatus(reference: string, status: OrderStatus): Promise<Order> {
  const response = await apiClient.patch<Order>(`/admin/orders/${reference}/status`, { status });
  return response.data;
}
