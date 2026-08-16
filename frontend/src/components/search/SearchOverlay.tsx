import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, Search } from "../ui/icons";
import { useUiStore } from "../../store/uiStore";
import { useAllProducts } from "../../hooks/useProducts";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { brandOf, categoryOf } from "../../lib/catalog";
import { formatPrice } from "../../lib/format";
import { cn } from "../../lib/cn";

const MAX_RESULTS = 6;

export function SearchOverlay() {
  const isOpen = useUiStore((state) => state.openPanel === "search");
  const closePanel = useUiStore((state) => state.closePanel);

  return isOpen ? <SearchPanel onClose={closePanel} /> : null;
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const { data: products } = useAllProducts();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");

  const [activeIndex, setActiveIndex] = useState(0);

  useEscapeKey(true, onClose);
  useBodyScrollLock(true);

  const results = useMemo(() => {
    if (!products) return [];

    const term = query.trim().toLowerCase();

    if (!term) return products.slice(0, MAX_RESULTS);

    return products
      .filter((product) =>
        [product.name, product.description, brandOf(product), categoryOf(product)]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
      .slice(0, MAX_RESULTS);
  }, [products, query]);

  const safeIndex = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  function openResult(productId: number) {
    onClose();
    navigate(`/product/${productId}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setActiveIndex((safeIndex + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveIndex((safeIndex - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      openResult(results[safeIndex].id);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
        className="animate-rise relative w-full max-w-xl overflow-hidden rounded-panel glass shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search products, brands, categories…"

            autoFocus

            className="h-14 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="hidden rounded border border-line-strong bg-surface px-1.5 py-0.5 text-[10px] text-ink-faint sm:inline">
            Esc
          </kbd>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">
            Nothing matches “{query}”.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto p-2">
            {results.map((product, index) => (
              <li key={product.id}>
                <button
                  onClick={() => openResult(product.id)}

                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-control p-2 text-left transition-colors",
                    index === safeIndex ? "bg-surface-2" : "hover:bg-surface-2",
                  )}
                >
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="size-10 shrink-0 rounded-md object-cover ring-1 ring-line"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {product.name}
                    </span>
                    <span className="block truncate text-[11px] text-ink-faint">
                      {brandOf(product)} · {categoryOf(product)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                    {formatPrice(product.priceCents)}
                  </span>
                  {index === safeIndex && (
                    <CornerDownLeft className="size-3.5 shrink-0 text-ink-faint" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[10px] text-ink-faint">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
