import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Spinner } from "../ui/Spinner";

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

        replace

        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
