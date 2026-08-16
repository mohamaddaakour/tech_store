import { NavLink } from "react-router-dom";
import { ShieldCheck, Sparkles } from "../ui/icons";
import { NAV_ITEMS } from "./navItems";
import { useUiStore } from "../../store/uiStore";
import { useWishlistStore } from "../../store/wishlistStore";
import { useAuthStore, selectIsAdmin } from "../../store/authStore";
import { cn } from "../../lib/cn";

export function NavRail() {
  const setPanel = useUiStore((state) => state.setPanel);
  const savedCount = useWishlistStore((state) => state.ids.length);
  const isAdmin = useAuthStore(selectIsAdmin);

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "group/rail fixed left-0 top-0 z-40 hidden h-screen flex-col gap-2 lg:flex",
        "w-[72px] hover:w-56 transition-[width] duration-300 ease-out-quart",
        "glass border-r border-line px-3 py-4",
      )}
    >
      <NavLink
        to="/"
        className="mb-4 flex items-center gap-3 rounded-control px-2 py-2 hover:bg-surface-2"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-control gradient-accent animate-gradient text-accent-ink">
          <Sparkles className="size-5" />
        </span>
        <span className="whitespace-nowrap text-sm font-bold tracking-tight text-ink opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100">
          TechStore
        </span>
      </NavLink>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}

              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors duration-150",
                  isActive
                    ? "bg-surface-2 text-ink"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="animate-fade-in absolute inset-y-1.5 -left-3 w-[3px] rounded-r-full bg-accent" />
                  )}

                  <span className="relative grid size-9 shrink-0 place-items-center">
                    <item.icon className="size-5" />

                    {item.to === "/collection" && savedCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-bold text-accent-ink">
                        {savedCount}
                      </span>
                    )}
                  </span>

                  <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {isAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            cn(
              "mt-auto flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors duration-150",
              isActive ? "bg-accent/10 text-accent" : "text-ink-muted hover:bg-surface-2 hover:text-accent",
            )
          }
        >
          <span className="grid size-9 shrink-0 place-items-center">
            <ShieldCheck className="size-5" />
          </span>
          <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100">
            Admin
          </span>
        </NavLink>
      )}

      <button
        onClick={() => setPanel("assistant")}
        className="mt-auto flex items-center gap-3 rounded-control px-2 py-2.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-accent"
      >
        <span className="grid size-9 shrink-0 place-items-center">
          <Sparkles className="size-5" />
        </span>
        <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100">
          Assistant
        </span>
      </button>
    </nav>
  );
}

export function MobileTabBar() {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-accent" : "text-ink-faint",
                )
              }
            >
              <item.icon className="size-5" />
              {item.shortLabel}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
