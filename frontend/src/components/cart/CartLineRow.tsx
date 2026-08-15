import type { CartLine } from "../../store/cartStore";
import { formatPrice } from "../../lib/format";
import { useCartStore } from "../../store/cartStore";

interface CartLineRowProps {
  line: CartLine;
}

/**
 * One row in the cart drawer: thumbnail, name, quantity stepper, line total.
 *
 * Split out of `CartDrawer` because the drawer was becoming a component that both
 * laid out a panel *and* knew how quantity editing works. Separating them means this
 * row can be reused unchanged on the Phase 4 checkout summary.
 */
export function CartLineRow({ line }: CartLineRowProps) {
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const remove = useCartStore((state) => state.remove);

  const { product, quantity } = line;

  /** The total for this row, not the unit price — quantity × unit. */
  const lineTotal = product.priceCents * quantity;

  // The store already refuses to go past stock; reflecting it here disables the
  // button so the user is not clicking something that silently does nothing.
  const atStockLimit = quantity >= product.stock;

  return (
    <li className="flex gap-3 py-3 animate-fade-in">
      <img
        src={product.imageUrl}
        alt={product.name}
        className="size-14 shrink-0 rounded-control object-cover ring-1 ring-line"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* `min-w-0` on the flex parent plus `truncate` here is what actually clips a
            long product name. Without `min-w-0` a flex child refuses to shrink below
            its content width, and the text overflows the drawer instead. */}
        <p className="truncate text-xs font-medium text-ink" title={product.name}>
          {product.name}
        </p>

        <div className="flex items-center justify-between gap-2">
          {/* ---- Quantity stepper ---- */}
          <div className="inline-flex items-center rounded-control bg-surface-2 ring-1 ring-line">
            <button
              onClick={() => decrement(product.id)}
              aria-label={`Decrease quantity of ${product.name}`}
              className="flex size-7 items-center justify-center rounded-l-control text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <span aria-hidden="true">−</span>
            </button>

            {/* `aria-live="polite"` makes a screen reader read the new number after a
                change, without interrupting whatever it is currently saying. */}
            <span
              aria-live="polite"
              className="w-8 text-center text-xs font-semibold tabular-nums text-ink"
            >
              {quantity}
            </span>

            <button
              onClick={() => increment(product.id)}
              disabled={atStockLimit}
              aria-label={`Increase quantity of ${product.name}`}
              className="flex size-7 items-center justify-center rounded-r-control text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>

          <span className="text-xs font-semibold tabular-nums text-ink">
            {formatPrice(lineTotal)}
          </span>
        </div>

        {atStockLimit && (
          <p className="text-[10px] text-ink-faint">Only {product.stock} in stock</p>
        )}
      </div>

      <button
        onClick={() => remove(product.id)}
        aria-label={`Remove ${product.name} from cart`}
        className="self-start text-ink-faint transition-colors hover:text-danger"
      >
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}
