import { apiPost } from "./client";
import type { AuthResponse, Credentials, User } from "../types/auth";
import { apiGet } from "./client";

/**
 * The auth endpoints, one function each.
 *
 * This file is a thin, honest wrapper: no state, no error handling, no toasts. Its
 * only job is "given these arguments, call that URL and give me back a typed
 * result". Deciding what to *do* with the result belongs to the caller — the hooks
 * in `hooks/useAuth.ts`. Keeping the two apart is what lets the network layer be
 * read, reasoned about, and swapped without touching any UI.
 *
 * The refresh cookie is never mentioned here because it never needs to be: the
 * browser attaches and stores it automatically thanks to `withCredentials` on the
 * axios instance.
 */

/** Creates an account and signs in. 409 if the email is taken, 400 if invalid. */
export function register(credentials: Credentials): Promise<AuthResponse> {
  return apiPost<AuthResponse, Credentials>("/auth/register", credentials);
}

/** Signs in. 401 with a deliberately vague message if the credentials are wrong. */
export function login(credentials: Credentials): Promise<AuthResponse> {
  return apiPost<AuthResponse, Credentials>("/auth/login", credentials);
}

/**
 * Clears the refresh cookie server-side.
 *
 * Worth calling even though the frontend also drops its in-memory token: without
 * this the cookie stays in the browser, and the next page load would helpfully
 * refresh the user straight back in.
 */
export function logout(): Promise<void> {
  return apiPost<void>("/auth/logout");
}

/**
 * Exchanges the refresh cookie for a fresh access token.
 *
 * Called on startup to restore a session. Note the response includes the user, so
 * one round trip both re-authenticates and repopulates the UI.
 *
 * Rejects with 401 when there is no valid cookie — which is the normal case for a
 * first-time visitor, not an error worth reporting.
 */
export function refreshSession(): Promise<AuthResponse> {
  return apiPost<AuthResponse>("/auth/refresh");
}

/** The current user, straight from the database. Requires a valid access token. */
export function fetchCurrentUser(): Promise<User> {
  return apiGet<User>("/auth/me");
}
