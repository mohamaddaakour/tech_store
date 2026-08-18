import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  ids: number[];
  toggle: (productId: number) => boolean;
  remove: (productId: number) => void;
  clear: () => void;
  has: (productId: number) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],

      toggle: (productId) => {
        const isSaved = get().ids.includes(productId);

        set({
          ids: isSaved
            ? get().ids.filter((id) => id !== productId)
            :
              [productId, ...get().ids],
        });

        return !isSaved;
      },

      remove: (productId) => set({ ids: get().ids.filter((id) => id !== productId) }),
      clear: () => set({ ids: [] }),

      has: (productId) => get().ids.includes(productId),
    }),
    { name: "techstore-wishlist" },
  ),
);
