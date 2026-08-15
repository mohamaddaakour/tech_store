/**
 * A product as the API returns it — mirrors `ProductResponse` on the backend.
 *
 * These fields must stay in step with that Java record by hand: nothing generates
 * this file, so a rename on the server is a silent break here until something
 * renders `undefined`. (SUBJECT.md's Swagger/OpenAPI step is what eventually
 * removes that risk, by generating these types from the live schema.)
 */
export interface Product {
  id: number;
  name: string;
  description: string;
  /**
   * Price in integer cents — `149900` means $1,499.00.
   *
   * Always render it with `formatPrice()` from `lib/format`, never by hand. This
   * is the field most likely to be misread as dollars and shown 100x too high.
   */
  priceCents: number;
  stock: number;
  imageUrl: string;
  /**
   * Whether the item can be bought. Computed by the server, deliberately, so the
   * definition of "in stock" lives in one place rather than being re-derived as
   * `stock > 0` in every component that needs it.
   */
  inStock: boolean;
}
