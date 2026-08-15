import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Search, ShoppingCart, Sun, User } from "lucide-react";
import { useUiStore } from "../../store/uiStore";
import { useCartStore } from "../../store/cartStore";
import { useAuthStore } from "../../store/authStore";
import { useLogout } from "../../hooks/useAuth";
import { pluralize } from "../../lib/format";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { cn } from "../../lib/cn";

/**
 * The sticky top bar: search, cart, theme, account.
 *
 * `sticky top-0` with `glass` is the modern app-bar recipe — a translucent bar
 * over scrolling content needs the backdrop blur to stay readable, while a fully
 * opaque one loses the sense of content passing beneath it.
 *
 * `z-30` puts it above page content but below the nav rail (`z-40`) and the
 * overlays (`z-50`), so a drawer's backdrop correctly dims it.
 */
export function TopBar() {
  const setPanel = useUiStore((state) => state.setPanel);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  const cartCount = useCartStore((state) => state.totalItems());

  const user = useAuthStore((state) => state.user);
  const isRestoring = useAuthStore((state) => state.isRestoring);
  const logoutMutation = useLogout();
  const navigate = useNavigate();

  function handleSignOut() {
    logoutMutation.mutate(undefined, {
      // Leave any page that assumed a signed-in user.
      onSettled: () => navigate("/"),
    });
  }

  return (
    <header className="sticky top-0 z-30 glass border-b border-line">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* Wordmark, mobile only — on desktop the nav rail already carries it. */}
        <Link to="/" className="text-base font-bold tracking-tight text-ink lg:hidden">
          TechStore
        </Link>

        {/* ---- Search trigger ----
            A button that opens the overlay, not an input. One search UI (the
            overlay) means one place to maintain, and it can be summoned from
            anywhere by keyboard. */}
        <button
          onClick={() => setPanel("search")}
          className={cn(
            "group ml-auto flex h-9 items-center gap-2 rounded-control px-3 lg:ml-0 lg:mr-auto lg:w-72",
            "bg-surface-2 text-sm text-ink-faint ring-1 ring-line",
            "transition-colors hover:bg-surface-3 hover:text-ink-muted",
          )}
        >
          <Search className="size-4 shrink-0" />
          <span className="hidden lg:inline">Search products…</span>

          {/* The shortcut hint. Discoverability is the entire point: a shortcut
              nobody knows about might as well not exist. */}
          <kbd className="ml-auto hidden rounded border border-line-strong bg-surface px-1.5 py-0.5 font-sans text-[10px] text-ink-faint lg:inline">
            Ctrl K
          </kbd>
        </button>

        {/* ---- Theme toggle ---- */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="grid size-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {/* Keyed on theme so the icons cross-fade and rotate rather than
              swapping instantly. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
            >
              {theme === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </motion.span>
          </AnimatePresence>
        </button>

        {/* ---- Cart ---- */}
        <button
          onClick={() => setPanel("cart")}
          aria-label={`Cart, ${pluralize(cartCount, "item")}`}
          className="relative grid size-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ShoppingCart className="size-5" />

          <AnimatePresence>
            {cartCount > 0 && (
              <motion.span
                // `key={cartCount}` makes React treat each number as a NEW
                // element, so the exit and enter animations play on every change.
                // That is what produces the "tick" from 1 to 2 rather than a
                // silent text swap.
                key={cartCount}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="absolute -right-0.5 -top-0.5 grid size-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink ring-2 ring-bg"
              >
                {cartCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* ---- Account ----
            Three states, and the first is the one usually forgotten: while the
            startup token refresh is in flight we show a skeleton, so a signed-in
            user never sees "Sign in" flash before their email appears. */}
        {isRestoring ? (
          <Skeleton className="h-9 w-9 rounded-control sm:w-24" />
        ) : user ? (
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="max-w-[12rem] truncate text-xs font-medium text-ink" title={user.email}>
                {user.email}
              </p>
              {/* The visible half of RBAC. The backend enforces the role
                  regardless; hiding UI is a courtesy, never a permission check. */}
              {user.role === "ADMIN" && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                  Admin
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              loading={logoutMutation.isPending}
              onClick={handleSignOut}
            >
              Sign out
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => navigate("/login")}>
            <User className="size-4" />
            <span className="hidden sm:inline">Sign in</span>
          </Button>
        )}
      </div>
    </header>
  );
}
