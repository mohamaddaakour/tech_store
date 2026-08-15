import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light";

/** The overlay panels. Only one can be open at a time — see `openPanel`. */
export type Panel = "cart" | "search" | "assistant" | null;

interface UiState {
  theme: Theme;
  /** In-app "calm down the animations" switch, separate from the OS setting. */
  lowMotion: boolean;
  openPanel: Panel;

  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleLowMotion: () => void;
  setPanel: (panel: Panel) => void;
  closePanel: () => void;
}

/**
 * Global interface state: theme, motion preference, and which overlay is open.
 *
 * Why a store rather than `useState` in the layout: the cart is opened from the
 * top bar, the *nav rail*, the product page's add-to-cart toast, and the
 * keyboard shortcut handler. Threading a setter through all of those as props
 * would be miserable. Anything reachable from several unrelated places belongs
 * in a store.
 *
 * `openPanel` is deliberately a single value rather than three booleans. That
 * makes "only one panel at a time" a property of the data model instead of a
 * rule every call site has to remember — you cannot represent the cart and the
 * search overlay both being open, so it cannot happen.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      // Dark by default: this is a console dashboard, and the spec calls for a
      // full-screen dark interface. Light is an explicit opt-in.
      theme: "dark",
      lowMotion: false,
      openPanel: null,

      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setTheme: (theme) => set({ theme }),
      toggleLowMotion: () => set({ lowMotion: !get().lowMotion }),

      setPanel: (panel) => set({ openPanel: panel }),
      closePanel: () => set({ openPanel: null }),
    }),
    {
      name: "techstore-ui",

      /**
       * Persist only the real preferences.
       *
       * Without `partialize`, `openPanel` would be saved too — so a user who
       * closed the tab with the cart open would return to a page with a modal
       * already covering it, which reads as a bug.
       */
      partialize: (state) => ({ theme: state.theme, lowMotion: state.lowMotion }),
    },
  ),
);
