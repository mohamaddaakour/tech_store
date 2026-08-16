import type { OrderStatus } from "../../types/order";
import { STATUS_LABELS, STATUS_TONES } from "../../lib/orderStatus";
import { Badge } from "../ui/Badge";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}
