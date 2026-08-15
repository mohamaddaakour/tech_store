import { useEffect } from "react";
import { useUiStore } from "../store/uiStore";

/**
 * Application-wide keyboard shortcuts — a console-style requirement from
 * SUBJECT.md ("shortcuts for search, cart, profile and chatbot").
 *
 * - `Ctrl/Cmd + K` — search
 * - `Ctrl/Cmd + B` — cart
 * - `Ctrl/Cmd + I` — assistant
 * - `Escape`       — close whatever is open
 *
 * Call once, from the layout.
 */
export function useGlobalShortcuts() {
  const setPanel = useUiStore((state) => state.setPanel);
  const closePanel = useUiStore((state) => state.closePanel);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      /**
       * Never hijack a key while the user is typing.
       *
       * Without this check, Ctrl+B inside the search box (or any future textarea)
       * would open the cart instead of doing what the field expects. We also allow
       * `isContentEditable`, which covers rich-text inputs.
       */
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;

      // `metaKey` is Cmd on macOS, `ctrlKey` on Windows/Linux — accepting either
      // means one handler works on every platform.
      const withModifier = event.metaKey || event.ctrlKey;

      if (withModifier && event.key.toLowerCase() === "k") {
        // The browser's own "focus address bar" binding must be suppressed, or
        // the overlay opens *and* focus leaves the page.
        event.preventDefault();
        setPanel("search");
        return;
      }

      // The remaining shortcuts are suppressed while typing; Ctrl+K is not,
      // because summoning search from inside a field is still what you meant.
      if (isTyping) return;

      if (withModifier && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setPanel("cart");
      } else if (withModifier && event.key.toLowerCase() === "i") {
        event.preventDefault();
        setPanel("assistant");
      } else if (event.key === "Escape") {
        // Individual overlays also handle Escape; this is the catch-all for
        // anything that does not.
        closePanel();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    // Removing the listener on unmount is what stops shortcuts firing twice after
    // a hot reload or a remount.
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPanel, closePanel]);
}
