import { ArrowRight, ShoppingCart } from "../ui/icons";
import { toast } from "../../store/toastStore";
import type { Product } from "../../types/product";
import { formatPrice } from "../../lib/format";
import { extractSpecs, brandOf } from "../../lib/catalog";
import { useCartStore } from "../../store/cartStore";
import { Badge } from "../ui/Badge";
import { Button, ButtonLink } from "../ui/Button";

interface FeaturedHeroProps {
  product: Product;
}

export function FeaturedHero({ product }: FeaturedHeroProps) {
  const addToCart = useCartStore((state) => state.add);

  const specs = extractSpecs(product).slice(2, 6);

  return (
    <div className="relative overflow-hidden rounded-panel ring-1 ring-line">
      <div className="absolute inset-0">
        <img
          src={product.imageUrl}
          alt=""
          aria-hidden="true"
          className="size-full scale-110 object-cover opacity-30 blur-2xl"
        />
        <div className="absolute inset-0 bg-linear-to-r from-bg via-bg/85 to-bg/40" />
        <div className="absolute inset-0 bg-linear-to-t from-bg via-transparent to-transparent" />
      </div>

      <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-4 lg:p-14">
        <div className="flex flex-col items-start gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">Featured</Badge>
            <Badge tone="neutral">{brandOf(product)}</Badge>
            {product.stock <= 5 && product.inStock && (
              <Badge tone="warn">Only {product.stock} left</Badge>
            )}
          </div>

          <h1 className="animate-rise text-3xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl">
            {product.name}
          </h1>

          <p
            style={{ animationDelay: "100ms" }}
            className="animate-rise max-w-md text-sm leading-relaxed text-ink-muted sm:text-base"
          >
            {product.description}
          </p>

          {specs.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {specs.map((spec, index) => (
                <li
                  key={spec.label}
                  style={{ animationDelay: `${200 + index * 60}ms` }}
                  className="animate-fade-in rounded-full glass px-3 py-1 text-[11px] font-medium text-ink-muted"
                >
                  {spec.value}
                </li>
              ))}
            </ul>
          )}

          <div
            style={{ animationDelay: "250ms" }}
            className="animate-rise flex flex-wrap items-center gap-3 pt-1"
          >
            <span className="text-2xl font-black tabular-nums text-ink sm:text-3xl">
              {formatPrice(product.priceCents)}
            </span>

            <Button
              disabled={!product.inStock}
              onClick={() => {
                addToCart(product);
                toast.success(`${product.name} added to cart`);
              }}
            >
              <ShoppingCart className="size-4" />
              {product.inStock ? "Add to cart" : "Sold out"}
            </Button>

            <ButtonLink to={`/product/${product.id}`} variant="secondary">
              Details
              <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </div>

        <div className="hidden lg:block">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="animate-fade-in mx-auto w-full max-w-lg rounded-card object-cover shadow-2xl ring-1 ring-line-strong transition-transform duration-500 hover:scale-105"
          />
        </div>
      </div>
    </div>
  );
}
