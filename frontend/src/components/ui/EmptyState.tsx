import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;

  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center animate-fade-in">
      {icon && (
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
