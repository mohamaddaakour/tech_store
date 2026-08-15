import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "./cartStore";
import type { Order, OrderStatus, ShippingAddress } from "../types/order";
import { ORDER_FLOW } from "../types/order";

/** Flat-rate delivery in cents, waived above the threshold. */
export const SHIPPING_FLAT_CENTS = 1499;
export const FREE_SHIPPING_THRESHOLD_CENTS = 50_000;

export function calculateShipping(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
}

interface OrderState {
  orders: Order[];
  /** Monotonic counter behind the human-readable order reference. */
  nextSequence: number;

  placeOrder: (lines: CartLine[], address: ShippingAddress) => Order;
  advanceStatus: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  getById: (orderId: string) => Order | undefined;
  clear: () => void;
}

/**
 * Order history.
 *
 * ## Why this is client-side
 *
 * SUBJECT.md Phase 3 asks for checkout, orders, order items and the status
 * lifecycle. The backend has no order endpoints, and this task is explicitly
 * frontend-only — so orders live in `localStorage` for now.
 *
 * That is a deliberate stand-in, not a pretence: the UI states "stored locally"
 * wherever orders are shown, and stock is **not** decremented, because only a
 * database transaction can do that safely (two tabs checking out the last item
 * would both succeed here). Real overselling protection is a server concern.
 *
 * The types and functions match what the API will expose, so replacing this with
 * `useQuery`/`useMutation` later touches this file and nothing else.
 */
export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      nextSequence: 1,

      /**
       * Turns cart lines into an immutable order record.
       *
       * Totals are computed here rather than trusted from the cart, and every
       * item's price is copied in — see `OrderItem` for why an order must snapshot
       * rather than reference.
       */
      placeOrder: (lines, address) => {
        const sequence = get().nextSequence;

        const items = lines.map((line) => ({
          productId: line.product.id,
          name: line.product.name,
          imageUrl: line.product.imageUrl,
          unitPriceCents: line.product.priceCents,
          quantity: line.quantity,
        }));

        const subtotalCents = items.reduce(
          (total, item) => total + item.unitPriceCents * item.quantity,
          0,
        );
        const shippingCents = calculateShipping(subtotalCents);
        const now = new Date().toISOString();

        const order: Order = {
          // Padded so references sort correctly as text and look deliberate.
          id: `TS-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`,
          createdAt: now,
          status: "PENDING",
          items,
          subtotalCents,
          shippingCents,
          totalCents: subtotalCents + shippingCents,
          address,
          history: [{ status: "PENDING", at: now }],
        };

        set({
          // Newest first, which is the order the list page wants.
          orders: [order, ...get().orders],
          nextSequence: sequence + 1,
        });

        return order;
      },

      /**
       * Steps an order one stage forward: PENDING -> PAID -> SHIPPED -> DELIVERED.
       *
       * Exists so the status timeline can actually be demonstrated without a
       * backend. In production this transition is driven by a Stripe webhook
       * (Phase 4) and an admin action (Phase 6), never by the customer.
       */
      advanceStatus: (orderId) =>
        set({
          orders: get().orders.map((order) => {
            if (order.id !== orderId) return order;

            const currentIndex = ORDER_FLOW.indexOf(order.status);

            // Already delivered, or cancelled (indexOf returns -1): nothing to do.
            if (currentIndex === -1 || currentIndex === ORDER_FLOW.length - 1) return order;

            const nextStatus = ORDER_FLOW[currentIndex + 1] as OrderStatus;

            return {
              ...order,
              status: nextStatus,
              history: [...order.history, { status: nextStatus, at: new Date().toISOString() }],
            };
          }),
        }),

      cancelOrder: (orderId) =>
        set({
          orders: get().orders.map((order) => {
            // Refuse to cancel something already delivered — that would be a
            // return, which is a different process with different rules.
            if (order.id !== orderId || order.status === "DELIVERED") return order;

            return {
              ...order,
              status: "CANCELLED",
              history: [...order.history, { status: "CANCELLED", at: new Date().toISOString() }],
            };
          }),
        }),

      getById: (orderId) => get().orders.find((order) => order.id === orderId),

      clear: () => set({ orders: [], nextSequence: 1 }),
    }),
    { name: "techstore-orders" },
  ),
);
