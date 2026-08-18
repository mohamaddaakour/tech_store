import { useEffect } from "react";
import { useUiStore } from "../store/uiStore";

export function useGlobalShortcuts() {
  const setPanel = useUiStore((state) => state.setPanel);
  const closePanel = useUiStore((state) => state.closePanel);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;

      const withModifier = event.metaKey || event.ctrlKey;

      if (withModifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPanel("search");
        return;
      }

      if (isTyping) return;

      if (withModifier && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setPanel("cart");
      } else if (withModifier && event.key.toLowerCase() === "i") {
        event.preventDefault();
        setPanel("assistant");
      } else if (event.key === "Escape") {
        closePanel();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPanel, closePanel]);
}
