/**
 * Display formatting helpers.
 *
 * These live in one file so that money is rendered identically on the product
 * tile, in the cart drawer, and on the order summary. When three components each
 * format their own prices, they eventually disagree -- one shows "$1,499.00" and
 * another "$1499" -- and that looks like a bug to a customer.
 */

/**
 * Created once at module load, not per call.
 *
 * `Intl.NumberFormat` is surprisingly expensive to construct (it loads locale
 * data), and cheap to reuse. Building a new one inside a component that renders
 * 40 tiles is a genuine, measurable waste.
 */
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * Turns integer cents into a currency string: `149900` -> `"$1,499.00"`.
 *
 * The API sends cents because money must never be stored or transmitted as a
 * floating-point number -- `0.1 + 0.2 !== 0.3` in binary floating point, and
 * those errors accumulate into real money. Dividing by 100 at the very last
 * moment, purely for display, is the safe pattern: the value stays an exact
 * integer everywhere that arithmetic actually happens.
 */
export function formatPrice(cents: number): string {
  return usdFormatter.format(cents / 100);
}

/**
 * Pluralises a noun against a count: `pluralize(1, "item")` -> `"1 item"`,
 * `pluralize(3, "item")` -> `"3 items"`.
 *
 * Small, but it removes the "1 items" bug that always survives to production.
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
