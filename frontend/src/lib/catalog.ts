import type { Product } from "../types/product";

/**
 * Product display helpers.
 *
 * **This file used to guess brand and category from a product's text with keyword regexes.** That
 * stopgap is gone: the backend now has real `Category` and `Brand` entities, and every product
 * carries `brandName` / `categorySlug` straight from the database. Guessing could never know which
 * manufacturer an unfamiliar model name belonged to; this cannot be wrong.
 *
 * What remains is a fallback for the nullable columns, plus specification parsing — the one thing
 * still derived, because there is no `ProductSpecification` entity yet (SUBJECT.md Phase 2 lists it;
 * it needs its own table and admin UI).
 */

/** The brand name, or a placeholder when the product has none. */
export function brandOf(product: Product): string {
  return product.brandName ?? "Unbranded";
}

/** The category name, or a placeholder when the product is uncategorised. */
export function categoryOf(product: Product): string {
  return product.categoryName ?? "Uncategorised";
}

/** One row in the product page's animated specification panel. */
export interface Spec {
  label: string;
  value: string;
}

/**
 * Extractors for the spec panel, in display order.
 *
 * Each pulls a capture group from the product's description and formats it. Returning nothing means
 * "not mentioned", and that spec is omitted rather than shown as "Unknown" — a panel full of blanks
 * looks broken.
 *
 * This is genuinely derived data and will stay approximate until specs are first-class columns. It
 * is confined to this file so that migration is contained.
 */
const SPEC_EXTRACTORS: ReadonlyArray<{
  label: string;
  pattern: RegExp;
  format: (match: RegExpMatchArray) => string;
}> = [
  {
    label: "Display",
    pattern: /(\d{2}(?:\.\d)?)\s*["”]/,
    format: (match) => `${match[1]}-inch`,
  },
  {
    label: "Graphics",
    pattern: /\b(RTX|GTX|RX)\s?(\d{4})\b/i,
    format: (match) => `${match[1].toUpperCase()} ${match[2]}`,
  },
  {
    label: "Memory",
    // The negative lookahead stops "512GB SSD" being reported as 512GB of RAM.
    pattern: /\b(\d{1,3})\s?GB\b(?!\s?(?:SSD|NVMe))/i,
    format: (match) => `${match[1]}GB RAM`,
  },
  {
    label: "Storage",
    pattern: /\b(\d{1,2}\s?TB|\d{3,4}\s?GB)\s?(?:SSD|NVMe)\b/i,
    format: (match) => match[1].replace(/\s+/g, ""),
  },
  {
    label: "Refresh rate",
    pattern: /\b(\d{2,3})\s?Hz\b/i,
    format: (match) => `${match[1]}Hz`,
  },
  {
    label: "Resolution",
    pattern: /\b(4K|8K|UHD|QHD|WQHD|1440p|1080p)\b/i,
    format: (match) => match[1].toUpperCase(),
  },
  {
    label: "Connectivity",
    pattern: /\b(wireless|bluetooth|wi-?fi\s?\d?|usb-c|thunderbolt)\b/i,
    format: (match) => match[1].replace(/^./, (character) => character.toUpperCase()),
  },
];

/**
 * Builds the specification list.
 *
 * Brand and category come first and are always present — they are real data now, so the panel is
 * never empty even for a product with a one-line description.
 */
export function extractSpecs(product: Product): Spec[] {
  const text = `${product.name} ${product.description ?? ""}`;

  const parsed = SPEC_EXTRACTORS.reduce<Spec[]>((specs, extractor) => {
    const match = text.match(extractor.pattern);
    if (match) specs.push({ label: extractor.label, value: extractor.format(match) });
    return specs;
  }, []);

  return [
    { label: "Brand", value: brandOf(product) },
    { label: "Category", value: categoryOf(product) },
    ...parsed,
  ];
}
