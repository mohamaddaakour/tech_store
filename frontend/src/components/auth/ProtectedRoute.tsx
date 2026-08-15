import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Spinner } from "../ui/Spinner";

/**
 * Route guard for pages that require a signed-in user (SUBJECT.md Phase 1:
 * "Protected routes").
 *
 * Used as a layout route wrapping the private pages, so one guard covers all of them
 * rather than each page checking for itself.
 *
 * ## The `isRestoring` case is the important one
 *
 * On a fresh page load the access token is not in memory yet — it lives only in the
 * HttpOnly refresh cookie until `useRestoreSession` trades it in. If we checked
 * `user === null` immediately, a signed-in user who reloaded `/checkout` would be
 * bounced to the login page a fraction of a second before their session came back.
 * So while the restore is in flight we render a spinner and decide nothing.
 *
 * ## This is not a security boundary
 *
 * It only decides what to *render*. The backend independently rejects unauthenticated
 * requests, which is what actually protects the data — anyone can edit client-side
 * state in devtools. Guarding routes is a UX nicety: it stops the user seeing a page
 * that would only fill with 401s.
 */
export function ProtectedRoute() {
  const user = useAuthStore((state) => state.user);
  const isRestoring = useAuthStore((state) => state.isRestoring);
  const location = useLocation();

  if (isRestoring) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-6 text-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        // `replace` keeps the guarded URL out of history, so pressing Back from the
        // login page does not bounce through the redirect again.
        replace
        // Hand the attempted destination to the login form, which sends the user
        // straight there after signing in instead of dumping them on the dashboard.
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
