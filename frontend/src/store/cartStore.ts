import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "../types/product";

/** One row in the cart: which product, and how many. */
export interface CartLine {
  /**
   * A snapshot of the product as it was when added.
   *
   * Storing the whole object (rather than just an id) keeps the drawer able to
   * render names and prices with no extra fetch — which is what lets the cart work
   * instantly, and offline. The trade-off is that a price change on the server will
   * not be reflected in an old cart. That is acceptable here precisely because
   * Phase 4's checkout re-reads every price from the database server-side, so the
   * cart is a convenience, never the source of truth for what you are charged.
   */
  product: Product;
  quantity: number;
}

interface CartState {
  lines: CartLine[];

  /** Adds one of `product`, or increments it if already present. */
  add: (product: Product) => void;
  /** Removes the line entirely, whatever its quantity. */
  remove: (productId: number) => void;
  /** +1. Refuses to exceed the stock we know about. */
  increment: (productId: number) => void;
  /** -1, removing the line if that would take it to zero. */
  decrement: (productId: number) => void;
  /** Empties the cart. Used on logout. */
  clear: () => void;

  totalCents: () => number;
  totalItems: () => number;
}

/**
 * The shopping cart, persisted to `localStorage`.
 *
 * `persist` is middleware that wraps the store and mirrors its state to storage on
 * every change, reloading it on startup. That is the whole of "survives a refresh"
 * — no `useEffect` reading and writing by hand.
 *
 * Unlike `authStore`, persisting *is* the right call here: a cart is harmless,
 * non-sensitive data, and losing it on reload is a genuinely annoying bug. A
 * credential is the opposite on both counts.
 *
 * `set` replaces state (shallow-merged at the top level); `get` reads the current
 * state at call time — which the totals need, since a value captured in a closure
 * would go stale.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      add: (product) =>
        set((state) => {
          const existing = state.lines.find((line) => line.product.id === product.id);

          // Already in the cart: bump the quantity instead of adding a second row,
          // which is what the user means by clicking "Add to cart" twice.
          if (existing) {
            return {
              lines: state.lines.map((line) =>
                line.product.id === product.id
                  ? { ...line, quantity: line.quantity + 1 }
                  : line,
              ),
            };
          }

          // First time: append a new line with quantity 1.
          //
          // Note every update here builds a NEW array and NEW objects rather than
          // mutating (no `push`, no `line.quantity++`). React and Zustand detect
          // change by comparing references, so mutating in place updates the data
          // but never re-renders the UI -- a bug that looks like "my click did
          // nothing" and is genuinely hard to spot.
          return { lines: [...state.lines, { product, quantity: 1 }] };
        }),

      remove: (productId) =>
        set((state) => ({
          lines: state.lines.filter((line) => line.product.id !== productId),
        })),

      increment: (productId) =>
        set((state) => ({
          lines: state.lines.map((line) =>
            line.product.id === productId
              ? {
                  ...line,
                  // Never offer more than exists. This is a UX guard, not a
                  // security one -- the authoritative stock check happens in the
                  // Phase 4 checkout transaction, because anything in the browser
                  // can be edited by the person using it.
                  quantity: Math.min(line.quantity + 1, line.product.stock),
                }
              : line,
          ),
        })),

      decrement: (productId) =>
        set((state) => ({
          // Dropping to zero removes the row: leaving a "0 x ROG Strix" line in
          // the cart would just be confusing.
          lines: state.lines
            .map((line) =>
              line.product.id === productId
                ? { ...line, quantity: line.quantity - 1 }
                : line,
            )
            .filter((line) => line.quantity > 0),
        })),

      clear: () => set({ lines: [] }),

      /** Order total in cents. Integer arithmetic throughout — see `lib/format`. */
      totalCents: () =>
        get().lines.reduce(
          (total, line) => total + line.product.priceCents * line.quantity,
          0,
        ),

      /**
       * Total units, for the header badge.
       *
       * Deliberately not `lines.length`: two of one item is "2" in the badge, not
       * "1". Using the array length here is the single most common cart bug.
       */
      totalItems: () => get().lines.reduce((total, line) => total + line.quantity, 0),
    }),

    // The localStorage key. Changing this string orphans every existing cart, so
    // treat it as permanent.
    { name: "techstore-cart" },
  ),
);
