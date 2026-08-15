import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "../types/product";

export interface CartLine {
    product: Product;
    quantity: number;
}

// cart state shape
interface CartState {
    lines: CartLine[];
    add: (product: Product) => void;
    remove: (productId: number) => void;
    totalCents: () => number;
    totalItems: () => number;
}

// `create` builds a store (a hook you can call from any component).
export const useCartStore = create<CartState>()(
    // `persist` is a middleware that wraps your store so its state automatically
    // saves to (and loads from) localStorage.
    persist(

        // `set` — updates state (like setState)
        // `get` — reads the current state at call time (needed because closures would otherwise capture stale state)
        (set, get) => ({
            lines: [],

            // Implement the add function
            add: (product) =>
                set((state) => {
                    const existing = state.lines.find((l) => l.product.id === product.id);

                    // If this product is already in the cart we just add one to the quantity
                    if (existing) {
                        return {
                            lines: state.lines.map((l) =>
                                l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
                            ),
                        };
                    }

                    // If the product is first time added to the cart the quantity will be 1
                    return { lines: [...state.lines, { product, quantity: 1 }] };
                }),

            remove: (productId) =>
                set((state) => ({ lines: state.lines.filter((l) => l.product.id !== productId) })),

            totalCents: () => get().lines.reduce((sum, l) => sum + l.product.priceCents * l.quantity, 0),

            totalItems: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
        }),

        // The key in the local storage
        { name: "techstore-cart" }
    )
);
