import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { getErrorMessage } from "../../api/client";
import { useAdminOrders } from "../../hooks/useOrders";
import { formatPrice, pluralize } from "../../lib/format";
import { STATUS_LABELS } from "../../lib/orderStatus";
import type { OrderStatus } from "../../types/order";
import { OrderStatusBadge } from "../../components/orders/OrderStatusBadge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { cn } from "../../lib/cn";

/** "" is the sentinel for "no filter" — the API rejects `?status=` as an invalid enum. */
const STATUS_FILTERS: Array<{ value: OrderStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "PENDING", label: STATUS_LABELS.PENDING },
  { value: "PAID", label: STATUS_LABELS.PAID },
  { value: "SHIPPED", label: STATUS_LABELS.SHIPPED },
  { value: "DELIVERED", label: STATUS_LABELS.DELIVERED },
  { value: "CANCELLED", label: STATUS_LABELS.CANCELLED },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Order management for staff — every customer's orders, filterable by status. */
export default function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(0);

  const { data, isPending, error, refetch, isFetching } = useAdminOrders(status, page);

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Could not load orders"
        message={getErrorMessage(error)}
        action={
          <Button variant="secondary" size="sm" loading={isFetching} onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const orders = data?.content ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Status filter ---- */}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value || "all"}
            onClick={() => {
              setStatus(filter.value);
              setPage(0);
            }}
            aria-pressed={status === filter.value}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
              status === filter.value
                ? "bg-accent text-accent-ink"
                : "bg-surface-2 text-ink-muted ring-1 ring-line hover:bg-surface-3 hover:text-ink",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-ink-muted">
        {isPending ? "Loading…" : pluralize(data?.totalElements ?? 0, "order")}
      </p>

      {isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-card" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders here"
          message={
            status
              ? `No orders are currently ${STATUS_LABELS[status].toLowerCase()}.`
              : "No orders have been placed yet."
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {orders.map((order) => (
              <li key={order.reference}>
                <Link
                  to={`/admin/orders/${order.reference}`}
                  className="group flex items-center gap-3 rounded-card bg-surface p-3.5 ring-1 ring-line transition-shadow hover:glow-accent"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-ink">
                        {order.reference}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 truncate text-[11px] text-ink-faint">
                      {order.customerEmail} · {formatDate(order.createdAt)} ·{" "}
                      {pluralize(order.itemCount, "item")}
                    </p>
                  </div>

                  <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
                    {formatPrice(order.totalCents)}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                </Link>
              </li>
            ))}
          </ul>

          {(data?.totalPages ?? 1) > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={data?.first}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <span className="text-xs tabular-nums text-ink-muted">
                {page + 1} / {data?.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={data?.last}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
