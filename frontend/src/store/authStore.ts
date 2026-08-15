import { create } from "zustand";
import type { User } from "../types/auth";

interface AuthState {
  /**
   * The access token, held **in memory only**.
   *
   * This is the single most important decision in the frontend auth code, so it is
   * worth being explicit about the trade-off.
   *
   * If this were in `localStorage` it would survive reloads with no refresh call —
   * convenient. But `localStorage` is readable by any JavaScript running on the
   * page, so one XSS hole (a bad npm dependency, an unescaped bit of user content)
   * means an attacker reads the token and is you. In a plain variable, the token
   * dies with the tab and never appears in devtools' Application panel.
   *
   * "Reloads log you out" is then solved properly: the refresh token in the
   * HttpOnly cookie — which JavaScript *cannot* read — is exchanged for a new
   * access token on startup. See `useRestoreSession`.
   */
  accessToken: string | null;

  /** The signed-in account, or null. Drives the header and any role-gated UI. */
  user: User | null;

  /**
   * True from first paint until the startup refresh attempt has settled.
   *
   * Without this flag there is a visible flash of the "Sign in" button before the
   * refresh resolves, even for a user who is perfectly well logged in. The header
   * shows a placeholder while this is true instead.
   */
  isRestoring: boolean;

  setSession: (accessToken: string, user: User) => void;
  clearSession: () => void;
  finishRestoring: () => void;
}

/**
 * Auth state.
 *
 * Note there is **no `persist` middleware** here, unlike `cartStore`. That is not an
 * oversight — persisting this store is exactly the mistake described above. The cart
 * is harmless public data; a credential is not.
 *
 * Kept in Zustand rather than React context because the axios interceptor in
 * `api/client.ts` needs the token from outside the component tree, where hooks
 * cannot be called. `useAuthStore.getState()` works anywhere.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isRestoring: true,

  /** Called after a successful register, login, or token refresh. */
  setSession: (accessToken, user) => set({ accessToken, user, isRestoring: false }),

  /**
   * Called on logout, and whenever a refresh fails (the session is genuinely over).
   *
   * `isRestoring: false` matters here too: a failed startup refresh must leave the
   * UI in a settled "logged out" state, not stuck on the loading placeholder.
   */
  clearSession: () => set({ accessToken: null, user: null, isRestoring: false }),

  finishRestoring: () => set({ isRestoring: false }),
}));

/**
 * Convenience selectors.
 *
 * Passing a selector — `useAuthStore(selectIsAuthenticated)` — means the component
 * re-renders only when that derived value changes. Subscribing to the whole store
 * instead would re-render it on every unrelated field change.
 *
 * They are defined here, outside the hook call, so each is a stable function
 * reference across renders rather than a new closure every time.
 */
export const selectIsAuthenticated = (state: AuthState) => state.user !== null;
export const selectIsAdmin = (state: AuthState) => state.user?.role === "ADMIN";
