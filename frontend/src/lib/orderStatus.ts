import type { OrderStatus } from "../types/order";

export type StatusTone = "warn" | "info" | "accent" | "success" | "danger";

export const STATUS_TONES: Record<OrderStatus, StatusTone> = {
  PENDING: "warn",
  PAID: "info",
  SHIPPED: "accent",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
