import { useEffect } from "react";

/**
 * Calls `handler` when Escape is pressed, while `active` is true.
 *
 * Every overlay needs this. Escape-to-close is not a nicety — it is the expected
 * way out of a dialog, and for a keyboard user it may be the only way, since
 * reaching a close button can mean tabbing through the whole panel.
 *
 * The listener is attached to `window` rather than to the panel so it fires no
 * matter where focus currently is.
 */
export function useEscapeKey(active: boolean, handler: () => void) {
  useEffect(() => {
    // Skip attaching entirely when inactive: cheaper, and it guarantees a closed
    // drawer can never react to a keypress meant for something else.
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handler();
    };

    window.addEventListener("keydown", onKeyDown);

    // The cleanup function is the part people forget. Without it, every open/close
    // cycle leaves another listener attached, and eventually one Escape press
    // closes things that are not even on screen. React runs this before the next
    // effect and on unmount.
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, handler]);
}
