export const SHIPPING_FLAT_CENTS = 1499;
export const FREE_SHIPPING_THRESHOLD_CENTS = 50_000;

export function calculateShipping(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
}
