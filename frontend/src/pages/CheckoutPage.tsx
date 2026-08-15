import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, CreditCard, MapPin, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import { useCartStore } from "../store/cartStore";
import { useOrderStore, calculateShipping } from "../store/orderStore";
import { formatPrice, pluralize } from "../lib/format";
import type { ShippingAddress } from "../types/order";
import { Button, ButtonLink } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { cn } from "../lib/cn";

/**
 * Address validation. Deliberately light — over-strict address rules reject real
 * addresses, and the only field with a genuinely checkable format is the postcode
 * length.
 */
const addressSchema = z.object({
  fullName: z.string().min(2, "Enter the recipient's name"),
  line1: z.string().min(4, "Enter a street address"),
  city: z.string().min(2, "Enter a city"),
  postalCode: z.string().min(3, "Enter a postal code"),
  country: z.string().min(2, "Enter a country"),
});

type AddressValues = z.infer<typeof addressSchema>;

/** The three steps, plus the terminal confirmation. */
const STEPS = [
  { id: "address", label: "Delivery", icon: MapPin },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "review", label: "Review", icon: Receipt },
] as const;

type StepId = (typeof STEPS)[number]["id"];

/**
 * Multi-step checkout (SUBJECT.md Phase 3: "Checkout").
 *
 * ## What is real and what is not
 *
 * The flow, validation, totals and the resulting order record are all real. Two
 * things are deliberately **not**:
 *
 * - **Payment.** Stripe is Phase 4 and needs a backend. The payment step collects
 *   nothing and says so — it does not present fake card fields, because a form that
 *   looks like it takes card details but does not is worse than an honest placeholder.
 * - **Stock decrement.** Only a database transaction can do that safely; two tabs
 *   checking out the last unit would both succeed here. Overselling protection is a
 *   server concern by definition.
 *
 * The order itself is written to `localStorage` via `orderStore`, so the orders pages
 * have genuine data to render.
 */
export default function CheckoutPage() {
  const lines = useCartStore((state) => state.lines);
  const subtotalCents = useCartStore((state) => state.totalCents());
  const totalItems = useCartStore((state) => state.totalItems());
  const clearCart = useCartStore((state) => state.clear);
  const placeOrder = useOrderStore((state) => state.placeOrder);

  const navigate = useNavigate();

  const [step, setStep] = useState<StepId>("address");
  const [address, setAddress] = useState<ShippingAddress | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    mode: "onBlur",
    // Sensible starting country so the field is not an empty required box.
    defaultValues: { country: "United Kingdom" },
  });

  const shippingCents = calculateShipping(subtotalCents);
  const totalCents = subtotalCents + shippingCents;
  const currentStepIndex = STEPS.findIndex((entry) => entry.id === step);

  // An empty cart has nothing to check out. Guarding here rather than hiding the
  // route means a stale bookmark to /checkout degrades gracefully.
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

  async function confirmOrder() {
    if (!address) return;

    setIsPlacing(true);

    // A brief delay so the button's loading state is visible. When this becomes a
    // real API call the latency will be genuine; the spinner exists either way, so
    // the UI does not need to change.
    await new Promise((resolve) => setTimeout(resolve, 700));

    const order = placeOrder(lines, address);
    clearCart();

    toast.success(`Order ${order.id} placed`);
    // `replace` so Back does not return to a checkout for a cart that no longer
    // exists.
    navigate(`/orders/${order.id}`, { replace: true });
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
                  {/* A tick for completed steps rather than the number — it reads as
                      "done" at a glance. */}
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

              {/* Connector, filling as you progress. `flex-1` makes it absorb the
                  leftover width so the steps space themselves evenly. */}
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
        {/* ================= STEP BODY ================= */}
        <div className="rounded-card bg-surface p-5 ring-1 ring-line sm:p-6">
          {/* `mode="wait"` holds the incoming step until the outgoing one has left,
              so the panel height does not jump with both mounted at once. */}
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

                  <Input
                    label="Full name"
                    autoComplete="name"
                    {...register("fullName")}
                    error={errors.fullName?.message}
                  />
                  <Input
                    label="Street address"
                    autoComplete="address-line1"
                    {...register("line1")}
                    error={errors.line1?.message}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="City"
                      autoComplete="address-level2"
                      {...register("city")}
                      error={errors.city?.message}
                    />
                    <Input
                      label="Postal code"
                      autoComplete="postal-code"
                      {...register("postalCode")}
                      error={errors.postalCode?.message}
                    />
                  </div>
                  <Input
                    label="Country"
                    autoComplete="country-name"
                    {...register("country")}
                    error={errors.country?.message}
                  />

                  <Button type="submit" fullWidth>
                    Continue to payment
                  </Button>
                </form>
              )}

              {/* ---- 2. Payment ---- */}
              {step === "payment" && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-bold text-ink">Payment</h2>

                  {/* Honest placeholder. No fake card inputs: a form that looks like
                      it takes card details but silently discards them trains users
                      into exactly the habit phishing relies on. */}
                  <div className="rounded-control bg-info-soft p-4">
                    <p className="text-xs font-semibold text-info">Stripe arrives in Phase 4</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-info/90">
                      Card payment needs a backend to create a Stripe session and verify
                      the webhook, so no card details are collected here. Your order will
                      be created with status <strong>PENDING</strong> — exactly the state a
                      real unpaid order sits in until Stripe confirms it.
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
                        <img
                          src={line.product.imageUrl}
                          alt=""
                          className="size-11 shrink-0 rounded-control object-cover ring-1 ring-line"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-ink">
                            {line.product.name}
                          </p>
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

                  <div className="flex gap-3">
                    <Button variant="secondary" fullWidth onClick={() => setStep("payment")}>
                      Back
                    </Button>
                    <Button fullWidth loading={isPlacing} onClick={confirmOrder}>
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
                <dd className="text-xl font-black tabular-nums text-ink">
                  {formatPrice(totalCents)}
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-[10px] leading-relaxed text-ink-faint">
              Orders are stored in this browser until the backend order endpoints exist.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
