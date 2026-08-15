import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { useMyOrders } from "../hooks/useOrders";
import { formatPrice, pluralize } from "../lib/format";
import { OrderStatusBadge } from "../components/orders/OrderStatusBadge";
import { Button, ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Order history — now served from the database rather than `localStorage`.
 *
 * A protected route: orders belong to an account, so an anonymous visitor is redirected to sign in.
 * The backend independently scopes the query to the authenticated user, so this cannot show anyone
 * else's orders even if the guard were bypassed.
 */
export default function OrdersPage() {
  const [page, setPage] = useState(0);
  const { data, isPending, error, refetch, isFetching } = useMyOrders(page);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading orders">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-card" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Could not load your orders"
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {orders.length === 0
            ? "No orders yet"
            : `${pluralize(data?.totalElements ?? 0, "order")}`}
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders yet"
          message="Once you check out, your orders and their delivery progress appear here."
          action={
            <ButtonLink to="/store" variant="secondary" size="sm">
              Browse the store
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {orders.map((order, index) => (
              <motion.li
                key={order.reference}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
              >
                <Link
                  to={`/orders/${order.reference}`}
                  className="group flex items-center gap-4 rounded-card bg-surface p-4 ring-1 ring-line transition-shadow duration-300 hover:glow-accent"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-ink">
                        {order.reference}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      {formatDate(order.createdAt)} · {pluralize(order.itemCount, "item")}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold tabular-nums text-ink">
                      {formatPrice(order.totalCents)}
                    </span>
                    {/* Nudges right on hover — a small cue that this opens. */}
                    <ArrowRight className="size-4 text-ink-faint transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent" />
                  </div>
                </Link>
              </motion.li>
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
