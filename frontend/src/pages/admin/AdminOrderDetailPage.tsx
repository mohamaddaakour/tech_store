import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "../../components/ui/icons";
import { toast } from "../../store/toastStore";
import { getErrorMessage } from "../../api/client";
import { useAdminOrder, useUpdateOrderStatus } from "../../hooks/useOrders";
import { formatPrice } from "../../lib/format";
import { STATUS_LABELS } from "../../lib/orderStatus";
import type { OrderStatus } from "../../types/order";
import { OrderStatusBadge } from "../../components/orders/OrderStatusBadge";
import { OrderTimeline } from "../../components/orders/OrderTimeline";
import { Button, ButtonLink } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

export default function AdminOrderDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const { data: order, isPending, error } = useAdminOrder(reference);
  const updateStatus = useUpdateOrderStatus();

  function changeStatus(status: OrderStatus) {
    if (!reference) return;

    updateStatus.mutate(
      { reference, status },
      {
        onSuccess: () => toast.success(`Order marked ${STATUS_LABELS[status].toLowerCase()}`),
        onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
      },
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading order">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
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
          <ButtonLink to="/admin/orders" variant="secondary" size="sm">
            Back to orders
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/admin/orders"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-3.5" />
        All orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-mono text-xl font-bold tracking-tight text-ink">{order.reference}</h2>
          <p className="mt-1 text-xs text-ink-muted">
            {order.customerEmail} · placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="rounded-card bg-surface p-5 ring-1 ring-line">
        <h3 className="text-xs font-bold uppercase tracking-widest text-ink-faint">
          Update status
        </h3>

        {order.terminal ? (
          <p className="mt-3 text-xs text-ink-muted">
            This order is {STATUS_LABELS[order.status].toLowerCase()} and cannot change further.
            {order.status === "DELIVERED" &&
              " Reversing a delivery is a return, which is a separate process."}
          </p>
        ) : (
          <>
            <p className="mt-1 text-[11px] text-ink-muted">
              Only valid next steps are shown, based on the order's current state.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {order.allowedNextStatuses.map((next) => (
                <Button
                  key={next}
                  size="sm"

                  variant={next === "CANCELLED" ? "danger" : "primary"}
                  loading={updateStatus.isPending}
                  onClick={() => changeStatus(next)}
                >
                  Mark {STATUS_LABELS[next].toLowerCase()}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-card bg-surface ring-1 ring-line">
            <h3 className="border-b border-line px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-faint">
              Items
            </h3>
            <ul className="divide-y divide-line">
              {order.items.map((item, index) => (
                <li key={`${item.productName}-${index}`} className="flex items-center gap-3 px-4 py-3">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="size-11 shrink-0 rounded-control object-cover ring-1 ring-line"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {item.productId ? (
                      <Link
                        to={`/product/${item.productId}`}
                        className="block truncate text-xs font-medium text-ink hover:text-accent"
                      >
                        {item.productName}
                      </Link>
                    ) : (
                      <span className="block truncate text-xs text-ink-muted">
                        {item.productName} <span className="text-ink-faint">(deleted)</span>
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

          <div className="rounded-card bg-surface p-5 ring-1 ring-line">
            <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-ink-faint">
              History
            </h3>
            <OrderTimeline order={order} />
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-card bg-surface p-5 ring-1 ring-line">
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-faint">Total</h3>
            <dl className="mt-3 flex flex-col gap-2 text-xs">
              <div className="flex justify-between text-ink-muted">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between text-ink-muted">
                <dt>Delivery</dt>
                <dd className="tabular-nums">
                  {order.shippingCents === 0 ? "Free" : formatPrice(order.shippingCents)}
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
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-faint">
              Deliver to
            </h3>
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
