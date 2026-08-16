import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Boxes,
  DollarSign,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
} from "../../components/ui/icons";
import { getErrorMessage } from "../../api/client";
import { useDashboard } from "../../hooks/useAdmin";
import { formatPrice, pluralize } from "../../lib/format";
import { STATUS_LABELS } from "../../lib/orderStatus";
import { KpiTile } from "../../components/admin/KpiTile";
import { AreaTrendChart } from "../../components/admin/AreaTrendChart";
import { StatusBarChart } from "../../components/admin/StatusBarChart";
import { OrderStatusBadge } from "../../components/orders/OrderStatusBadge";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

function formatAxisDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function AdminDashboardPage() {
  const { data, isPending, error, refetch, isFetching } = useDashboard();

  if (isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-tile" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-card" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Could not load the dashboard"
        message={getErrorMessage(error)}
        action={
          <Button variant="secondary" size="sm" loading={isFetching} onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!data) return null;

  const { kpis, salesTrend, topProducts, ordersByStatus, lowStock, recentOrders } = data;

  const trendData = salesTrend.map((point) => ({
    date: formatAxisDate(point.date),
    revenue: point.revenueCents / 100,
    orders: point.orders,
  }));

  const statusData = ordersByStatus.map((entry) => ({
    name: STATUS_LABELS[entry.status],
    count: entry.count,
    status: entry.status,
  }));

  const statusColors: Record<string, string> = {
    PENDING: "var(--color-warn)",
    PAID: "var(--color-info)",
    SHIPPED: "var(--color-accent-alt)",
    DELIVERED: "var(--color-accent)",
    CANCELLED: "var(--color-danger)",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          index={0}
          label="Revenue"
          value={kpis.revenueCents}
          format={(value) => formatPrice(value)}
          icon={DollarSign}
          hint={`${formatPrice(kpis.revenueLast30dCents)} last 30 days`}
        />
        <KpiTile
          index={1}
          label="Orders"
          value={kpis.orderCount}
          icon={ShoppingBag}
          hint={`${kpis.ordersLast30d} in the last 30 days`}
        />
        <KpiTile
          index={2}
          label="Avg order"
          value={kpis.averageOrderCents}
          format={(value) => formatPrice(value)}
          icon={TrendingUp}
          hint="Paid orders only"
        />
        <KpiTile
          index={3}
          label="Customers"
          value={kpis.customerCount}
          icon={Users}
          hint="Have placed an order"
        />
        <KpiTile index={4} label="Products" value={kpis.productCount} icon={Package} />
        <KpiTile
          index={5}
          label="Inventory value"
          value={kpis.inventoryValueCents}
          format={(value) => formatPrice(value)}
          icon={Boxes}
          hint="Retail value on hand"
        />
        <KpiTile
          index={6}
          label="Low stock"
          value={kpis.lowStockCount}
          icon={AlertTriangle}

          tone={kpis.lowStockCount > 0 ? "warn" : "default"}
          hint="5 or fewer left"
        />
        <KpiTile
          index={7}
          label="Awaiting payment"
          value={kpis.pendingOrderCount}
          icon={ShoppingBag}
          tone={kpis.pendingOrderCount > 0 ? "warn" : "default"}
        />
      </div>

      <section className="rounded-card bg-surface p-5 ring-1 ring-line">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink">Revenue, last 30 days</h2>
            <p className="text-[11px] text-ink-muted">Paid, shipped and delivered orders</p>
          </div>
          <span className="text-lg font-black tabular-nums text-ink">
            {formatPrice(kpis.revenueLast30dCents)}
          </span>
        </div>

        <div className="h-64 w-full">
          <AreaTrendChart data={trendData} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card bg-surface p-5 ring-1 ring-line">
          <h2 className="mb-4 text-sm font-bold text-ink">Orders by status</h2>

          <div className="h-56 w-full">
            <StatusBarChart data={statusData} colors={statusColors} />
          </div>
        </section>

        <section className="rounded-card bg-surface p-5 ring-1 ring-line">
          <h2 className="mb-4 text-sm font-bold text-ink">Top sellers</h2>

          {topProducts.length === 0 ? (
            <p className="py-8 text-center text-xs text-ink-muted">
              No paid orders yet — best sellers appear once orders are marked paid.
            </p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {topProducts.map((product, index) => (
                <li key={`${product.name}-${index}`} className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface-2 text-[11px] font-bold text-ink-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {product.productId ? (
                      <Link
                        to={`/product/${product.productId}`}
                        className="block truncate text-xs font-medium text-ink hover:text-accent"
                      >
                        {product.name}
                      </Link>
                    ) : (
                      <span className="block truncate text-xs text-ink-muted">
                        {product.name} <span className="text-ink-faint">(deleted)</span>
                      </span>
                    )}
                    <p className="text-[10px] text-ink-faint">
                      {pluralize(product.unitsSold, "unit")} sold
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">
                    {formatPrice(product.revenueCents)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card bg-surface p-5 ring-1 ring-line">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-sm font-bold text-ink">Low stock</h2>
            {kpis.outOfStockCount > 0 && (
              <Badge tone="danger">{kpis.outOfStockCount} sold out</Badge>
            )}
          </div>

          {lowStock.length === 0 ? (
            <p className="py-8 text-center text-xs text-ink-muted">
              Everything is well stocked.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {lowStock.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="size-9 shrink-0 rounded-control object-cover ring-1 ring-line"
                    />
                  )}
                  <Link
                    to={`/product/${item.id}`}
                    className="min-w-0 flex-1 truncate text-xs font-medium text-ink hover:text-accent"
                  >
                    {item.name}
                  </Link>
                  <Badge tone={item.stock === 0 ? "danger" : "warn"}>
                    {item.stock === 0 ? "Sold out" : `${item.stock} left`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card bg-surface p-5 ring-1 ring-line">
          <h2 className="mb-4 text-sm font-bold text-ink">Recent orders</h2>

          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-xs text-ink-muted">No orders yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {recentOrders.map((order) => (
                <li key={order.reference}>
                  <Link
                    to={`/admin/orders/${order.reference}`}
                    className="flex items-center gap-3 rounded-control p-1.5 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-semibold text-ink">
                        {order.reference}
                      </p>
                      <p className="truncate text-[10px] text-ink-faint">{order.customerEmail}</p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">
                      {formatPrice(order.totalCents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
