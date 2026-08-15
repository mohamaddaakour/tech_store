/**
 * Delivery pricing, mirroring the server's rule in `OrderService`.
 *
 * These constants are duplicated between frontend and backend, and that duplication is deliberate but
 * one-directional: the values here exist only so the cart and checkout can *preview* the delivery
 * charge before an order exists. The server recalculates them when the order is placed and its
 * numbers are authoritative.
 *
 * If they ever disagree, the server wins and the customer sees the correct total on their order — the
 * preview is simply wrong until someone fixes the constant. (The proper fix, once there is a reason
 * to change these, is an endpoint that returns the shipping rule so there is one source of truth.)
 */
export const SHIPPING_FLAT_CENTS = 1499;
export const FREE_SHIPPING_THRESHOLD_CENTS = 50_000;

export function calculateShipping(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
}
