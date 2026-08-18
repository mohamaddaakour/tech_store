import { Check, CreditCard, Package, Truck, XCircle } from "../ui/icons";
import type { IconComponent } from "../ui/icons";
import type { Order, OrderStatus } from "../../types/order";
import { ORDER_FLOW } from "../../types/order";
import { STATUS_LABELS } from "../../lib/orderStatus";
import { cn } from "../../lib/cn";

const STATUS_ICONS: Record<OrderStatus, IconComponent> = {
  PENDING: CreditCard,
  PAID: Check,
  SHIPPED: Truck,
  DELIVERED: Package,
  CANCELLED: XCircle,
};

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderTimeline({ order }: { order: Order }) {
  const isCancelled = order.status === "CANCELLED";
  const currentIndex = ORDER_FLOW.indexOf(order.status);

  function timestampFor(status: OrderStatus): string | undefined {
    return order.history.find((event) => event.status === status)?.at;
  }

  if (isCancelled) {
    const cancelledAt = timestampFor("CANCELLED");

    return (
      <div className="flex items-center gap-3 rounded-card bg-danger-soft p-4">
        <XCircle className="size-5 shrink-0 text-danger" />
        <div>
          <p className="text-sm font-semibold text-danger">Order cancelled</p>
          {cancelledAt && (
            <p className="text-[11px] text-danger/80">{formatEventTime(cancelledAt)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <ol className="relative flex flex-col gap-6">
      <div className="absolute bottom-4 left-4 top-4 w-px -translate-x-1/2 bg-line" />

      <div
        style={{
          height: `${(Math.max(0, currentIndex) / (ORDER_FLOW.length - 1)) * 100}%`,
        }}
        className="absolute left-4 top-4 w-px -translate-x-1/2 bg-accent transition-[height] duration-700 ease-out"
      />

      {ORDER_FLOW.map((status, index) => {
        const isComplete = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const Icon = STATUS_ICONS[status];
        const at = timestampFor(status);

        return (
          <li key={status} className="relative flex items-start gap-4">
            <span
              style={{ animationDelay: `${150 + index * 120}ms` }}
              className={cn(
                "animate-rise",
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-300",
                isComplete
                  ? "bg-accent text-accent-ink"
                  : "bg-surface-2 text-ink-faint ring-1 ring-line",

                isCurrent && "ring-4 ring-accent/25",
              )}
            >
              <Icon className="size-4" />
            </span>

            <div className="pt-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isComplete ? "text-ink" : "text-ink-faint",
                )}
              >
                {STATUS_LABELS[status]}
              </p>
              {at ? (
                <p className="text-[11px] text-ink-muted">{formatEventTime(at)}</p>
              ) : (
                <p className="text-[11px] text-ink-faint">Pending</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
