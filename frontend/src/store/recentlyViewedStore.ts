import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_ENTRIES = 8;

interface RecentlyViewedState {
  ids: number[];
  record: (productId: number) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      ids: [],

      record: (productId) =>
        set({
          ids: [productId, ...get().ids.filter((id) => id !== productId)].slice(0, MAX_ENTRIES),
        }),

      clear: () => set({ ids: [] }),
    }),
    { name: "techstore-recent" },
  ),
);
