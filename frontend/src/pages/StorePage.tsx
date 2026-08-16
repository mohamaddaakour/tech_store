import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "../components/ui/icons";
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

export default function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: meta } = useProductMeta();

  const query = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const categorySlug = searchParams.get("category") ?? "";
  const brandSlug = searchParams.get("brand") ?? "";
  const inStockOnly = searchParams.get("inStock") === "1";

  const priceCeilingCents = meta?.maxPriceCents ?? 200_000;
  const maxPriceParam = searchParams.get("maxPrice");
  const maxPriceCents = maxPriceParam ? Number(maxPriceParam) : priceCeilingCents;

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

  function updateParams(patch: Record<string, string | number | boolean | null>) {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "" || value === false || value === 0) next.delete(key);
      else next.set(key, String(value));
    }

    if (!("page" in patch)) next.delete("page");

    setSearchParams(next, { replace: true });
  }

  function resetFilters() {
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
          <div
            style={{ gridTemplateRows: showMobileFilters ? "1fr" : "0fr" }}
            className="mb-4 grid transition-[grid-template-rows] duration-300 ease-out lg:hidden"
          >
            <div className="overflow-hidden">
              <div className="rounded-card bg-surface p-4 ring-1 ring-line">{filterPanel}</div>
            </div>
          </div>

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
