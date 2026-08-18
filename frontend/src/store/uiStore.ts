import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light";

export type Panel = "cart" | "search" | "assistant" | null;

interface UiState {
  theme: Theme;

  lowMotion: boolean;
  openPanel: Panel;

  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleLowMotion: () => void;
  setPanel: (panel: Panel) => void;
  closePanel: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
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

      partialize: (state) => ({ theme: state.theme, lowMotion: state.lowMotion }),
    },
  ),
);
