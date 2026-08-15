import type { Product } from "../types/product";

/**
 * Derives brand, category and specifications from a product's text.
 *
 * ## Why this exists
 *
 * SUBJECT.md Phase 2 wants filtering by brand and by specs (CPU, GPU, RAM,
 * screen size, refresh rate, resolution). The backend currently has a single
 * flat `products` table — no `Brand`, `Category` or `ProductSpecification`
 * entities — and this task must not change it.
 *
 * So we infer those facets from `name` and `description`. It is a **stopgap, and
 * it is the weakest code in the frontend**: keyword matching cannot know that a
 * future "Aurora R16" is a Dell. It exists so the filter and spec-panel UI is
 * real and exercised rather than faked with hardcoded data.
 *
 * When the backend grows those entities, delete this file and read the fields
 * off the API. Everything here is confined to this module precisely so that is a
 * contained change.
 */

/** Ordered most-specific first: the first pattern to match wins. */
const BRAND_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(rog|strix|zephyrus|asus)\b/i, "ASUS"],
  [/\b(ultrasharp|alienware|xps|dell)\b/i, "Dell"],
  [/\b(mx master|mx keys|logitech)\b/i, "Logitech"],
  [/\b(thinkpad|ideapad|legion|lenovo)\b/i, "Lenovo"],
  [/\b(macbook|imac|apple|magic)\b/i, "Apple"],
  [/\b(galaxy|odyssey|samsung)\b/i, "Samsung"],
  [/\b(predator|nitro|acer)\b/i, "Acer"],
  [/\b(omen|spectre|pavilion|hp)\b/i, "HP"],
  [/\b(razer|blade)\b/i, "Razer"],
  [/\bmsi\b/i, "MSI"],
  [/\bkeychron\b/i, "Keychron"],
  [/\b(geforce|nvidia)\b/i, "NVIDIA"],
];

const CATEGORY_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(laptop|notebook|ultrabook|macbook|thinkpad)\b/i, "Laptops"],
  [/\b(monitor|display|ultrasharp|screen)\b/i, "Monitors"],
  [/\b(mouse|mice)\b/i, "Mice"],
  [/\b(keyboard|keys)\b/i, "Keyboards"],
  [/\b(headset|headphone|earbud|speaker|audio)\b/i, "Audio"],
  [/\b(gpu|graphics card|cpu|ryzen|motherboard|ssd|nvme|psu)\b/i, "Components"],
  [/\b(phone|smartphone|iphone|pixel)\b/i, "Phones"],
  [/\b(desktop|pc|tower|workstation)\b/i, "Desktops"],
];

/** Everything we search, lowercased once per call. */
function searchableText(product: Product): string {
  return `${product.name} ${product.description ?? ""}`;
}

/** Best-guess brand, or "Other" when nothing matches. */
export function getBrand(product: Product): string {
  const text = searchableText(product);
  return BRAND_PATTERNS.find(([pattern]) => pattern.test(text))?.[1] ?? "Other";
}

/** Best-guess category, or "Accessories" when nothing matches. */
export function getCategory(product: Product): string {
  const text = searchableText(product);
  return CATEGORY_PATTERNS.find(([pattern]) => pattern.test(text))?.[1] ?? "Accessories";
}

/** One row in the product page's animated specification panel. */
export interface Spec {
  label: string;
  value: string;
}

/**
 * Extractors for the spec panel, in display order.
 *
 * Each takes the first capture group of its regex and formats it. Returning
 * `null` means "not mentioned", and that spec is simply omitted rather than
 * shown as "Unknown" — a panel of blanks looks broken.
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
    format: (match) => match[1].replace(/^./, (c) => c.toUpperCase()),
  },
];

/**
 * Pulls whatever specifications the product text actually mentions.
 *
 * Always prepends brand and category so the panel is never empty, even for a
 * product whose description is a single sentence.
 */
export function extractSpecs(product: Product): Spec[] {
  const text = searchableText(product);

  const parsed = SPEC_EXTRACTORS.reduce<Spec[]>((specs, extractor) => {
    const match = text.match(extractor.pattern);
    if (match) specs.push({ label: extractor.label, value: extractor.format(match) });
    return specs;
  }, []);

  return [
    { label: "Brand", value: getBrand(product) },
    { label: "Category", value: getCategory(product) },
    ...parsed,
  ];
}

/** Unique brands present in a product list, alphabetised — for the filter panel. */
export function collectBrands(products: Product[]): string[] {
  return [...new Set(products.map(getBrand))].sort();
}

/** Unique categories present in a product list, alphabetised. */
export function collectCategories(products: Product[]): string[] {
  return [...new Set(products.map(getCategory))].sort();
}
