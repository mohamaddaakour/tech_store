export type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export const ORDER_FLOW: readonly OrderStatus[] = ["PENDING", "PAID", "SHIPPED", "DELIVERED"];

export interface OrderItem {
  productId: number | null;

  productName: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface OrderEvent {
  status: OrderStatus;

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
  reference: string;
  status: OrderStatus;

  terminal: boolean;

  allowedNextStatuses: OrderStatus[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  address: ShippingAddress;
  items: OrderItem[];
  history: OrderEvent[];

  customerEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSummary {
  reference: string;
  status: OrderStatus;
  totalCents: number;
  itemCount: number;
  customerEmail: string | null;
  createdAt: string;
}

export interface CheckoutRequest {
  items: Array<{ productId: number; quantity: number }>;
  address: ShippingAddress;
}
