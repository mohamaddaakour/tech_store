import type { OrderStatus } from "./order";
import type { Role } from "./auth";

export interface Dashboard {
  kpis: Kpis;
  salesTrend: SalesPoint[];
  topProducts: TopProduct[];
  ordersByStatus: StatusCount[];
  lowStock: LowStockItem[];
  recentOrders: RecentOrder[];
}

export interface Kpis {
  revenueCents: number;
  revenueLast30dCents: number;

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
  date: string;
  orders: number;
  revenueCents: number;
}

export interface TopProduct {
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

export interface AdminUser {
  id: number;
  email: string;
  role: Role;
  createdAt: string;
}

export interface ProductInput {
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  imageUrl: string;
  categoryId: number | null;
  brandId: number | null;
}
