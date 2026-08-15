import { useEffect } from "react";

/**
 * Stops the page behind an overlay from scrolling while `locked` is true.
 *
 * Without this you get "scroll bleed": the user scrolls inside the cart drawer,
 * reaches its end, and the page underneath starts moving instead. On mobile it is
 * worse — the drawer feels like it is sliding around because the background is
 * moving under it.
 *
 * We restore the *previous* value rather than blindly setting `overflow: ""`, so
 * two overlays open at once cannot unlock each other on the way out.
 *
 * `scrollbar-gutter: stable` is set on `html` in index.css, which is what stops
 * the page jumping sideways when the scrollbar disappears here.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
}
