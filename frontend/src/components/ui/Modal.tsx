import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional sub-heading under the title. */
  description?: string;
  children: ReactNode;
}

/**
 * A centred dialog. Same mechanics as {@link Drawer} — backdrop, Escape,
 * scroll lock, `AnimatePresence` for the exit animation — but a different shape
 * and entrance, because it is used for a different kind of task.
 *
 * A drawer slides in from the edge and is for something *alongside* the page (your
 * cart, which belongs to the store you are still browsing). A modal appears in the
 * middle and is for something that *interrupts* (signing in — nothing else matters
 * until it is done or dismissed). Matching the motion to that distinction is what
 * makes the interface feel considered rather than decorated.
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  useEscapeKey(open, onClose);
  useBodyScrollLock(open);

  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            // Scaling up from 96% while fading in reads as the dialog coming
            // *towards* the viewer. Starting much smaller (say 0.8) looks
            // cartoonish; this is deliberately a small, quick move.
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.25, 1, 0.5, 1] }
            }
            className="relative w-full max-w-sm rounded-panel bg-surface p-6 ring-1 ring-line shadow-2xl"
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
