import { Suspense, lazy } from "react";
import { Outlet, Route, Routes } from "react-router-dom";
import { ConsoleLayout } from "./components/layout/ConsoleLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Spinner } from "./components/ui/Spinner";

/**
 * Pages are loaded lazily, one bundle per route.
 *
 * `lazy(() => import(...))` tells the bundler to split each page into its own chunk,
 * fetched the first time that route is visited. Without it every page — checkout,
 * settings, order history — ships in the initial download, so a visitor who only looks
 * at the dashboard still pays for all of it. This is the "lazy loading" item in
 * SUBJECT.md Phase 9, and it is what keeps the entry bundle small as pages are added.
 *
 * The trade-off is a brief fetch the first time you open a page, which is why the
 * `Suspense` fallback below exists. The shell (nav rail, top bar) is deliberately NOT
 * lazy: it is needed immediately on every route.
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
 * Needed because a lazily-loaded page suspends while its chunk downloads, and a
 * suspending component must have a boundary *above* it. Placing that boundary here —
 * inside `ConsoleLayout` — means the nav rail and top bar stay on screen during the
 * fetch. Wrapping the layout itself would blank the entire window instead.
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
 * ## Structure
 *
 * Everything nests inside `ConsoleLayout`, so the nav rail, top bar, ambient background
 * and overlay panels mount once and persist across navigation. Putting them in each
 * page would remount and re-animate them on every route change, and would close the
 * cart drawer whenever you navigated.
 *
 * `ProtectedRoute` is itself a layout route: it renders an `<Outlet />` when signed in
 * and redirects otherwise, so one guard covers every private page rather than each page
 * checking for itself.
 *
 * ## Which routes are private
 *
 * Checkout and orders need an owner, so they are guarded. Browsing — dashboard, store,
 * product pages — is deliberately public: requiring a sign-in before someone can see
 * what you sell is a reliable way to lose the sale. The collection stays public too,
 * since it lives in `localStorage` and works fine for a guest.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<ConsoleLayout />}>
        {/* One Suspense boundary inside the layout, so the shell stays visible while a
            page chunk loads. */}
        <Route element={<SuspenseOutlet />}>
          {/* ---- Public ---- */}
          <Route index element={<HomePage />} />
          <Route path="store" element={<StorePage />} />
          {/* `:id` is read with `useParams` and validated there — a non-numeric id
              renders the not-found state rather than firing a doomed request. */}
          <Route path="product/:id" element={<ProductPage />} />
          <Route path="collection" element={<CollectionPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

          {/* ---- Requires an account ---- */}
          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
          </Route>

          {/* Catch-all. Must be last: routes match in order, and a `*` placed earlier
              would swallow everything after it. */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
