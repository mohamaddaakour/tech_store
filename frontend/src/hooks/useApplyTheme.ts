import { useEffect } from "react";
import { useUiStore } from "../store/uiStore";

export function useApplyTheme() {
  const theme = useUiStore((state) => state.theme);
  const lowMotion = useUiStore((state) => state.lowMotion);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("low-motion", lowMotion);
  }, [lowMotion]);
}
