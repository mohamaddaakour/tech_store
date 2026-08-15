import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { Moon, Sun, Zap } from "lucide-react";
import { useUiStore } from "../store/uiStore";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";
import { useRecentlyViewedStore } from "../store/recentlyViewedStore";
import { useOrderStore } from "../store/orderStore";
import { Badge } from "../components/ui/Badge";
import { Button, ButtonLink } from "../components/ui/Button";
import { cn } from "../lib/cn";

/**
 * Settings — account, appearance, motion, and local data.
 *
 * The motion toggle here is the "low-motion mode" SUBJECT.md requires alongside
 * `prefers-reduced-motion`. Both matter: the OS setting is the right default, but
 * someone may want a calm interface in this one app without changing their whole
 * system, and someone else may want animations here despite a system-wide preference.
 */
export default function SettingsPage() {
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const lowMotion = useUiStore((state) => state.lowMotion);
  const toggleLowMotion = useUiStore((state) => state.toggleLowMotion);

  const user = useAuthStore((state) => state.user);

  const cartLines = useCartStore((state) => state.lines.length);
  const clearCart = useCartStore((state) => state.clear);
  const savedCount = useWishlistStore((state) => state.ids.length);
  const clearWishlist = useWishlistStore((state) => state.clear);
  const recentCount = useRecentlyViewedStore((state) => state.ids.length);
  const clearRecent = useRecentlyViewedStore((state) => state.clear);
  const orderCount = useOrderStore((state) => state.orders.length);
  const clearOrders = useOrderStore((state) => state.clear);

  function clearEverything() {
    clearCart();
    clearWishlist();
    clearRecent();
    clearOrders();
    toast.success("Local data cleared");
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Account, appearance and stored data</p>
      </div>

      {/* ---- Account ---- */}
      <SettingsSection title="Account">
        {user ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">{user.email}</p>
              <p className="text-[11px] text-ink-faint">Account #{user.id}</p>
            </div>
            <Badge tone={user.role === "ADMIN" ? "accent" : "neutral"}>{user.role}</Badge>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">You are not signed in.</p>
            <ButtonLink to="/login" size="sm">
              Sign in
            </ButtonLink>
          </div>
        )}
      </SettingsSection>

      {/* ---- Appearance ---- */}
      <SettingsSection title="Appearance" hint="The console is designed dark; light is fully supported.">
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: "dark", label: "Dark", icon: Moon },
            { value: "light", label: "Light", icon: Sun },
          ] as const).map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              // `aria-pressed` is what tells a screen reader which of the two is
              // active; the ring alone is invisible to it.
              aria-pressed={theme === option.value}
              className={cn(
                "flex items-center gap-3 rounded-control p-3 text-left transition-all duration-200",
                theme === option.value
                  ? "bg-accent/10 ring-2 ring-accent"
                  : "bg-surface-2 ring-1 ring-line hover:bg-surface-3",
              )}
            >
              <option.icon
                className={cn("size-4", theme === option.value ? "text-accent" : "text-ink-muted")}
              />
              <span className="text-sm font-medium text-ink">{option.label}</span>
            </button>
          ))}
        </div>
      </SettingsSection>

      {/* ---- Motion ---- */}
      <SettingsSection
        title="Motion"
        hint="Your system's reduce-motion setting is always respected; this is an extra switch just for TechStore."
      >
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span className="flex items-center gap-3">
            <Zap className={cn("size-4", lowMotion ? "text-warn" : "text-accent")} />
            <span>
              <span className="block text-sm font-medium text-ink">Low motion mode</span>
              <span className="block text-[11px] text-ink-faint">
                Removes parallax, ambient drift and transitions
              </span>
            </span>
          </span>

          {/* A real checkbox, visually hidden with `sr-only` and styled via `peer`.
              This keeps full keyboard and screen-reader support — a div-based switch
              has to reimplement both, usually badly. */}
          <span className="relative inline-flex shrink-0">
            <input
              type="checkbox"
              checked={lowMotion}
              onChange={toggleLowMotion}
              className="peer sr-only"
            />
            <span className="block h-6 w-11 rounded-full bg-surface-3 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2" />
            <span className="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-ink transition-transform duration-200 peer-checked:translate-x-5 peer-checked:bg-accent-ink" />
          </span>
        </label>
      </SettingsSection>

      {/* ---- Local data ---- */}
      <SettingsSection
        title="Stored data"
        hint="Cart, collection, recently viewed and orders live in this browser's localStorage."
      >
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Cart", value: cartLines },
            { label: "Collection", value: savedCount },
            { label: "Recent", value: recentCount },
            { label: "Orders", value: orderCount },
          ].map((entry) => (
            <div key={entry.label} className="rounded-control bg-surface-2 p-3">
              <dd className="text-xl font-black tabular-nums text-ink">{entry.value}</dd>
              <dt className="text-[10px] uppercase tracking-widest text-ink-faint">
                {entry.label}
              </dt>
            </div>
          ))}
        </dl>

        <Button variant="danger" size="sm" onClick={clearEverything} className="mt-4 self-start">
          Clear all local data
        </Button>
      </SettingsSection>
    </div>
  );
}

/** A titled card. Extracted so every section shares identical padding and spacing. */
function SettingsSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-card bg-surface p-5 ring-1 ring-line">
      <h2 className="text-xs font-bold uppercase tracking-widest text-ink-faint">{title}</h2>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{hint}</p>}
      <div className="mt-4 flex flex-col">{children}</div>
    </section>
  );
}
