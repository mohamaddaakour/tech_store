import { X } from "lucide-react";
import type { Facet } from "../../types/product";
import { formatPrice } from "../../lib/format";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";

export interface FilterValues {
  /** Brand **slug**, not name — the API filters by slug and slugs are URL-safe. */
  brand: string;
  category: string;
  maxPriceCents: number;
  inStockOnly: boolean;
}

interface FilterPanelProps {
  values: FilterValues;
  brands: Facet[];
  categories: Facet[];
  /** Highest price in the catalogue, from `/api/products/meta`. */
  priceCeilingCents: number;
  activeCount: number;
  onChange: (patch: Partial<FilterValues>) => void;
  onReset: () => void;
}

/**
 * The catalogue filter sidebar.
 *
 * A controlled component: it holds no state of its own but renders `values` and reports changes
 * upward. The Store page keeps the real state in the URL, which is what makes a filtered view
 * shareable. If this component owned the state too, the two copies would drift.
 *
 * Facets now arrive from the API with real product counts, so a shopper can see there is no point
 * filtering to a brand with nothing in it.
 */
export function FilterPanel({
  values,
  brands,
  categories,
  priceCeilingCents,
  activeCount,
  onChange,
  onReset,
}: FilterPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink">Filters</h2>
        {/* Appears only when there is something to reset — a permanent "Clear all" on an
            unfiltered list is dead weight. */}
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="size-3.5" />
            Clear {activeCount}
          </Button>
        )}
      </div>

      <FilterGroup label="Category">
        <FacetChips
          facets={categories}
          selectedSlug={values.category}
          onSelect={(category) => onChange({ category })}
        />
      </FilterGroup>

      <FilterGroup label="Brand">
        <FacetChips
          facets={brands}
          selectedSlug={values.brand}
          onSelect={(brand) => onChange({ brand })}
        />
      </FilterGroup>

      <FilterGroup label="Max price">
        <div className="flex flex-col gap-2">
          <input
            type="range"
            min={0}
            max={priceCeilingCents}
            // Step in whole dollars; cent precision on a price slider is meaningless to a shopper.
            step={100}
            value={values.maxPriceCents}
            onChange={(event) => onChange({ maxPriceCents: Number(event.target.value) })}
            aria-label="Maximum price"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-accent"
          />
          <div className="flex justify-between text-[11px] tabular-nums text-ink-faint">
            <span>{formatPrice(0)}</span>
            <span className="font-semibold text-accent">{formatPrice(values.maxPriceCents)}</span>
          </div>
        </div>
      </FilterGroup>

      <FilterGroup label="Availability">
        {/* A real checkbox wrapped in a label, so clicking the text toggles it and screen readers
            announce the checked state. A styled div listening for clicks gets neither. */}
        <label className="flex cursor-pointer items-center gap-2.5 text-xs text-ink-muted">
          <input
            type="checkbox"
            checked={values.inStockOnly}
            onChange={(event) => onChange({ inStockOnly: event.target.checked })}
            className="size-4 rounded border-line-strong bg-surface-2 accent-accent"
          />
          In stock only
        </label>
      </FilterGroup>
    </div>
  );
}

/** A labelled section. Extracted only to keep the spacing consistent. */
function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">{label}</h3>
      {children}
    </div>
  );
}

/**
 * A row of single-select chips with an "All" option.
 *
 * Chips rather than a `<select>` because every option and its count is visible at a glance, and
 * selecting is one tap. A dropdown would hide five choices behind an extra interaction.
 *
 * The chip displays the facet **name** but reports its **slug**, which is what the API filters on.
 */
function FacetChips({
  facets,
  selectedSlug,
  onSelect,
}: {
  facets: Facet[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {/* "" is the sentinel for "no filter", which keeps the URL clean (no `?brand=All`). */}
      <FacetChip label="All" isSelected={selectedSlug === ""} onClick={() => onSelect("")} />

      {facets.map((facet) => (
        <FacetChip
          key={facet.slug}
          label={facet.name}
          count={facet.productCount}
          isSelected={selectedSlug === facet.slug}
          onClick={() => onSelect(facet.slug)}
        />
      ))}
    </div>
  );
}

function FacetChip({
  label,
  count,
  isSelected,
  onClick,
}: {
  label: string;
  count?: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-150",
        isSelected
          ? "bg-accent text-accent-ink"
          : "bg-surface-2 text-ink-muted ring-1 ring-line hover:bg-surface-3 hover:text-ink",
      )}
    >
      {label}
      {count !== undefined && (
        <span className={isSelected ? "opacity-70" : "text-ink-faint"}>{count}</span>
      )}
    </button>
  );
}
