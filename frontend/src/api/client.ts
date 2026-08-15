import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";
import type { ApiErrorBody, AuthResponse } from "../types/auth";

/**
 * Where the API lives. Reads a Vite env var so a deployed build can point
 * somewhere else, falling back to the local backend for development.
 *
 * Only variables prefixed `VITE_` are exposed to the browser — Vite deliberately
 * withholds the rest, so a secret in `.env` cannot leak into the bundle by accident.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

/**
 * The shared axios instance. Every request in the app goes through this, which is
 * what makes the two interceptors below apply everywhere.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,

  /**
   * The frontend half of the refresh-cookie contract: tells the browser to send
   * cookies on cross-origin requests, and to store the `Set-Cookie` that comes
   * back. Without it, login appears to work but the refresh cookie is silently
   * discarded — and the session dies at the first reload.
   *
   * The backend must agree, via `setAllowCredentials(true)` in `SecurityConfig`.
   * Both sides have to opt in.
   */
  withCredentials: true,
});

/**
 * A second, bare client used *only* for the refresh call.
 *
 * It exists to break a loop: if the refresh request went through `apiClient` and
 * came back 401, the response interceptor would try to fix it by refreshing —
 * which would 401 again, forever. Having no interceptors makes that impossible by
 * construction rather than by remembering to check for it.
 */
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/**
 * Endpoints where a 401 is a real answer rather than an expired token.
 *
 * A 401 from `/auth/login` means "wrong password" — attempting a token refresh
 * would be nonsense, and would replace the useful error with a confusing one.
 * Note `/auth/me` is deliberately absent: a 401 there genuinely does mean the
 * access token expired, and should trigger a refresh.
 */
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

/** Axios config plus our own marker, so a retried request is only retried once. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

/* ---------------------------------------------------------------------------
   REQUEST INTERCEPTOR — attach the access token
   --------------------------------------------------------------------------- */

apiClient.interceptors.request.use((config) => {
  // `getState()` reads Zustand from outside React. A hook is impossible here:
  // this callback is not a component and does not run during a render.
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/* ---------------------------------------------------------------------------
   RESPONSE INTERCEPTOR — transparently refresh an expired token
   --------------------------------------------------------------------------- */

/**
 * The in-flight refresh, if one is happening.
 *
 * This single variable is what stops a stampede. Say the page loads and fires
 * five requests at once with a token that just expired: all five come back 401,
 * and all five want to refresh. Without this, that is five refresh calls racing
 * each other, four of which are wasted and any of which could clobber a newer
 * token. With it, the first call creates the promise and the other four await the
 * same one.
 */
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      // No body: the refresh token travels in the HttpOnly cookie, which the
      // browser attaches automatically because of `withCredentials`. JavaScript
      // never sees its value, which is the entire point.
      .post<AuthResponse>("/auth/refresh")
      .then((response) => {
        useAuthStore.getState().setSession(response.data.accessToken, response.data.user);
        return response.data.accessToken;
      })
      .finally(() => {
        // Clear it either way, so the *next* expiry can start a fresh attempt.
        // `finally` passes the value (or the rejection) straight through.
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.response.use(
  // Successful responses pass through untouched.
  (response) => response,

  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetriableConfig | undefined;
    const isUnauthorized = error.response?.status === 401;
    const isExemptPath = NO_REFRESH_PATHS.some((path) => config?.url?.startsWith(path));

    // `!config._retried` is the loop guard: if the retried request 401s again, we
    // give up rather than trying forever.
    if (isUnauthorized && config && !config._retried && !isExemptPath) {
      config._retried = true;

      try {
        await refreshAccessToken();
        // Replay the original request. The request interceptor runs again and
        // picks up the new token, so the caller never learns any of this happened
        // -- their `await` simply takes a little longer and then succeeds.
        return apiClient(config);
      } catch {
        // The refresh token is gone or expired too: the session really is over.
        useAuthStore.getState().clearSession();
      }
    }

    // Re-reject so the caller (and TanStack Query) still sees the failure.
    return Promise.reject(error);
  },
);

/* ---------------------------------------------------------------------------
   TYPED HELPERS
   --------------------------------------------------------------------------- */

/**
 * `GET` returning just the parsed body.
 *
 * Callers almost never want the full axios response — status and headers are the
 * interceptors' business. Unwrapping `.data` here keeps every calling site to one
 * clean line.
 *
 * Unlike `fetch`, axios rejects on any non-2xx status by itself, so there is no
 * `if (!res.ok) throw` to remember. That is the main reason this codebase uses
 * axios: with `fetch`, forgetting that check turns a 500 into a successful call
 * that resolves with an error page as its "data".
 */
export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiClient.get<T>(path);
  return response.data;
}

/** `POST` returning just the parsed body. */
export async function apiPost<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
): Promise<TResponse> {
  const response = await apiClient.post<TResponse>(path, body);
  return response.data;
}

/**
 * Pulls a human-readable message out of anything that was thrown.
 *
 * Needed because a failure has several possible shapes: our `ApiError` JSON, a
 * network error with no response at all (backend not running, DNS failure), or a
 * plain JavaScript bug. A component that just rendered `error.message` would show
 * users raw text like "Request failed with status code 409".
 */
export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    // No `response` object at all means the request never reached the server.
    if (!error.response) {
      return "Cannot reach the server. Is the backend running?";
    }
    if (error.response.data?.message) {
      return error.response.data.message;
    }
  }

  return fallback;
}

/**
 * Per-field validation messages from a 400, for showing errors under the inputs
 * that caused them. Returns an empty object for any other kind of failure, so
 * callers can use it unconditionally.
 */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.fieldErrors ?? {};
  }

  return {};
}
