/**
 * Order types — now mirroring the backend's real `OrderResponse`, not the old localStorage shape.
 */

export type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

/**
 * The forward path through the lifecycle, for drawing the timeline.
 *
 * CANCELLED is absent on purpose: it is an exit from any state, not a step in the sequence, so the
 * timeline renders these four and treats cancellation separately.
 */
export const ORDER_FLOW: readonly OrderStatus[] = ["PENDING", "PAID", "SHIPPED", "DELIVERED"];

export interface OrderItem {
  /** Null when the product has since been deleted from the catalogue. */
  productId: number | null;
  /** Snapshot taken at purchase time — a receipt must show what was actually bought. */
  productName: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface OrderEvent {
  status: OrderStatus;
  /** ISO 8601. */
  at: string;
}

export interface ShippingAddress {
  fullName: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface Order {
  /** The customer-facing reference, e.g. `TS-2026-0007`. Used as the URL key, not the numeric id. */
  reference: string;
  status: OrderStatus;
  /** True when no further transition is possible. Computed by the server's state machine. */
  terminal: boolean;
  /**
   * Which statuses this order may move to next.
   *
   * The server computes this from its state machine, so the admin UI renders exactly the valid
   * options — an invalid transition is never even offered, rather than being offered and rejected.
   */
  allowedNextStatuses: OrderStatus[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  address: ShippingAddress;
  items: OrderItem[];
  history: OrderEvent[];
  /** Only populated on admin responses; null for a customer reading their own order. */
  customerEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The lighter shape used by list views. */
export interface OrderSummary {
  reference: string;
  status: OrderStatus;
  totalCents: number;
  itemCount: number;
  customerEmail: string | null;
  createdAt: string;
}

/** Body of `POST /api/orders`. Note: no prices — the server looks those up. */
export interface CheckoutRequest {
  items: Array<{ productId: number; quantity: number }>;
  address: ShippingAddress;
}
