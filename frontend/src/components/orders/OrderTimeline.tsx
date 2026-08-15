import { motion, useReducedMotion } from "motion/react";
import { Check, CreditCard, Package, Truck, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Order, OrderStatus } from "../../types/order";
import { ORDER_FLOW } from "../../types/order";
import { STATUS_LABELS } from "../../lib/orderStatus";
import { cn } from "../../lib/cn";

const STATUS_ICONS: Record<OrderStatus, LucideIcon> = {
  PENDING: CreditCard,
  PAID: Check,
  SHIPPED: Truck,
  DELIVERED: Package,
  CANCELLED: XCircle,
};

/** Formats an ISO timestamp as a short, readable local date and time. */
function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The animated order-status timeline (SUBJECT.md: "animated order timelines").
 *
 * Renders the four forward stages — PENDING, PAID, SHIPPED, DELIVERED — with the
 * connecting rail filling up to whichever stage the order has reached, and each
 * completed stage carrying its real timestamp from the order's history.
 *
 * CANCELLED is handled separately rather than as a fifth stage, because it is an exit
 * from the flow, not a step along it. Showing it inline would imply an order passes
 * *through* cancellation on the way to delivery.
 */
export function OrderTimeline({ order }: { order: Order }) {
  const reduceMotion = useReducedMotion();

  const isCancelled = order.status === "CANCELLED";
  const currentIndex = ORDER_FLOW.indexOf(order.status);

  /** Look up when a stage happened, if it has. */
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
      {/* The rail, behind the markers. `left-4` centres it on the 8-unit markers, and
          `-z-0`/ordering keeps it underneath them. */}
      <div className="absolute bottom-4 left-4 top-4 w-px -translate-x-1/2 bg-line" />

      {/* The filled portion, animating up to the current stage. Height is a
          percentage of the gaps *between* markers, hence dividing by length - 1. */}
      <motion.div
        initial={{ height: 0 }}
        animate={{
          height: `${(Math.max(0, currentIndex) / (ORDER_FLOW.length - 1)) * 100}%`,
        }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
        className="absolute left-4 top-4 w-px -translate-x-1/2 bg-accent"
      />

      {ORDER_FLOW.map((status, index) => {
        const isComplete = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const Icon = STATUS_ICONS[status];
        const at = timestampFor(status);

        return (
          <li key={status} className="relative flex items-start gap-4">
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.35, delay: 0.15 + index * 0.12 }
              }
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-300",
                isComplete
                  ? "bg-accent text-accent-ink"
                  : "bg-surface-2 text-ink-faint ring-1 ring-line",
                // A soft halo marks where the order is *now*, so the eye finds the
                // current stage without reading every label.
                isCurrent && "ring-4 ring-accent/25",
              )}
            >
              <Icon className="size-4" />
            </motion.span>

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
