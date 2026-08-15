import type { ReactNode } from "react";

interface EmptyStateProps {
  /** A single emoji or glyph. Decorative only. */
  icon?: string;
  title: string;
  message?: string;
  /** Optional call to action — the way *out* of the empty state. */
  action?: ReactNode;
}

/**
 * Shown when a list has nothing in it, or a request failed.
 *
 * Empty states are worth a real component because the alternative — rendering
 * nothing — leaves the user staring at blank space wondering whether the page is
 * broken or still loading. A short explanation plus a way forward turns a dead end
 * into a next step.
 */
export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center animate-fade-in">
      {icon && (
        // aria-hidden: a screen reader reading out the name of an emoji adds
        // nothing, because the title below already says it in words.
        <span aria-hidden="true" className="text-3xl opacity-60">
          {icon}
        </span>
      )}

      <h3 className="text-sm font-semibold text-ink">{title}</h3>

      {message && <p className="max-w-xs text-sm text-ink-muted">{message}</p>}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
