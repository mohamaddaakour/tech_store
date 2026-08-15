import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { NAV_ITEMS } from "./navItems";
import { useUiStore } from "../../store/uiStore";
import { useWishlistStore } from "../../store/wishlistStore";
import { cn } from "../../lib/cn";

/**
 * The desktop navigation rail — the console's left-hand spine.
 *
 * Collapsed to 72px by default and expanding to 224px on hover, which is the
 * console-dashboard idiom: icons are always available, labels appear when you
 * reach for them. Implemented with a CSS width transition rather than JS state so
 * it is smooth and costs no re-renders.
 *
 * Hidden below `lg` — small screens get {@link MobileTabBar} instead, because a
 * side rail eats scarce horizontal space on a phone.
 */
export function NavRail() {
  const setPanel = useUiStore((state) => state.setPanel);
  const savedCount = useWishlistStore((state) => state.ids.length);

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "group/rail fixed left-0 top-0 z-40 hidden h-screen flex-col gap-2 lg:flex",
        "w-[72px] hover:w-56 transition-[width] duration-300 ease-out-quart",
        "glass border-r border-line px-3 py-4",
      )}
    >
      {/* ---- Wordmark ---- */}
      <NavLink
        to="/"
        className="mb-4 flex items-center gap-3 rounded-control px-2 py-2 hover:bg-surface-2"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-control gradient-accent animate-gradient text-accent-ink">
          <Sparkles className="size-5" />
        </span>
        {/* The label fades and slides in as the rail expands. `whitespace-nowrap`
            stops it wrapping mid-transition while the rail is still narrow. */}
        <span className="whitespace-nowrap text-sm font-bold tracking-tight text-ink opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100">
          TechStore
        </span>
      </NavLink>

      {/* ---- Destinations ---- */}
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              // `end` on the root route only. Without it, "/" would match every
              // path and the Dashboard link would look active everywhere.
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
                  {/* The active indicator. `layoutId` is the important bit: motion
                      animates a single shared element between positions, so it
                      slides from the old item to the new one instead of
                      disappearing and reappearing. */}
                  {isActive && (
                    <motion.span
                      layoutId="rail-active"
                      className="absolute inset-y-1.5 -left-3 w-[3px] rounded-r-full bg-accent"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}

                  <span className="relative grid size-9 shrink-0 place-items-center">
                    <item.icon className="size-5" />

                    {/* Saved-items count, mirrored onto the icon so it is visible
                        while the rail is collapsed and the label is hidden. */}
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

      {/* ---- Assistant, pinned to the bottom ----
          `mt-auto` pushes it down: it is a tool rather than a destination, so it
          is deliberately separated from the list above. */}
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

/**
 * The mobile equivalent: a fixed bottom tab bar.
 *
 * Bottom rather than top because that is where thumbs reach on a phone, and
 * `pb-[env(safe-area-inset-bottom)]` keeps it clear of the iPhone home indicator.
 */
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
