import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { useProducts } from "../hooks/useProducts";
import { collectBrands, collectCategories, getBrand, getCategory } from "../lib/catalog";
import { pluralize } from "../lib/format";
import { ProductGrid } from "../components/products/ProductGrid";
import { ProductGridSkeleton } from "../components/products/ProductGridSkeleton";
import { FilterPanel } from "../components/products/FilterPanel";
import type { FilterValues } from "../components/products/FilterPanel";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";

/** Products per page. */
const PAGE_SIZE = 8;

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name: A–Z" },
  { value: "stock-desc", label: "Most in stock" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/**
 * The Store — browse the whole catalogue with search, filtering, sorting and
 * pagination (SUBJECT.md Phase 2).
 *
 * ## Filter state lives in the URL
 *
 * Every control writes to the query string via `useSearchParams`, not to `useState`.
 * That buys three things for free:
 *
 * - a filtered view is a shareable link
 * - Back and Forward step through filter changes as you would expect
 * - `BrandStrip` on the dashboard can deep-link here with `?brand=ASUS`
 *
 * ## Filtering is client-side
 *
 * The backend exposes only `GET /api/products` — no query parameters — and this task
 * must not change it. So the full list is fetched once, cached by TanStack Query, and
 * narrowed in memory. That is genuinely the right call at this catalogue size
 * (results are instant, no request per keystroke), and it is the piece that must
 * change first as the catalogue grows: the `filtered` memo below becomes query
 * parameters, and `paginated` becomes a `Page<Product>` response.
 */
export default function StorePage() {
  const { data: products, isPending, error, refetch, isFetching } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // ---- Read state out of the URL ----
  const query = searchParams.get("q") ?? "";
  const sort = (searchParams.get("sort") as SortValue | null) ?? "featured";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));

  /** The highest price in the catalogue — the slider's ceiling and its default. */
  const priceCeilingCents = useMemo(() => {
    if (!products?.length) return 500_000;
    // Rounded up to the next $100 so the slider maximum is a clean number.
    return Math.ceil(Math.max(...products.map((p) => p.priceCents)) / 10_000) * 10_000;
  }, [products]);

  const filters: FilterValues = {
    brand: searchParams.get("brand") ?? "",
    category: searchParams.get("category") ?? "",
    maxPriceCents: Number(searchParams.get("maxPrice") ?? priceCeilingCents),
    inStockOnly: searchParams.get("inStock") === "1",
  };

  /**
   * Writes params, dropping any that are empty or at their default.
   *
   * Keeping defaults out of the URL is what stops it turning into
   * `?q=&brand=&category=&maxPrice=189900&inStock=` after one interaction.
   */
  function updateParams(patch: Record<string, string | number | boolean | null>) {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(patch)) {
      const isEmpty =
        value === null || value === "" || value === false || value === 0;

      if (isEmpty) next.delete(key);
      else next.set(key, String(value));
    }

    // Any filter change invalidates the current page number — page 3 of the old
    // result set is very likely past the end of the new one.
    if (!("page" in patch)) next.delete("page");

    // `replace` so filter tweaks do not each add a history entry; one Back press
    // should leave the store, not undo twelve slider nudges.
    setSearchParams(next, { replace: true });
  }

  function handleFilterChange(patch: Partial<FilterValues>) {
    updateParams({
      ...("brand" in patch ? { brand: patch.brand ?? null } : {}),
      ...("category" in patch ? { category: patch.category ?? null } : {}),
      ...("inStockOnly" in patch ? { inStock: patch.inStockOnly ? "1" : null } : {}),
      ...("maxPriceCents" in patch
        ? {
            // Omit the price when it is at the ceiling: that is not a filter.
            maxPrice:
              patch.maxPriceCents === priceCeilingCents ? null : (patch.maxPriceCents ?? null),
          }
        : {}),
    });
  }

  function resetFilters() {
    // Preserve the search term: clearing *filters* should not also wipe what the
    // user typed.
    setSearchParams(query ? { q: query } : {}, { replace: true });
  }

  /** How many filters are actually narrowing the list — drives the "Clear N" button. */
  const activeFilterCount =
    (filters.brand ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.maxPriceCents < priceCeilingCents ? 1 : 0);

  const brands = useMemo(() => (products ? collectBrands(products) : []), [products]);
  const categories = useMemo(() => (products ? collectCategories(products) : []), [products]);

  /**
   * Filter, then sort.
   *
   * One `useMemo` over both so the work happens once per relevant change rather than
   * on every unrelated re-render (opening the cart drawer, for instance).
   */
  const filtered = useMemo(() => {
    if (!products) return [];

    const term = query.trim().toLowerCase();

    const matches = products.filter((product) => {
      if (filters.brand && getBrand(product) !== filters.brand) return false;
      if (filters.category && getCategory(product) !== filters.category) return false;
      if (product.priceCents > filters.maxPriceCents) return false;
      if (filters.inStockOnly && !product.inStock) return false;

      if (term) {
        const haystack = `${product.name} ${product.description} ${getBrand(product)}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });

    // Sort a COPY: `sort` mutates in place, and mutating the array TanStack Query
    // holds in its cache would corrupt it for every other component.
    switch (sort) {
      case "price-asc":
        return [...matches].sort((a, b) => a.priceCents - b.priceCents);
      case "price-desc":
        return [...matches].sort((a, b) => b.priceCents - a.priceCents);
      case "name-asc":
        // `localeCompare` rather than `<`, so accented names sort correctly.
        return [...matches].sort((a, b) => a.name.localeCompare(b.name));
      case "stock-desc":
        return [...matches].sort((a, b) => b.stock - a.stock);
      default:
        return matches;
    }
  }, [products, query, sort, filters.brand, filters.category, filters.maxPriceCents, filters.inStockOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamp: a stale `?page=9` in the URL must not render a blank grid.
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ---- Error ----
  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Could not load the catalogue"
        message={getErrorMessage(error)}
        action={
          <Button variant="secondary" size="sm" loading={isFetching} onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const filterPanel = (
    <FilterPanel
      values={filters}
      brands={brands}
      categories={categories}
      priceCeilingCents={priceCeilingCents}
      activeCount={activeFilterCount}
      onChange={handleFilterChange}
      onReset={resetFilters}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Store</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isPending
              ? "Loading catalogue…"
              : `${pluralize(filtered.length, "product")} available`}
          </p>
        </div>

        {/* ---- Search + sort ---- */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(event) => updateParams({ q: event.target.value })}
              placeholder="Search this catalogue…"
              className="h-10 w-full rounded-control bg-surface-2 pl-9 pr-3 text-sm text-ink ring-1 ring-line outline-none transition-shadow placeholder:text-ink-faint focus:ring-2 focus:ring-accent"
            />
          </div>

          <select
            value={sort}
            onChange={(event) => updateParams({ sort: event.target.value })}
            aria-label="Sort products"
            className="h-10 rounded-control bg-surface-2 px-3 text-sm text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Filters collapse behind a button below `lg`, where a permanent sidebar
              would leave no room for the grid. */}
          <Button
            variant="secondary"
            onClick={() => setShowMobileFilters((open) => !open)}
            className="lg:hidden"
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="grid size-4.5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-ink">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* ---- Desktop sidebar ---- */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 rounded-card bg-surface p-4 ring-1 ring-line">
            {filterPanel}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* ---- Mobile filter drawer ---- */}
          <AnimatePresence>
            {showMobileFilters && (
              <motion.div
                // Animating `height: auto` works in motion because it measures the
                // element; plain CSS cannot transition to `auto`.
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                className="mb-4 overflow-hidden lg:hidden"
              >
                <div className="rounded-card bg-surface p-4 ring-1 ring-line">{filterPanel}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---- Results ---- */}
          {isPending ? (
            <div aria-busy="true" aria-label="Loading products">
              <ProductGridSkeleton count={PAGE_SIZE} />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No products match"
              message={
                query
                  ? `Nothing matches “${query}” with the current filters.`
                  : "Try widening or clearing your filters."
              }
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <ProductGrid products={paginated} />

              {/* ---- Pagination ----
                  Hidden entirely on a single page: a disabled "1 of 1" pager is
                  just noise. */}
              {totalPages > 1 && (
                <nav
                  aria-label="Pagination"
                  className="mt-8 flex items-center justify-center gap-2"
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => updateParams({ page: currentPage - 1 })}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const pageNumber = index + 1;
                      const isCurrent = pageNumber === currentPage;

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => updateParams({ page: pageNumber })}
                          aria-current={isCurrent ? "page" : undefined}
                          className={
                            isCurrent
                              ? "grid size-8 place-items-center rounded-control bg-accent text-xs font-bold text-accent-ink"
                              : "grid size-8 place-items-center rounded-control bg-surface-2 text-xs font-medium text-ink-muted ring-1 ring-line transition-colors hover:bg-surface-3 hover:text-ink"
                          }
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => updateParams({ page: currentPage + 1 })}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
