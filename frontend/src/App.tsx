import { Suspense, lazy } from "react";
import { Outlet, Route, Routes } from "react-router-dom";
import { ConsoleLayout } from "./components/layout/ConsoleLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminRoute } from "./components/admin/AdminRoute";
import { Spinner } from "./components/ui/Spinner";

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

const AdminLayout = lazy(() =>
  import("./components/admin/AdminLayout").then((module) => ({ default: module.AdminLayout })),
);
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage"));
const AdminOrderDetailPage = lazy(() => import("./pages/admin/AdminOrderDetailPage"));
const AdminCatalogPage = lazy(() => import("./pages/admin/AdminCatalogPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="size-6 text-accent" />
    </div>
  );
}

function SuspenseOutlet() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<ConsoleLayout />}>
        <Route element={<SuspenseOutlet />}>
          <Route index element={<HomePage />} />
          <Route path="store" element={<StorePage />} />
          <Route path="product/:id" element={<ProductPage />} />
          <Route path="collection" element={<CollectionPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:reference" element={<OrderDetailPage />} />
          </Route>

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

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
