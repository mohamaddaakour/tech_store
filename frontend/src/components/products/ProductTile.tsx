import { Link } from "react-router-dom";
import { Heart, Plus } from "../ui/icons";
import { toast } from "../../store/toastStore";
import type { Product } from "../../types/product";
import { formatPrice } from "../../lib/format";
import { brandOf } from "../../lib/catalog";
import { useCartStore } from "../../store/cartStore";
import { useWishlistStore } from "../../store/wishlistStore";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/cn";

interface ProductTileProps {
  product: Product;

  index?: number;

  fixedWidth?: boolean;
}

export function ProductTile({ product, index = 0, fixedWidth = false }: ProductTileProps) {
  const addToCart = useCartStore((state) => state.add);
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const isSaved = useWishlistStore((state) => state.ids.includes(product.id));

  function handleQuickAdd(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    addToCart(product);
    toast.success(`${product.name} added to cart`);
  }

  function handleWishlist(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const nowSaved = toggleWishlist(product.id);
    toast.success(nowSaved ? `Saved ${product.name}` : `Removed ${product.name}`);
  }

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
      className={cn(
        "animate-rise transition-transform duration-300 hover:-translate-y-1.5",
        fixedWidth && "w-[240px] shrink-0 sm:w-[264px]",
      )}
    >
      <Link
        to={`/product/${product.id}`}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-tile bg-surface",
          "ring-1 ring-line transition-shadow duration-300",
          "hover:glow-accent focus-visible:glow-accent",
        )}
      >
        <div className="relative aspect-4/3 overflow-hidden bg-surface-2">
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-focus-within:scale-110"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-scan group-focus-within:animate-scan" />
          </div>

          <div className="absolute right-2 top-2 flex flex-col gap-1.5">
            <button
              onClick={handleWishlist}
              aria-label={isSaved ? `Remove ${product.name} from collection` : `Save ${product.name}`}
              aria-pressed={isSaved}
              className={cn(
                "grid size-8 place-items-center rounded-full backdrop-blur-sm transition-all duration-200",
                isSaved
                  ? "bg-danger/90 text-white"
                  : "bg-black/45 text-white/85 opacity-0 hover:bg-black/70 group-hover:opacity-100 group-focus-within:opacity-100",
              )}
            >
              <Heart className={cn("size-4", isSaved && "fill-current")} />
            </button>

            {product.inStock && (
              <button
                onClick={handleQuickAdd}
                aria-label={`Add ${product.name} to cart`}
                className="grid size-8 place-items-center rounded-full bg-accent text-accent-ink opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-accent-hover group-hover:opacity-100 group-focus-within:opacity-100"
              >
                <Plus className="size-4" />
              </button>
            )}
          </div>

          {!product.inStock && (
            <div className="absolute inset-0 grid place-items-center bg-bg/65 backdrop-blur-[1px]">
              <Badge tone="neutral">Sold out</Badge>
            </div>
          )}

          {product.inStock && product.stock <= 5 && (
            <div className="absolute bottom-2 left-2">
              <Badge tone="warn">Only {product.stock} left</Badge>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            {brandOf(product)}
          </p>

          <h3 className="line-clamp-1 text-sm font-semibold text-ink">{product.name}</h3>

          <p className="line-clamp-2 text-[11px] leading-relaxed text-ink-muted">
            {product.description}
          </p>

          <div className="mt-auto flex items-baseline justify-between gap-2 pt-2.5">
            <span className="text-base font-bold tabular-nums text-ink">
              {formatPrice(product.priceCents)}
            </span>
            <span className="text-[10px] text-ink-faint">
              {product.inStock ? `${product.stock} in stock` : "—"}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
