import type { ReactNode } from "react";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { usePresence } from "../../hooks/usePresence";
import { Button } from "./Button";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

const EXIT_DURATION = 320;

export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  useEscapeKey(open, onClose);
  useBodyScrollLock(open);
  const rendered = usePresence(open, EXIT_DURATION);

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={onClose}
        className={[
          "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={[
          "relative flex h-full w-full max-w-sm flex-col",
          "bg-surface ring-1 ring-line shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id="drawer-title" className="text-base font-semibold text-ink">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <span aria-hidden="true" className="text-lg leading-none">
              &times;
            </span>
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && <footer className="border-t border-line px-5 py-4">{footer}</footer>}
      </div>
    </div>
  );
}
