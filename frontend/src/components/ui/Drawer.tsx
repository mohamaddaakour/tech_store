import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { Button } from "./Button";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Shown as the heading, and used as the dialog's accessible name. */
  title: string;
  children: ReactNode;
  /** Pinned to the bottom, outside the scrolling area — totals, primary action. */
  footer?: ReactNode;
}

/**
 * A panel that slides in from the right, with a dimmed backdrop.
 *
 * ## Why Framer Motion here rather than CSS
 *
 * Animating *in* is easy in CSS. Animating *out* is not: the moment React decides
 * `open` is false it unmounts the element, and an element that no longer exists
 * cannot animate. You end up keeping it mounted and juggling a `visible` class,
 * plus a `transitionend` listener to finally remove it.
 *
 * `AnimatePresence` solves exactly this. It holds the children in the tree until
 * their `exit` animation finishes, then removes them. That is what makes the
 * drawer slide away instead of vanishing.
 *
 * ## Accessibility
 *
 * - `role="dialog"` + `aria-modal` tell assistive tech this is a modal layer.
 * - `aria-labelledby` points at the heading, so it is announced on open.
 * - Escape closes; the backdrop closes on click.
 * - Page scroll is locked while open.
 *
 * One honest limitation: focus is moved into the panel but not *trapped*, so
 * Tab can eventually walk out into the page behind. A full focus trap is
 * fiddly enough that the right answer is a library (`react-focus-trap`, or
 * Radix's Dialog) rather than a hand-rolled one — worth doing in Phase 9 when
 * keyboard navigation gets proper attention.
 */
export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  useEscapeKey(open, onClose);
  useBodyScrollLock(open);

  /**
   * Reads the OS "reduce motion" setting. When it is on we cut the duration to
   * zero, so the drawer appears instantly instead of sliding. It still works
   * identically — only the movement is gone.
   */
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : 0.32;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* ---------------- Backdrop ---------------- */}
          <motion.div
            // `initial` -> `animate` on mount, `exit` on unmount.
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* ---------------- Panel ---------------- */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            // A spring, not a fixed curve: it decelerates the way a physical
            // object would, which is why this reads as "weighty" rather than
            // "animated". `damping` high enough to avoid a visible bounce.
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 34 }
            }
            // Animating `x` (a transform) rather than `right` matters: transforms
            // are handled by the compositor and stay at 60fps, while animating a
            // layout property forces the browser to re-lay-out every frame.
            className={[
              "relative flex h-full w-full max-w-sm flex-col",
              "bg-surface ring-1 ring-line shadow-2xl",
            ].join(" ")}
          >
            <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <h2 id="drawer-title" className="text-base font-semibold text-ink">
                {title}
              </h2>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
                {/* An icon-only button needs aria-label above, or it is announced
                    as just "button". The glyph itself is hidden from readers. */}
                <span aria-hidden="true" className="text-lg leading-none">
                  &times;
                </span>
              </Button>
            </header>

            {/* The only scrolling region: the header and footer stay put while a
                long list of items scrolls between them. `min-h-0` is the
                non-obvious part — without it a flex child refuses to shrink
                below its content and the overflow never engages. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && <footer className="border-t border-line px-5 py-4">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
