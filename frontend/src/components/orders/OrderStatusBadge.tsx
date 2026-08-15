import type { OrderStatus } from "../../types/order";
import { STATUS_LABELS, STATUS_TONES } from "../../lib/orderStatus";
import { Badge } from "../ui/Badge";

/**
 * An order status as a coloured pill.
 *
 * The label and tone maps live in `lib/orderStatus.ts` rather than here, so this module
 * exports only a component — which is what keeps Vite's fast refresh working on it.
 */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}
