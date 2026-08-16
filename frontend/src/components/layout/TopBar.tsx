import { Link, useNavigate } from "react-router-dom";
import { Moon, Search, ShoppingCart, Sun, User } from "../ui/icons";
import { useUiStore } from "../../store/uiStore";
import { useCartStore } from "../../store/cartStore";
import { useAuthStore } from "../../store/authStore";
import { useLogout } from "../../hooks/useAuth";
import { pluralize } from "../../lib/format";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { cn } from "../../lib/cn";

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
      onSettled: () => navigate("/"),
    });
  }

  return (
    <header className="sticky top-0 z-30 glass border-b border-line">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="text-base font-bold tracking-tight text-ink lg:hidden">
          TechStore
        </Link>

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

          <kbd className="ml-auto hidden rounded border border-line-strong bg-surface px-1.5 py-0.5 font-sans text-[10px] text-ink-faint lg:inline">
            Ctrl K
          </kbd>
        </button>

        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="grid size-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <span key={theme} className="animate-fade-in">
            {theme === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}
          </span>
        </button>

        <button
          onClick={() => setPanel("cart")}
          aria-label={`Cart, ${pluralize(cartCount, "item")}`}
          className="relative grid size-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ShoppingCart className="size-5" />

          {cartCount > 0 && (
            <span
              key={cartCount}
              className="animate-rise absolute -right-0.5 -top-0.5 grid size-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink ring-2 ring-bg"
            >
              {cartCount}
            </span>
          )}
        </button>

        {isRestoring ? (
          <Skeleton className="h-9 w-9 rounded-control sm:w-24" />
        ) : user ? (
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="max-w-[12rem] truncate text-xs font-medium text-ink" title={user.email}>
                {user.email}
              </p>
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
