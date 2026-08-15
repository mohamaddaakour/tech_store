/**
 * Order types — SUBJECT.md Phase 3.
 *
 * These deliberately mirror the shape a Spring Boot `OrderResponse` would have,
 * so when the backend endpoints land the swap is "replace the store with a
 * `useQuery`" rather than a rewrite of every component.
 */

/**
 * The order lifecycle from SUBJECT.md Phase 3.
 *
 * A union of literals, not `string`, so a typo like `"Paid"` is a compile error
 * rather than a status badge that silently never matches.
 */
export type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

/**
 * The forward path through the lifecycle.
 *
 * CANCELLED is absent on purpose: it is an exit from any state, not a step in
 * the sequence, so the timeline renders these four and treats cancellation
 * separately.
 */
export const ORDER_FLOW: readonly OrderStatus[] = ["PENDING", "PAID", "SHIPPED", "DELIVERED"];

/**
 * A line in an order.
 *
 * Unlike the cart, this **snapshots** name, image and unit price. An order is a
 * historical record: if the product is later renamed or repriced, last month's
 * receipt must still show what was actually bought and charged. This is the one
 * place copying product data is not just acceptable but required.
 */
export interface OrderItem {
  productId: number;
  name: string;
  imageUrl: string;
  unitPriceCents: number;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

/** One entry in the animated status timeline. */
export interface OrderEvent {
  status: OrderStatus;
  /** ISO 8601 string, not a `Date` — `Date` objects do not survive JSON round-trips. */
  at: string;
}

export interface Order {
  /** Human-readable reference, e.g. `TS-2026-0007`. Shown to the customer. */
  id: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  address: ShippingAddress;
  /** Append-only audit trail, used to draw the timeline with real timestamps. */
  history: OrderEvent[];
}
