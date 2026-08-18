import { create } from "zustand";
import type { User } from "../types/auth";

interface AuthState {
  accessToken: string | null;

  user: User | null;

  isRestoring: boolean;

  setSession: (accessToken: string, user: User) => void;
  clearSession: () => void;
  finishRestoring: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isRestoring: true,

  setSession: (accessToken, user) => set({ accessToken, user, isRestoring: false }),

  clearSession: () => set({ accessToken: null, user: null, isRestoring: false }),

  finishRestoring: () => set({ isRestoring: false }),
}));

export const selectIsAuthenticated = (state: AuthState) => state.user !== null;
export const selectIsAdmin = (state: AuthState) => state.user?.role === "ADMIN";
