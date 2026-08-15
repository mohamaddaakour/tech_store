/**
 * Auth types — mirror the backend's `UserResponse` and `AuthResponse` records.
 */

/**
 * Matches the Java `Role` enum.
 *
 * A union of string literals rather than `string`: TypeScript will then reject a
 * typo like `"admin"` at compile time, and narrow correctly in comparisons. A bare
 * `string` would let `user.role === "Admin"` through — always false, silently
 * hiding the admin UI from every admin.
 */
export type Role = "CUSTOMER" | "ADMIN";

/** The safe, public view of an account. Note there is no password field of any kind. */
export interface User {
  id: number;
  email: string;
  role: Role;
}

/** Success body of register / login / refresh. */
export interface AuthResponse {
  /**
   * Short-lived bearer token. Kept in memory only — see `store/authStore.ts` for
   * why it must never be written to localStorage.
   */
  accessToken: string;
  /** Seconds until `accessToken` expires, so the client can refresh before it does. */
  expiresInSeconds: number;
  user: User;
}

/** Credentials for both login and register — the two endpoints take the same body. */
export interface Credentials {
  email: string;
  password: string;
}

/**
 * The error body every failed request returns — the backend's `ApiError` record.
 *
 * Both fields are optional here on purpose: a request can also fail before it ever
 * reaches our code (network down, CORS rejection, a proxy returning HTML), in which
 * case there is no `ApiError` to read. Typing them as required would let code
 * assume `error.message` exists and then crash while trying to display the error.
 */
export interface ApiErrorBody {
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  /** Present only on validation failures: field name -> what is wrong with it. */
  fieldErrors?: Record<string, string>;
}
