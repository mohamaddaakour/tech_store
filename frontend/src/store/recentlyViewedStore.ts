import { create } from "zustand";
import { persist } from "zustand/middleware";

/** How many to remember. Enough to fill one horizontal row, no more. */
const MAX_ENTRIES = 8;

interface RecentlyViewedState {
  ids: number[];
  record: (productId: number) => void;
  clear: () => void;
}

/**
 * Recently viewed products — the dashboard's "Jump back in" row.
 *
 * Ids only, newest first, capped at {@link MAX_ENTRIES}. The cap matters: without
 * it this array grows forever in `localStorage`, and every visit to a product
 * page makes the write a little slower.
 */
export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      ids: [],

      /**
       * Moves a product to the front of the list.
       *
       * Note it filters the id out *before* prepending. Revisiting a product you
       * already viewed should promote it to the front, not add a duplicate — and
       * without the filter the row would fill up with the same tile repeated.
       */
      record: (productId) =>
        set({
          ids: [productId, ...get().ids.filter((id) => id !== productId)].slice(0, MAX_ENTRIES),
        }),

      clear: () => set({ ids: [] }),
    }),
    { name: "techstore-recent" },
  ),
);
