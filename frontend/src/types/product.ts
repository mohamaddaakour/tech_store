/**
 * A product as the API returns it — mirrors the backend's `ProductResponse` record.
 *
 * Brand and category are now **real fields from the database**, not guessed from the product's
 * text. The old `lib/catalog.ts` keyword matching is gone, along with its inability to know that
 * an unfamiliar model name belongs to a particular manufacturer.
 */
export interface Product {
  id: number;
  name: string;
  description: string;
  /**
   * Price in integer cents — `149900` means $1,499.00.
   *
   * Always render with `formatPrice()` from `lib/format`, never by hand. This is the field most
   * likely to be misread as dollars and shown 100× too high.
   */
  priceCents: number;
  stock: number;
  imageUrl: string;
  /** Computed server-side, so "in stock" is defined in exactly one place. */
  inStock: boolean;

  /**
   * Nullable because the database columns are: deleting a category is `ON DELETE SET NULL`, so its
   * products become uncategorised rather than being destroyed.
   */
  categoryName: string | null;
  categorySlug: string | null;
  brandName: string | null;
  brandSlug: string | null;

  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** A filter facet — mirrors `CategoryResponse` / `BrandResponse`. */
export interface Facet {
  id: number;
  name: string;
  slug: string;
  /** How many products carry it, so the filter panel can show counts. */
  productCount: number;
}

/**
 * The backend's `PageResponse<T>` envelope.
 *
 * Deliberately a small, stable shape rather than Spring's sprawling `Page` JSON — see the Java
 * record for why. `totalPages` is supplied so the client never has to divide and round.
 */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** Query parameters accepted by `GET /api/products`. */
export interface ProductQuery {
  search?: string;
  category?: string;
  brand?: string;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
  page?: number;
  size?: number;
}
