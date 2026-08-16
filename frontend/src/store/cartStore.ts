import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "../types/product";

export interface CartLine {
  product: Product;
  quantity: number;
}

interface CartState {
  lines: CartLine[];

  add: (product: Product) => void;

  remove: (productId: number) => void;

  increment: (productId: number) => void;

  decrement: (productId: number) => void;

  clear: () => void;

  totalCents: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      add: (product) =>
        set((state) => {
          const existing = state.lines.find((line) => line.product.id === product.id);

          if (existing) {
            return {
              lines: state.lines.map((line) =>
                line.product.id === product.id
                  ? { ...line, quantity: line.quantity + 1 }
                  : line,
              ),
            };
          }

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

                  quantity: Math.min(line.quantity + 1, line.product.stock),
                }
              : line,
          ),
        })),

      decrement: (productId) =>
        set((state) => ({
          lines: state.lines
            .map((line) =>
              line.product.id === productId
                ? { ...line, quantity: line.quantity - 1 }
                : line,
            )
            .filter((line) => line.quantity > 0),
        })),

      clear: () => set({ lines: [] }),

      totalCents: () =>
        get().lines.reduce(
          (total, line) => total + line.product.priceCents * line.quantity,
          0,
        ),

      totalItems: () => get().lines.reduce((total, line) => total + line.quantity, 0),
    }),

    { name: "techstore-cart" },
  ),
);
