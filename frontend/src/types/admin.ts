import type { OrderStatus } from "./order";
import type { Role } from "./auth";

/** Mirrors the backend's `DashboardResponse`. */
export interface Dashboard {
  kpis: Kpis;
  salesTrend: SalesPoint[];
  topProducts: TopProduct[];
  ordersByStatus: StatusCount[];
  lowStock: LowStockItem[];
  recentOrders: RecentOrder[];
}

export interface Kpis {
  /** Lifetime revenue from PAID/SHIPPED/DELIVERED orders only — PENDING is not money yet. */
  revenueCents: number;
  revenueLast30dCents: number;
  /** Computed server-side so the UI cannot divide by zero on a fresh install. */
  averageOrderCents: number;
  orderCount: number;
  ordersLast30d: number;
  pendingOrderCount: number;
  customerCount: number;
  productCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValueCents: number;
}

export interface SalesPoint {
  /** ISO date, `YYYY-MM-DD`. Zero-filled by the server for days with no orders. */
  date: string;
  orders: number;
  revenueCents: number;
}

export interface TopProduct {
  /** Null if the product was deleted after selling. */
  productId: number | null;
  name: string;
  unitsSold: number;
  revenueCents: number;
}

export interface StatusCount {
  status: OrderStatus;
  count: number;
}

export interface LowStockItem {
  id: number;
  name: string;
  imageUrl: string | null;
  stock: number;
}

export interface RecentOrder {
  reference: string;
  customerEmail: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
}

/** Mirrors `AdminUserService.AdminUserResponse`. No password hash — ever. */
export interface AdminUser {
  id: number;
  email: string;
  role: Role;
  createdAt: string;
}

/**
 * Body for creating or updating a product.
 *
 * Mirrors the backend's `ProductRequest`: only fields a client may set. No `id`, `createdAt` or
 * `version`.
 */
export interface ProductInput {
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  imageUrl: string;
  categoryId: number | null;
  brandId: number | null;
}
