import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useOrderStore } from "../store/orderStore";
import { formatPrice } from "../lib/format";
import { OrderStatusBadge } from "../components/orders/OrderStatusBadge";
import { OrderTimeline } from "../components/orders/OrderTimeline";
import { Button, ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

/**
 * A single order: items, totals, delivery address, and the animated status timeline.
 *
 * Includes two controls that would **not** exist in production — "Advance status" and
 * "Cancel". Status transitions are normally driven by a Stripe webhook (Phase 4) and
 * an admin action (Phase 6), never by the customer. They are here so the timeline
 * animation and the full lifecycle can actually be exercised without a backend, and
 * they are labelled as a simulation rather than dressed up as real features.
 */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  // Selecting the order itself (not the whole array) means this page re-renders only
  // when *this* order changes.
  const order = useOrderStore((state) => state.orders.find((entry) => entry.id === id));
  const advanceStatus = useOrderStore((state) => state.advanceStatus);
  const cancelOrder = useOrderStore((state) => state.cancelOrder);

  if (!order) {
    return (
      <EmptyState
        icon="🔎"
        title="Order not found"
        message={`No order matches “${id}” in this browser.`}
        action={
          <ButtonLink to="/orders" variant="secondary" size="sm">
            Back to orders
          </ButtonLink>
        }
      />
    );
  }

  const isFinished = order.status === "DELIVERED" || order.status === "CANCELLED";

  return (
    <div className="flex flex-col gap-8">
      <Link
        to="/orders"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-3.5" />
        Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {order.id}
          </h1>
          <p className="mt-1 text-xs text-ink-muted">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          {/* ---- Items ---- */}
          <div className="overflow-hidden rounded-card bg-surface ring-1 ring-line">
            <h2 className="border-b border-line px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-faint">
              Items
            </h2>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.productId} className="flex items-center gap-3 px-4 py-3">
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-control object-cover ring-1 ring-line"
                  />
                  <div className="min-w-0 flex-1">
                    {/* Links back to the live product, but the *name and price shown
                        are the order's snapshot* — a renamed or repriced product must
                        not rewrite history on an existing receipt. */}
                    <Link
                      to={`/product/${item.productId}`}
                      className="block truncate text-xs font-medium text-ink hover:text-accent"
                    >
                      {item.name}
                    </Link>
                    <p className="text-[11px] text-ink-faint">
                      {item.quantity} × {formatPrice(item.unitPriceCents)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-ink">
                    {formatPrice(item.unitPriceCents * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ---- Timeline ---- */}
          <div className="rounded-card bg-surface p-5 ring-1 ring-line">
            <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-ink-faint">
              Progress
            </h2>
            <OrderTimeline order={order} />
          </div>
        </div>

        {/* ---- Sidebar ---- */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-card bg-surface p-5 ring-1 ring-line">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-faint">Total</h2>
            <dl className="mt-3 flex flex-col gap-2 text-xs">
              <div className="flex justify-between text-ink-muted">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between text-ink-muted">
                <dt>Delivery</dt>
                <dd className="tabular-nums">
                  {order.shippingCents === 0 ? (
                    <span className="font-semibold text-accent">Free</span>
                  ) : (
                    formatPrice(order.shippingCents)
                  )}
                </dd>
              </div>
              <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2.5">
                <dt className="text-sm font-semibold text-ink">Paid</dt>
                <dd className="text-lg font-black tabular-nums text-ink">
                  {formatPrice(order.totalCents)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-card bg-surface p-5 ring-1 ring-line">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-faint">
              Delivery address
            </h2>
            <address className="mt-3 text-xs not-italic leading-relaxed text-ink-muted">
              <span className="block font-semibold text-ink">{order.address.fullName}</span>
              {order.address.line1}
              <br />
              {order.address.city}, {order.address.postalCode}
              <br />
              {order.address.country}
            </address>
          </div>

          {/* ---- Simulation controls ---- */}
          {!isFinished && (
            <div className="rounded-card bg-info-soft p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-info">
                Demo controls
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-info/90">
                In production these transitions come from the Stripe webhook and the admin
                dashboard — never from the customer.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  size="sm"
                  fullWidth
                  onClick={() => {
                    advanceStatus(order.id);
                    toast.success("Status advanced");
                  }}
                >
                  Advance status
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    cancelOrder(order.id);
                    toast("Order cancelled", { icon: "⚠️" });
                  }}
                >
                  Cancel order
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
