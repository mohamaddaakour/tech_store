import { useEffect, useState } from "react";

export function usePresence(open: boolean, exitDurationMs: number): boolean {
  const [rendered, setRendered] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setRendered(true);
  }

  useEffect(() => {
    if (open || !rendered) return;
    const timer = setTimeout(() => setRendered(false), exitDurationMs);
    return () => clearTimeout(timer);
  }, [open, exitDurationMs, rendered]);

  return rendered;
}
