import type { ReactNode } from "react";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { usePresence } from "../../hooks/usePresence";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

const EXIT_DURATION = 200;

export function Modal({ open, onClose, title, description, children }: ModalProps) {
  useEscapeKey(open, onClose);
  useBodyScrollLock(open);
  const rendered = usePresence(open, EXIT_DURATION);

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className={[
          "absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={[
          "relative w-full max-w-sm rounded-panel bg-surface p-6 ring-1 ring-line shadow-2xl",
          "transition-all duration-200 ease-out",
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0",
        ].join(" ")}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-ink-muted">{description}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <span aria-hidden="true" className="text-lg leading-none">
              &times;
            </span>
          </Button>
        </div>

        {children}
      </div>
    </div>
  );
}
