import type { OrderStatus } from "../types/order";

/** The badge tones an order status can map to. */
export type StatusTone = "warn" | "info" | "accent" | "success" | "danger";

/**
 * Status to badge tone.
 *
 * A `Record` keyed by the `OrderStatus` union rather than a `switch`: if a sixth status
 * is ever added, TypeScript reports this object as missing a key. A `switch` with a
 * `default` branch would silently render the new status as "neutral".
 */
export const STATUS_TONES: Record<OrderStatus, StatusTone> = {
  PENDING: "warn",
  PAID: "info",
  SHIPPED: "accent",
  DELIVERED: "success",
  CANCELLED: "danger",
};

/**
 * Customer-facing labels.
 *
 * `PENDING` becomes "Awaiting payment", which says what is actually happening rather
 * than exposing an internal enum name. Users should never have to read our database
 * values.
 */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
