import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { login, logout, refreshSession, register } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";

/**
 * The auth actions, as hooks.
 *
 * Each wraps a function from `api/auth.ts` in a TanStack Query mutation, which
 * hands the component `isPending`, `error` and `mutate` instead of it having to
 * track three pieces of state by hand. `onSuccess` is where the result lands in the
 * Zustand store — so a component only ever says "log this person in", never "…and
 * also update the token, and the user, and the loading flag".
 */

/** Signs in an existing account. */
export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => setSession(data.accessToken, data.user),
  });
}

/** Creates an account. The backend signs the new user straight in. */
export function useRegister() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: register,
    onSuccess: (data) => setSession(data.accessToken, data.user),
  });
}

/** Signs out: clears the server's refresh cookie, then all local state. */
export function useLogout() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearCart = useCartStore((state) => state.clear);

  return useMutation({
    mutationFn: logout,

    /**
     * `onSettled` runs after success *and* failure, which is the right choice here.
     * If the network call fails, the user still pressed "sign out" and still expects
     * to be signed out — refusing to clear local state because a request failed
     * would leave them apparently logged in against their wishes.
     *
     * The cart is cleared too: on a shared or public computer, leaving the previous
     * person's items in the cart is both confusing and a small privacy leak.
     */
    onSettled: () => {
      clearSession();
      clearCart();
    },
  });
}

/**
 * Restores a session on page load. Call once, at the top of the app.
 *
 * This is what makes the in-memory access token practical. On a fresh page there is
 * no token — it died with the previous JavaScript context — but the HttpOnly refresh
 * cookie is still in the browser, so we spend one request trading it for a new
 * access token and the user never notices they were technically logged out.
 *
 * A rejection here is the completely normal case for a first-time visitor, which is
 * why it is swallowed rather than surfaced: there is nothing wrong, they are simply
 * not signed in.
 */
export function useRestoreSession() {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  /**
   * Guards against running twice.
   *
   * React's StrictMode intentionally mounts, unmounts and remounts every component
   * in development to surface missing cleanup. Without this ref that means two
   * refresh calls on every dev page load — harmless, but noisy enough in the network
   * tab to send you chasing a bug that does not exist.
   */
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    refreshSession()
      .then((data) => setSession(data.accessToken, data.user))
      // Sets `isRestoring: false`, which is what lets the header stop showing its
      // placeholder and settle on "Sign in".
      .catch(() => clearSession());
  }, [setSession, clearSession]);
}
