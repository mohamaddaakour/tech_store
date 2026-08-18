import { useState } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Check, CreditCard, MapPin, Receipt } from "../components/ui/icons";
import { toast } from "../store/toastStore";
import { getErrorMessage } from "../api/client";
import { useCartStore } from "../store/cartStore";
import { usePlaceOrder } from "../hooks/useOrders";
import { formatPrice, pluralize } from "../lib/format";
import { Button, ButtonLink } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { cn } from "../lib/cn";

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

const SHIPPING_FLAT_CENTS = 1499;
const FREE_SHIPPING_THRESHOLD_CENTS = 50_000;

export default function CheckoutPage() {
  const lines = useCartStore((state) => state.lines);
  const subtotalCents = useCartStore((state) => state.totalCents());
  const totalItems = useCartStore((state) => state.totalItems());
  const clearCart = useCartStore((state) => state.clear);

  const placeOrder = usePlaceOrder();
  const navigate = useNavigate();

  const [step, setStep] = useState<StepId>("address");
  const [address, setAddress] = useState<AddressValues | null>(null);

  const [addressValues, setAddressValues] = useState<AddressValues>({
    fullName: "",
    line1: "",
    city: "",
    postalCode: "",
    country: "United Kingdom",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddressValues, string>>>({});

  function updateAddressField(field: keyof AddressValues, value: string) {
    setAddressValues((current) => ({ ...current, [field]: value }));
  }

  function validateAddressField(field: keyof AddressValues) {
    const result = addressSchema.shape[field].safeParse(addressValues[field]);
    setErrors((current) => ({
      ...current,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  }

  const shippingCents =
    subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
  const totalCents = subtotalCents + shippingCents;
  const currentStepIndex = STEPS.findIndex((entry) => entry.id === step);

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

  function submitAddress(event: React.FormEvent) {
    event.preventDefault();

    const result = addressSchema.safeParse(addressValues);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof AddressValues, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof AddressValues;
        fieldErrors[field] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setAddress(result.data);
    setStep("payment");
  }

  function confirmOrder() {
    if (!address) return;

    placeOrder.mutate(
      {
        items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        address,
      },
      {
        onSuccess: (order) => {
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
                  <div
                    style={{ width: isDone ? "100%" : "0%" }}
                    className="h-full bg-accent transition-[width] duration-400 ease-out"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-card bg-surface p-5 ring-1 ring-line sm:p-6">
          <div key={step} className="animate-fade-in">
              {step === "address" && (
                <form onSubmit={submitAddress} className="flex flex-col gap-4" noValidate>
                  <h2 className="text-sm font-bold text-ink">Delivery address</h2>

                  <Input
                    label="Full name"
                    autoComplete="name"
                    value={addressValues.fullName}
                    onChange={(event) => updateAddressField("fullName", event.target.value)}
                    onBlur={() => validateAddressField("fullName")}
                    error={errors.fullName}
                  />
                  <Input
                    label="Street address"
                    autoComplete="address-line1"
                    value={addressValues.line1}
                    onChange={(event) => updateAddressField("line1", event.target.value)}
                    onBlur={() => validateAddressField("line1")}
                    error={errors.line1}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="City"
                      autoComplete="address-level2"
                      value={addressValues.city}
                      onChange={(event) => updateAddressField("city", event.target.value)}
                      onBlur={() => validateAddressField("city")}
                      error={errors.city}
                    />
                    <Input
                      label="Postal code"
                      autoComplete="postal-code"
                      value={addressValues.postalCode}
                      onChange={(event) => updateAddressField("postalCode", event.target.value)}
                      onBlur={() => validateAddressField("postalCode")}
                      error={errors.postalCode}
                    />
                  </div>
                  <Input
                    label="Country"
                    autoComplete="country-name"
                    value={addressValues.country}
                    onChange={(event) => updateAddressField("country", event.target.value)}
                    onBlur={() => validateAddressField("country")}
                    error={errors.country}
                  />

                  <Button type="submit" fullWidth>
                    Continue to payment
                  </Button>
                </form>
              )}

              {step === "payment" && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-bold text-ink">Payment</h2>

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
          </div>
        </div>

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
