import type { CartLine } from "../../store/cartStore";
import { formatPrice } from "../../lib/format";
import { useCartStore } from "../../store/cartStore";

interface CartLineRowProps {
  line: CartLine;
}

export function CartLineRow({ line }: CartLineRowProps) {
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const remove = useCartStore((state) => state.remove);

  const { product, quantity } = line;

  const lineTotal = product.priceCents * quantity;

  const atStockLimit = quantity >= product.stock;

  return (
    <li className="flex gap-3 py-3 animate-fade-in">
      <img
        src={product.imageUrl}
        alt={product.name}
        className="size-14 shrink-0 rounded-control object-cover ring-1 ring-line"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-xs font-medium text-ink" title={product.name}>
          {product.name}
        </p>

        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-control bg-surface-2 ring-1 ring-line">
            <button
              onClick={() => decrement(product.id)}
              aria-label={`Decrease quantity of ${product.name}`}
              className="flex size-7 items-center justify-center rounded-l-control text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <span aria-hidden="true">−</span>
            </button>

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
