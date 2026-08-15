import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useOrderStore } from "../store/orderStore";
import { formatPrice, pluralize } from "../lib/format";
import { OrderStatusBadge } from "../components/orders/OrderStatusBadge";
import { ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

/** Short date for the list rows. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Order history (SUBJECT.md Phase 3: "Orders").
 *
 * A protected route — see `ProtectedRoute` in the router. Orders belong to an account,
 * so an anonymous visitor is redirected to sign in first.
 *
 * Data comes from `orderStore` (localStorage) because the backend has no order
 * endpoints yet. When they land this becomes a `useQuery` and nothing below changes.
 */
export default function OrdersPage() {
  const orders = useOrderStore((state) => state.orders);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {orders.length === 0
            ? "No orders yet"
            : `${pluralize(orders.length, "order")} · stored in this browser`}
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
        <ul className="flex flex-col gap-3">
          {orders.map((order, index) => (
            <motion.li
              key={order.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
            >
              <Link
                to={`/orders/${order.id}`}
                className="group flex items-center gap-4 rounded-card bg-surface p-4 ring-1 ring-line transition-shadow duration-300 hover:glow-accent"
              >
                {/* Overlapping item thumbnails, capped at three plus a counter — the
                    same device a mail client uses for attachments. It communicates
                    "how much is in here" in a fixed width. */}
                <div className="flex shrink-0 -space-x-3">
                  {order.items.slice(0, 3).map((item) => (
                    <img
                      key={item.productId}
                      src={item.imageUrl}
                      alt=""
                      className="size-11 rounded-control object-cover ring-2 ring-surface"
                    />
                  ))}
                  {order.items.length > 3 && (
                    <span className="grid size-11 place-items-center rounded-control bg-surface-2 text-[11px] font-bold text-ink-muted ring-2 ring-surface">
                      +{order.items.length - 3}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-ink">{order.id}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    {formatDate(order.createdAt)} ·{" "}
                    {pluralize(
                      order.items.reduce((total, item) => total + item.quantity, 0),
                      "item",
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold tabular-nums text-ink">
                    {formatPrice(order.totalCents)}
                  </span>
                  {/* Nudges right on hover — a small affordance that says "this opens". */}
                  <ArrowRight className="size-4 text-ink-faint transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent" />
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
