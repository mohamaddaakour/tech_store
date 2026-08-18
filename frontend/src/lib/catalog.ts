import type { Product } from "../types/product";

export function brandOf(product: Product): string {
  return product.brandName ?? "Unbranded";
}

export function categoryOf(product: Product): string {
  return product.categoryName ?? "Uncategorised";
}

export interface Spec {
  label: string;
  value: string;
}

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
    format: (match) => match[1].replace(/^./, (character) => character.toUpperCase()),
  },
];

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
