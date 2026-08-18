import { useState } from "react";
import { Heart, Minus, Plus, Sparkles } from "../ui/icons";
import { toast } from "../../store/toastStore";
import type { Product } from "../../types/product";
import { useCartStore } from "../../store/cartStore";
import { useWishlistStore } from "../../store/wishlistStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";

export function PurchasePanel({ product }: { product: Product }) {
  const addToCart = useCartStore((state) => state.add);
  const setPanel = useUiStore((state) => state.setPanel);
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const isSaved = useWishlistStore((state) => state.ids.includes(product.id));

  const [quantity, setQuantity] = useState(1);

  function handleAddToCart() {
    for (let index = 0; index < quantity; index += 1) addToCart(product);

    toast.success(`${quantity} × ${product.name} added`);

    setPanel("cart");
  }

  function handleWishlist() {
    const nowSaved = toggleWishlist(product.id);
    toast.success(nowSaved ? "Saved to collection" : "Removed from collection");
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center rounded-control bg-surface-2 ring-1 ring-line">
          <button
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="grid size-10 place-items-center rounded-l-control text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>

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
