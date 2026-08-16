import { create } from "zustand";

export type ToastTone = "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone: ToastTone) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
const TOAST_DURATION_MS = 2600;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (message, tone) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
    }, TOAST_DURATION_MS);
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().push(message, "success"),
  error: (message: string) => useToastStore.getState().push(message, "error"),
};
