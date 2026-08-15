import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Toaster } from "react-hot-toast";
import { AmbientBackground } from "./AmbientBackground";
import { MobileTabBar, NavRail } from "./NavRail";
import { TopBar } from "./TopBar";
import { CartDrawer } from "../cart/CartDrawer";
import { SearchOverlay } from "../search/SearchOverlay";
import { AssistantPanel } from "../assistant/AssistantPanel";
import { useApplyTheme } from "../../hooks/useApplyTheme";
import { useGlobalShortcuts } from "../../hooks/useGlobalShortcuts";
import { useRestoreSession } from "../../hooks/useAuth";

/**
 * The console shell wrapping every page.
 *
 * Owns four things and no page content of its own:
 *
 * 1. Chrome — ambient background, nav rail / mobile tab bar, top bar.
 * 2. Global side effects — theme application, keyboard shortcuts, session restore.
 * 3. Overlays — cart, search, assistant, toasts.
 * 4. Animated page transitions.
 *
 * Rendered as a React Router layout route, so all of the above persist across
 * navigation instead of unmounting and remounting on every route change.
 */
export function ConsoleLayout() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  /**
   * `useOutlet()` rather than `<Outlet />`, and this is the subtle part.
   *
   * `<Outlet />` reads the *current* route from context every render. Inside
   * `AnimatePresence`, the outgoing page therefore renders the NEW route's content
   * while playing its exit animation — you see the next page fade out. `useOutlet()`
   * returns a concrete element that we capture and key by pathname, so the element
   * being animated out stays the page it actually was.
   */
  const outlet = useOutlet();

  useApplyTheme();
  useGlobalShortcuts();
  /**
   * Trades the HttpOnly refresh cookie for an access token on load, so a returning
   * user is still signed in. Lives here because the layout mounts once for the whole
   * app — calling it per page would refire on every navigation.
   */
  useRestoreSession();

  return (
    <div className="min-h-screen">
      <AmbientBackground />
      <NavRail />

      {/* Offset for the 72px collapsed rail. The rail expands on hover as an
          overlay rather than pushing content, so this padding stays constant and
          the page never reflows under the cursor. */}
      <div className="lg:pl-[72px]">
        <TopBar />

        {/* `pb-24` on mobile clears the fixed bottom tab bar; without it the last
            row of content sits underneath it and cannot be reached. */}
        <main className="px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:pb-16">
          {/* `mode="wait"` holds the incoming page until the outgoing one has
              finished leaving, so the two never overlap and shift the layout. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.3, ease: [0.25, 1, 0.5, 1] }
              }
              className="mx-auto max-w-[1600px]"
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileTabBar />

      {/* Overlays are mounted unconditionally — each manages its own visibility.
          Wrapping them in `{isOpen && ...}` here would unmount them before their
          AnimatePresence exit animation could run. */}
      <CartDrawer />
      <SearchOverlay />
      <AssistantPanel />

      {/* Toasts. Styled from theme tokens so they follow the light/dark switch
          instead of staying stuck on one palette. */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 2600,
          style: {
            background: "var(--color-surface-2)",
            color: "var(--color-ink)",
            border: "1px solid var(--color-line-strong)",
            borderRadius: "var(--radius-control)",
            fontSize: "13px",
          },
          iconTheme: { primary: "var(--color-accent)", secondary: "var(--color-accent-ink)" },
        }}
      />
    </div>
  );
}
