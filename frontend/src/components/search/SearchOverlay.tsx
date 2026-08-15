import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CornerDownLeft, Search } from "lucide-react";
import { useUiStore } from "../../store/uiStore";
import { useProducts } from "../../hooks/useProducts";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { getBrand, getCategory } from "../../lib/catalog";
import { formatPrice } from "../../lib/format";
import { cn } from "../../lib/cn";

/** Cap the result list so the overlay never becomes a scrolling wall. */
const MAX_RESULTS = 6;

/**
 * The command-palette search overlay (Ctrl/Cmd + K).
 *
 * This outer component does one thing: decide whether the panel exists. All the state
 * lives in {@link SearchPanel}, which is **mounted only while open**.
 *
 * That split is deliberate and it is what keeps this component effect-free. If the
 * panel were always mounted and merely hidden, its `query` and selection would persist
 * between openings, and resetting them would need a `useEffect` that calls `setState`
 * on open — the cascading-render pattern React explicitly warns about. Letting the
 * component unmount means fresh `useState` initial values do the reset for free.
 */
export function SearchOverlay() {
  const isOpen = useUiStore((state) => state.openPanel === "search");
  const closePanel = useUiStore((state) => state.closePanel);

  return (
    // AnimatePresence keeps the panel in the tree until its exit animation finishes,
    // which is what lets it animate out rather than vanishing.
    <AnimatePresence>{isOpen && <SearchPanel onClose={closePanel} />}</AnimatePresence>
  );
}

/**
 * The panel itself. Fully keyboard-driven: arrows move the selection, Enter opens,
 * Escape closes. A search overlay you must reach for the mouse inside is a failed
 * search overlay.
 *
 * Searching runs client-side over the already-cached product list. That fits the
 * current backend, which has no search endpoint — and for a modest catalogue it beats a
 * network round trip per keystroke, since results appear with zero latency. SUBJECT.md
 * Phase 2's server-side search would replace the `results` memo with a debounced query.
 */
function SearchPanel({ onClose }: { onClose: () => void }) {
  const { data: products } = useProducts();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [query, setQuery] = useState("");
  /** Which result the keyboard has highlighted. */
  const [activeIndex, setActiveIndex] = useState(0);

  // The panel only exists while open, so these are unconditionally active.
  useEscapeKey(true, onClose);
  useBodyScrollLock(true);

  /**
   * Matches the query against name, description, brand and category.
   *
   * `useMemo` because this runs on every keystroke; without it, typing would re-filter
   * the whole catalogue several times per character.
   */
  const results = useMemo(() => {
    if (!products) return [];

    const term = query.trim().toLowerCase();
    // An empty query shows a few products rather than nothing, so the overlay is
    // useful the instant it opens.
    if (!term) return products.slice(0, MAX_RESULTS);

    return products
      .filter((product) =>
        [product.name, product.description, getBrand(product), getCategory(product)]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
      .slice(0, MAX_RESULTS);
  }, [products, query]);

  /**
   * Clamped during render rather than corrected in an effect.
   *
   * As you type, the result count shrinks and `activeIndex` can end up past the end.
   * Deriving the safe index means the highlight is always valid on the very render
   * where the list changed — an effect would leave one frame pointing out of bounds.
   */
  const safeIndex = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  function openResult(productId: number) {
    onClose();
    navigate(`/product/${productId}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      // Stop the caret jumping to the end of the input.
      event.preventDefault();
      // Modulo wraps from the last result back to the first.
      setActiveIndex((safeIndex + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      // Adding `length` before the modulo keeps the result positive when wrapping
      // backwards from index 0.
      setActiveIndex((safeIndex - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      openResult(results[safeIndex].id);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
        initial={{ opacity: 0, y: -18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -18, scale: 0.97 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
        className="relative w-full max-w-xl overflow-hidden rounded-panel glass shadow-2xl"
      >
        {/* ---- Input ---- */}
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search products, brands, categories…"
            // The plain HTML attribute is enough because this element mounts fresh
            // every time the overlay opens — no focus-stealing effect required.
            autoFocus
            // Native outline removed because the whole panel is the focus affordance
            // here; there is nowhere else for focus to be.
            className="h-14 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="hidden rounded border border-line-strong bg-surface px-1.5 py-0.5 text-[10px] text-ink-faint sm:inline">
            Esc
          </kbd>
        </div>

        {/* ---- Results ---- */}
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
                  // Hovering syncs the keyboard highlight to the mouse, so the two
                  // input methods never disagree about what is selected.
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
                      {getBrand(product)} · {getCategory(product)}
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
      </motion.div>
    </div>
  );
}
