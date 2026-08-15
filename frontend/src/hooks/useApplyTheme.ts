import { useEffect } from "react";
import { useUiStore } from "../store/uiStore";

/**
 * Pushes the theme and low-motion preferences onto the `<html>` element.
 *
 * Call once, at the root. This is the bridge between the Zustand store and the
 * CSS in `index.css`, which keys off `html[data-theme="light"]` and
 * `html.low-motion`.
 *
 * Why `<html>` and not a React-rendered wrapper `<div>`: `document.body` gets its
 * background from these variables, and so do portalled overlays and the browser's
 * own scrollbar chrome. Anything rendered inside the React tree would leave those
 * on the old theme.
 */
export function useApplyTheme() {
  const theme = useUiStore((state) => state.theme);
  const lowMotion = useUiStore((state) => state.lowMotion);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    // `classList.toggle(name, force)` adds when force is true, removes when
    // false — no branching needed.
    document.documentElement.classList.toggle("low-motion", lowMotion);
  }, [lowMotion]);
}
