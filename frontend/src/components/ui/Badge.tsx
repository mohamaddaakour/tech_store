import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type BadgeTone = "neutral" | "accent" | "success" | "warn" | "danger" | "info";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

/**
 * A small status pill.
 *
 * Each tone pairs a tinted background with matching text, both from theme tokens,
 * so the pills stay legible when the theme flips to light — a hardcoded
 * `bg-green-900` would become unreadable.
 */
const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-3 text-ink-muted",
  accent: "bg-accent/15 text-accent",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        "text-[10px] font-semibold uppercase tracking-wider",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
