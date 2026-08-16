import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert } from "../ui/icons";
import { useAuthStore } from "../../store/authStore";
import { ButtonLink } from "../ui/Button";
import { Spinner } from "../ui/Spinner";

export function AdminRoute() {
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
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
          <ShieldAlert className="size-6" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-ink">Admin access required</h1>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">
            You are signed in as <span className="font-medium text-ink">{user.email}</span>, which is a
            customer account. Ask an administrator to grant you access.
          </p>
        </div>
        <ButtonLink to="/" variant="secondary" size="sm">
          Back to the store
        </ButtonLink>
      </div>
    );
  }

  return <Outlet />;
}
