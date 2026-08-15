import { Suspense, lazy } from "react";
import { Outlet, Route, Routes } from "react-router-dom";
import { ConsoleLayout } from "./components/layout/ConsoleLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminRoute } from "./components/admin/AdminRoute";
import { Spinner } from "./components/ui/Spinner";

/**
 * Pages are loaded lazily, one bundle per route.
 *
 * `lazy(() => import(...))` splits each page into its own chunk, fetched the first time that route is
 * visited. That matters most for the admin panel: Recharts is a large dependency, and without
 * splitting every shopper would download the charting library to look at a product page.
 */
const HomePage = lazy(() => import("./pages/HomePage"));
const StorePage = lazy(() => import("./pages/StorePage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const CollectionPage = lazy(() => import("./pages/CollectionPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// Admin panel. Lazily loaded as its own chunks, so the charting library never reaches a customer.
const AdminLayout = lazy(() =>
  import("./components/admin/AdminLayout").then((module) => ({ default: module.AdminLayout })),
);
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage"));
const AdminOrderDetailPage = lazy(() => import("./pages/admin/AdminOrderDetailPage"));
const AdminCatalogPage = lazy(() => import("./pages/admin/AdminCatalogPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));

/** Shown while a route's chunk is downloading. Centred so it does not shift the layout. */
function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="size-6 text-accent" />
    </div>
  );
}

/**
 * A pathless layout route that wraps its children in a Suspense boundary.
 *
 * A lazily-loaded page suspends while its chunk downloads, and a suspending component needs a
 * boundary above it. Placing it here — inside `ConsoleLayout` — keeps the nav rail and top bar on
 * screen during the fetch; wrapping the layout itself would blank the whole window.
 */
function SuspenseOutlet() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}

/**
 * The route table.
 *
 * ## Three levels of access
 *
 * - **Public** — dashboard, store, product pages, collection. Requiring a sign-in before someone can
 *   see what you sell is a reliable way to lose the sale.
 * - **`ProtectedRoute`** — checkout and orders. These need an owner.
 * - **`AdminRoute`** — the whole admin panel. Checks the role, and shows a "no permission" screen
 *   rather than a login form for a signed-in customer, since logging in again would change nothing.
 *
 * Both guards are layout routes rendering an `<Outlet />`, so one guard covers every page beneath it
 * and a newly added route inherits protection instead of being accidentally public.
 *
 * Neither is a security boundary — the backend enforces authentication and `hasRole("ADMIN")` on
 * every request independently. These only decide what to render.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<ConsoleLayout />}>
        <Route element={<SuspenseOutlet />}>
          {/* ---- Public ---- */}
          <Route index element={<HomePage />} />
          <Route path="store" element={<StorePage />} />
          <Route path="product/:id" element={<ProductPage />} />
          <Route path="collection" element={<CollectionPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

          {/* ---- Requires an account ---- */}
          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
            {/* Keyed by the order's public reference (TS-2026-0007), not its database id —
                sequential ids let anyone probe a neighbouring customer's order. */}
            <Route path="orders/:reference" element={<OrderDetailPage />} />
          </Route>

          {/* ---- Requires ADMIN ---- */}
          <Route path="admin" element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="orders/:reference" element={<AdminOrderDetailPage />} />
              <Route path="catalog" element={<AdminCatalogPage />} />
              <Route path="users" element={<AdminUsersPage />} />
            </Route>
          </Route>

          {/* Catch-all. Must be last: routes match in order, and a `*` placed earlier would
              swallow everything after it. */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
