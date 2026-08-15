import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  /** Product ids the user has saved. */
  ids: number[];
  toggle: (productId: number) => boolean;
  remove: (productId: number) => void;
  clear: () => void;
  has: (productId: number) => boolean;
}

/**
 * Saved products ("My Collection").
 *
 * Stores **ids only**, unlike the cart which snapshots whole products. The
 * difference is intentional: a wishlist is a long-lived list you might return to
 * in a month, and a stale cached price or an image URL that has since changed
 * would be actively misleading. Keeping just the id means the page always
 * renders whatever the API says today.
 *
 * The trade-off is that rendering the collection needs the product list loaded —
 * which is fine, because TanStack Query has it cached anyway.
 *
 * This is client-side because the backend has no wishlist endpoint (SUBJECT
 * Phase 5). The shape maps cleanly onto one later: `ids` becomes the response of
 * `GET /api/wishlist`, and `toggle` a POST/DELETE.
 */
export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],

      /**
       * Adds or removes, and returns the NEW state (`true` = now saved).
       *
       * Returning it lets the caller show the right toast — "Saved" vs
       * "Removed" — without re-reading the store and racing the update.
       */
      toggle: (productId) => {
        const isSaved = get().ids.includes(productId);

        set({
          ids: isSaved
            ? get().ids.filter((id) => id !== productId)
            : // Newest first, so the collection page reads as a recency list.
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
