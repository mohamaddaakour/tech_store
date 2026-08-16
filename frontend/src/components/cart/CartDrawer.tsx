import { useNavigate } from "react-router-dom";
import { useCartStore } from "../../store/cartStore";
import { useUiStore } from "../../store/uiStore";
import { calculateShipping, FREE_SHIPPING_THRESHOLD_CENTS } from "../../lib/shipping";
import { formatPrice, pluralize } from "../../lib/format";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import { EmptyState } from "../ui/EmptyState";
import { CartLineRow } from "./CartLineRow";

export function CartDrawer() {
  const isOpen = useUiStore((state) => state.openPanel === "cart");
  const closePanel = useUiStore((state) => state.closePanel);

  const lines = useCartStore((state) => state.lines);
  const subtotalCents = useCartStore((state) => state.totalCents());
  const totalItems = useCartStore((state) => state.totalItems());
  const clear = useCartStore((state) => state.clear);

  const navigate = useNavigate();

  const isEmpty = lines.length === 0;
  const shippingCents = calculateShipping(subtotalCents);
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents;

  function goToCheckout() {
    closePanel();
    navigate("/checkout");
  }

  return (
    <Drawer
      open={isOpen}
      onClose={closePanel}
      title={isEmpty ? "Your cart" : `Your cart · ${pluralize(totalItems, "item")}`}

      footer={
        isEmpty ? undefined : (
          <div className="flex flex-col gap-3">
            {remainingForFreeShipping > 0 && (
              <div className="rounded-control bg-surface-2 p-3">
                <p className="text-[11px] text-ink-muted">
                  Add{" "}
                  <span className="font-semibold text-accent">
                    {formatPrice(remainingForFreeShipping)}
                  </span>{" "}
                  more for free delivery
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full gradient-accent transition-[width] duration-500 ease-out-quart"
                    style={{
                      width: `${Math.min(100, (subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <dl className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between text-ink-muted">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(subtotalCents)}</dd>
              </div>
              <div className="flex justify-between text-ink-muted">
                <dt>Delivery</dt>
                <dd className="tabular-nums">
                  {shippingCents === 0 ? (
                    <span className="font-semibold text-accent">Free</span>
                  ) : (
                    formatPrice(shippingCents)
                  )}
                </dd>
              </div>
              <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2">
                <dt className="text-sm font-medium text-ink">Total</dt>
                <dd className="text-lg font-semibold tabular-nums text-ink">
                  {formatPrice(subtotalCents + shippingCents)}
                </dd>
              </div>
            </dl>

            <Button fullWidth onClick={goToCheckout}>
              Checkout
            </Button>

            <Button variant="ghost" size="sm" fullWidth onClick={clear}>
              Clear cart
            </Button>
          </div>
        )
      }
    >
      {isEmpty ? (
        <EmptyState
          icon="🛒"
          title="Your cart is empty"
          message="Browse the store and add something to get started."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                closePanel();
                navigate("/store");
              }}
            >
              Browse the store
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {lines.map((line) => (
            <CartLineRow key={line.product.id} line={line} />
          ))}
        </ul>
      )}
    </Drawer>
  );
}
