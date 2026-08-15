import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { useMyOrder } from "../hooks/useOrders";
import { formatPrice } from "../lib/format";
import { OrderStatusBadge } from "../components/orders/OrderStatusBadge";
import { OrderTimeline } from "../components/orders/OrderTimeline";
import { ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

/**
 * One of the customer's own orders: items, totals, delivery address, status timeline.
 *
 * The demo "advance status" and "cancel" buttons that used to live here are **gone**. Status
 * transitions are now driven by the admin panel (and, from Phase 4, a Stripe webhook) — which is how
 * it works in reality. A customer moving their own order to SHIPPED was only ever a stand-in for a
 * missing backend.
 *
 * The server scopes this lookup to the authenticated user, so another customer's reference returns
 * 404 rather than their data.
 */
export default function OrderDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const { data: order, isPending, error } = useMyOrder(reference);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading order">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <EmptyState
        icon="🔎"
        title="Order not found"
        message={error ? getErrorMessage(error) : `No order matches “${reference}”.`}
        action={
          <ButtonLink to="/orders" variant="secondary" size="sm">
            Back to orders
          </ButtonLink>
        }
      />
    );
  }

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
            {order.reference}
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
              {order.items.map((item, index) => (
                <li key={`${item.productName}-${index}`} className="flex items-center gap-3 px-4 py-3">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="size-12 shrink-0 rounded-control object-cover ring-1 ring-line"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {/* Links to the live product only when it still exists — `productId` is null
                        once a product is deleted. The name and price shown are always the order's
                        snapshot, so a repriced product cannot rewrite this receipt. */}
                    {item.productId ? (
                      <Link
                        to={`/product/${item.productId}`}
                        className="block truncate text-xs font-medium text-ink hover:text-accent"
                      >
                        {item.productName}
                      </Link>
                    ) : (
                      <span className="block truncate text-xs font-medium text-ink-muted">
                        {item.productName} <span className="text-ink-faint">(no longer sold)</span>
                      </span>
                    )}
                    <p className="text-[11px] text-ink-faint">
                      {item.quantity} × {formatPrice(item.unitPriceCents)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-ink">
                    {formatPrice(item.lineTotalCents)}
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
                <dt className="text-sm font-semibold text-ink">Total</dt>
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
        </aside>
      </div>
    </div>
  );
}
