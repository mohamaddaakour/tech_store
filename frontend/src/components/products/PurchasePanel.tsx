import { useState } from "react";
import { Heart, Minus, Plus, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import type { Product } from "../../types/product";
import { useCartStore } from "../../store/cartStore";
import { useWishlistStore } from "../../store/wishlistStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";

/**
 * The buy controls on the product page: quantity stepper, add to cart, save, ask.
 *
 * ## Why this is its own component
 *
 * It owns `quantity`, which must reset to 1 when the user navigates from one product to
 * another. The tempting fix is a `useEffect` watching the product id that calls
 * `setQuantity(1)` — but setting state from an effect triggers a second render pass and
 * is the pattern React's docs (and the `react-hooks/set-state-in-effect` lint rule)
 * steer you away from.
 *
 * Instead, the product page renders this with `key={product.id}`. Changing a key makes
 * React unmount and remount the component, so `useState(1)` runs again and the reset is
 * free — no effect, no extra render, and nothing to keep in sync.
 */
export function PurchasePanel({ product }: { product: Product }) {
  const addToCart = useCartStore((state) => state.add);
  const setPanel = useUiStore((state) => state.setPanel);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  // Subscribing to the boolean rather than the array keeps this from re-rendering when
  // an unrelated product is saved.
  const isSaved = useWishlistStore((state) => state.ids.includes(product.id));

  const [quantity, setQuantity] = useState(1);

  function handleAddToCart() {
    // The store's `add` increments by one, so call it once per unit chosen.
    for (let index = 0; index < quantity; index += 1) addToCart(product);

    toast.success(`${quantity} × ${product.name} added`, { duration: 3000 });
    // Open the cart so the user sees the result of their action rather than having to
    // go looking for it.
    setPanel("cart");
  }

  function handleWishlist() {
    const nowSaved = toggleWishlist(product.id);
    toast(nowSaved ? "Saved to collection" : "Removed from collection", {
      icon: nowSaved ? "❤️" : "💔",
    });
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex items-center gap-3">
        {/* Quantity stepper, clamped to available stock at both ends. */}
        <div className="inline-flex items-center rounded-control bg-surface-2 ring-1 ring-line">
          <button
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="grid size-10 place-items-center rounded-l-control text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>

          {/* `aria-live="polite"` makes a screen reader read the new number after a
              change, without interrupting whatever it is currently saying. */}
          <span
            aria-live="polite"
            className="w-10 text-center text-sm font-semibold tabular-nums text-ink"
          >
            {quantity}
          </span>

          <button
            onClick={() => setQuantity((current) => Math.min(product.stock, current + 1))}
            disabled={quantity >= product.stock}
            aria-label="Increase quantity"
            className="grid size-10 place-items-center rounded-r-control text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <Button size="lg" disabled={!product.inStock} onClick={handleAddToCart} className="flex-1">
          {product.inStock ? `Add ${quantity} to cart` : "Sold out"}
        </Button>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" fullWidth onClick={handleWishlist}>
          {/* `fill-current` turns the outline heart solid when saved — a much stronger
              signal than a colour change alone. */}
          <Heart className={cn("size-4", isSaved && "fill-current text-danger")} />
          {isSaved ? "Saved" : "Save"}
        </Button>

        <Button variant="secondary" fullWidth onClick={() => setPanel("assistant")}>
          <Sparkles className="size-4" />
          Ask about this
        </Button>
      </div>
    </div>
  );
}
