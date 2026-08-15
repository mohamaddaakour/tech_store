import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { useBrands, useCategories, useProductMeta, useProductSearch } from "../hooks/useProducts";
import { pluralize } from "../lib/format";
import { ProductGrid } from "../components/products/ProductGrid";
import { ProductGridSkeleton } from "../components/products/ProductGridSkeleton";
import { FilterPanel } from "../components/products/FilterPanel";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name: A–Z" },
  { value: "stock-desc", label: "Most in stock" },
] as const;

/**
 * The Store — browse the catalogue with search, filtering, sorting and pagination.
 *
 * ## Filtering now happens on the server
 *
 * This page used to download every product and narrow the list in JavaScript. It now sends the
 * filters to `GET /api/products` as query parameters and renders whatever page comes back. That is
 * the difference between a page that works with 14 products and one that works with 14,000.
 *
 * ## Filter state lives in the URL
 *
 * Every control writes to the query string via `useSearchParams`, never to `useState`. That buys a
 * shareable link for any filtered view, working Back/Forward through filter changes, and lets the
 * dashboard's brand strip deep-link here with `?brand=asus`.
 */
export default function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: meta } = useProductMeta();

  // ---- Read state out of the URL ----
  const query = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const categorySlug = searchParams.get("category") ?? "";
  const brandSlug = searchParams.get("brand") ?? "";
  const inStockOnly = searchParams.get("inStock") === "1";

  const priceCeilingCents = meta?.maxPriceCents ?? 200_000;
  const maxPriceParam = searchParams.get("maxPrice");
  const maxPriceCents = maxPriceParam ? Number(maxPriceParam) : priceCeilingCents;

  /**
   * The request. Only non-default values are sent, so the backend receives a clean query and each
   * distinct filter combination gets its own cache entry.
   *
   * `page - 1` because the URL is 1-based for humans while the API is 0-based.
   */
  const { data, isPending, isFetching, error, refetch } = useProductSearch({
    ...(query ? { search: query } : {}),
    ...(categorySlug ? { category: categorySlug } : {}),
    ...(brandSlug ? { brand: brandSlug } : {}),
    ...(maxPriceCents < priceCeilingCents ? { maxPrice: maxPriceCents } : {}),
    ...(inStockOnly ? { inStock: true } : {}),
    sort,
    page: page - 1,
    size: PAGE_SIZE,
  });

  /** Writes params, dropping any that are empty or at their default. */
  function updateParams(patch: Record<string, string | number | boolean | null>) {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "" || value === false || value === 0) next.delete(key);
      else next.set(key, String(value));
    }

    // Any filter change invalidates the page number — page 3 of the old result set is very likely
    // past the end of the new one.
    if (!("page" in patch)) next.delete("page");

    // `replace` so filter tweaks do not each add a history entry; one Back press should leave the
    // store, not undo twelve slider nudges.
    setSearchParams(next, { replace: true });
  }

  function resetFilters() {
    // Preserve the search term: clearing *filters* should not wipe what the user typed.
    setSearchParams(query ? { q: query } : {}, { replace: true });
  }

  const activeFilterCount =
    (brandSlug ? 1 : 0) +
    (categorySlug ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (maxPriceCents < priceCeilingCents ? 1 : 0);

  const totalPages = data?.totalPages ?? 1;

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
      values={{ brand: brandSlug, category: categorySlug, maxPriceCents, inStockOnly }}
      // Facets come from the API now, not from guessing at product names.
      brands={brands ?? []}
      categories={categories ?? []}
      priceCeilingCents={priceCeilingCents}
      activeCount={activeFilterCount}
      onChange={(patch) =>
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
        })
      }
      onReset={resetFilters}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Store</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isPending
              ? "Loading catalogue…"
              : `${pluralize(data?.totalElements ?? 0, "product")} available`}
          </p>
        </div>

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
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 rounded-card bg-surface p-4 ring-1 ring-line">
            {filterPanel}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <AnimatePresence>
            {showMobileFilters && (
              <motion.div
                // motion can animate `height: auto` because it measures the element; plain CSS
                // cannot transition to `auto`.
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

          {isPending ? (
            <div aria-busy="true" aria-label="Loading products">
              <ProductGridSkeleton count={PAGE_SIZE} />
            </div>
          ) : !data || data.content.length === 0 ? (
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
              {/* Dim slightly while a new page is in flight. `placeholderData` in the hook keeps the
                  old results visible, so this is the only cue that something is loading — better
                  than replacing the grid with skeletons on every page change. */}
              <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
                <ProductGrid products={data.content} />
              </div>

              {totalPages > 1 && (
                <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={data.first}
                    onClick={() => updateParams({ page: page - 1 })}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const pageNumber = index + 1;
                      const isCurrent = pageNumber === page;

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
                    disabled={data.last}
                    onClick={() => updateParams({ page: page + 1 })}
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
