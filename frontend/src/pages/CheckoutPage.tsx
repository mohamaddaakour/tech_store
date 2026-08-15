import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, CreditCard, MapPin, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import { getErrorMessage } from "../api/client";
import { useCartStore } from "../store/cartStore";
import { usePlaceOrder } from "../hooks/useOrders";
import { formatPrice, pluralize } from "../lib/format";
import { Button, ButtonLink } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { cn } from "../lib/cn";

/**
 * Address validation. Deliberately light — over-strict address rules reject real addresses.
 */
const addressSchema = z.object({
  fullName: z.string().min(2, "Enter the recipient's name"),
  line1: z.string().min(4, "Enter a street address"),
  city: z.string().min(2, "Enter a city"),
  postalCode: z.string().min(3, "Enter a postal code"),
  country: z.string().min(2, "Enter a country"),
});

type AddressValues = z.infer<typeof addressSchema>;

const STEPS = [
  { id: "address", label: "Delivery", icon: MapPin },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "review", label: "Review", icon: Receipt },
] as const;

type StepId = (typeof STEPS)[number]["id"];

/** Delivery pricing, mirroring the server's rule so the preview matches the charge. */
const SHIPPING_FLAT_CENTS = 1499;
const FREE_SHIPPING_THRESHOLD_CENTS = 50_000;

/**
 * Multi-step checkout.
 *
 * ## Now backed by the real API
 *
 * Placing an order used to write to `localStorage`. It now POSTs to `/api/orders`, where the server
 * looks up every price, locks the product rows with `SELECT … FOR UPDATE`, verifies stock, and
 * decrements it inside one transaction. Two things follow from that:
 *
 * - **Only ids and quantities are sent.** Prices come from the database. A client-supplied price is
 *   how you end up selling laptops for a cent.
 * - **Checkout can now legitimately fail.** "Only 2 left" is a real 400 from the server, so the
 *   review step surfaces the error rather than assuming success.
 *
 * Payment remains a labelled placeholder: Stripe is SUBJECT.md Phase 4. The step collects nothing
 * and says so, rather than presenting card fields that silently discard what you type.
 */
export default function CheckoutPage() {
  const lines = useCartStore((state) => state.lines);
  const subtotalCents = useCartStore((state) => state.totalCents());
  const totalItems = useCartStore((state) => state.totalItems());
  const clearCart = useCartStore((state) => state.clear);

  const placeOrder = usePlaceOrder();
  const navigate = useNavigate();

  const [step, setStep] = useState<StepId>("address");
  const [address, setAddress] = useState<AddressValues | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    mode: "onBlur",
    defaultValues: { country: "United Kingdom" },
  });

  const shippingCents =
    subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
  const totalCents = subtotalCents + shippingCents;
  const currentStepIndex = STEPS.findIndex((entry) => entry.id === step);

  // Guard here rather than hiding the route, so a stale bookmark degrades gracefully.
  if (lines.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title="Nothing to check out"
        message="Your cart is empty — add something first."
        action={
          <ButtonLink to="/store" variant="secondary" size="sm">
            Browse the store
          </ButtonLink>
        }
      />
    );
  }

  function submitAddress(values: AddressValues) {
    setAddress(values);
    setStep("payment");
  }

  function confirmOrder() {
    if (!address) return;

    placeOrder.mutate(
      {
        // Ids and quantities only — the server prices the order.
        items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        address,
      },
      {
        onSuccess: (order) => {
          // Clear the cart only after the server confirms. Clearing optimistically would lose the
          // cart if checkout failed on a stock conflict.
          clearCart();
          toast.success(`Order ${order.reference} placed`);
          navigate(`/orders/${order.reference}`, { replace: true });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Checkout</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {pluralize(totalItems, "item")} · {formatPrice(totalCents)}
        </p>
      </div>

      {/* ================= STEP INDICATOR ================= */}
      <ol className="flex items-center gap-2">
        {STEPS.map((entry, index) => {
          const isDone = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <li key={entry.id} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors duration-300",
                    isDone && "bg-accent text-accent-ink",
                    isCurrent && "bg-accent/15 text-accent ring-2 ring-accent",
                    !isDone && !isCurrent && "bg-surface-2 text-ink-faint ring-1 ring-line",
                  )}
                >
                  {/* A tick for completed steps rather than the number — reads as "done" instantly. */}
                  {isDone ? <Check className="size-4" /> : <entry.icon className="size-4" />}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-semibold sm:inline",
                    isCurrent ? "text-ink" : "text-ink-faint",
                  )}
                >
                  {entry.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div className="h-px flex-1 bg-line">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isDone ? "100%" : "0%" }}
                    transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                    className="h-full bg-accent"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-card bg-surface p-5 ring-1 ring-line sm:p-6">
          {/* `mode="wait"` holds the incoming step until the outgoing one has left, so the panel
              height does not jump with both mounted at once. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            >
              {/* ---- 1. Address ---- */}
              {step === "address" && (
                <form onSubmit={handleSubmit(submitAddress)} className="flex flex-col gap-4" noValidate>
                  <h2 className="text-sm font-bold text-ink">Delivery address</h2>

                  <Input label="Full name" autoComplete="name" {...register("fullName")}
                         error={errors.fullName?.message} />
                  <Input label="Street address" autoComplete="address-line1" {...register("line1")}
                         error={errors.line1?.message} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="City" autoComplete="address-level2" {...register("city")}
                           error={errors.city?.message} />
                    <Input label="Postal code" autoComplete="postal-code" {...register("postalCode")}
                           error={errors.postalCode?.message} />
                  </div>
                  <Input label="Country" autoComplete="country-name" {...register("country")}
                         error={errors.country?.message} />

                  <Button type="submit" fullWidth>
                    Continue to payment
                  </Button>
                </form>
              )}

              {/* ---- 2. Payment ---- */}
              {step === "payment" && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-bold text-ink">Payment</h2>

                  {/* No fake card inputs. A form that looks like it takes card details but discards
                      them trains users into exactly the habit phishing relies on. */}
                  <div className="rounded-control bg-info-soft p-4">
                    <p className="text-xs font-semibold text-info">Stripe arrives in Phase 4</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-info/90">
                      Card payment needs a Stripe session and webhook verification, so no card details
                      are collected here. Your order is created with status <strong>PENDING</strong> —
                      exactly the state a real unpaid order sits in until payment confirms. Stock is
                      reserved immediately.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="secondary" fullWidth onClick={() => setStep("address")}>
                      Back
                    </Button>
                    <Button fullWidth onClick={() => setStep("review")}>
                      Continue to review
                    </Button>
                  </div>
                </div>
              )}

              {/* ---- 3. Review ---- */}
              {step === "review" && address && (
                <div className="flex flex-col gap-5">
                  <h2 className="text-sm font-bold text-ink">Review your order</h2>

                  <div className="rounded-control bg-surface-2 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                      Delivering to
                    </p>
                    <address className="mt-1.5 text-xs not-italic leading-relaxed text-ink-muted">
                      <span className="block font-semibold text-ink">{address.fullName}</span>
                      {address.line1}
                      <br />
                      {address.city}, {address.postalCode}
                      <br />
                      {address.country}
                    </address>
                  </div>

                  <ul className="divide-y divide-line">
                    {lines.map((line) => (
                      <li key={line.product.id} className="flex items-center gap-3 py-2.5">
                        <img src={line.product.imageUrl} alt=""
                             className="size-11 shrink-0 rounded-control object-cover ring-1 ring-line" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-ink">{line.product.name}</p>
                          <p className="text-[11px] text-ink-faint">
                            {line.quantity} × {formatPrice(line.product.priceCents)}
                          </p>
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-ink">
                          {formatPrice(line.product.priceCents * line.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Checkout can genuinely fail now — most likely because someone else bought the
                      last unit while this cart sat open. Showing the server's specific message
                      ("X has only 2 in stock") is far more useful than a generic failure. */}
                  {placeOrder.error && (
                    <p role="alert"
                       className="rounded-control bg-danger-soft px-3 py-2 text-xs text-danger animate-fade-in">
                      {getErrorMessage(placeOrder.error)}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <Button variant="secondary" fullWidth onClick={() => setStep("payment")}>
                      Back
                    </Button>
                    <Button fullWidth loading={placeOrder.isPending} onClick={confirmOrder}>
                      Place order
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ================= SUMMARY ================= */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card bg-surface p-5 ring-1 ring-line">
            <h2 className="text-sm font-bold text-ink">Summary</h2>

            <dl className="mt-4 flex flex-col gap-2 text-xs">
              <div className="flex justify-between text-ink-muted">
                <dt>{pluralize(totalItems, "item")}</dt>
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
              <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
                <dt className="text-sm font-semibold text-ink">Total</dt>
                <dd className="text-xl font-black tabular-nums text-ink">{formatPrice(totalCents)}</dd>
              </div>
            </dl>

            <p className="mt-4 text-[10px] leading-relaxed text-ink-faint">
              Final prices are confirmed by the server when the order is placed.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
