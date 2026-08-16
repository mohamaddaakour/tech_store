import { cn } from "./cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

const baseClasses = [
  "inline-flex items-center justify-center gap-2",
  "font-medium whitespace-nowrap select-none",

  "rounded-control",
  "transition-[transform,background-color,color,box-shadow] duration-150 ease-out",
  "active:scale-[0.97]",
  "disabled:opacity-50 disabled:pointer-events-none",
].join(" ");

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent-hover active:bg-accent-press shadow-lg shadow-accent/15",
  secondary: "bg-surface-2 text-ink hover:bg-surface-3 ring-1 ring-line",
  ghost: "bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
};

export function buttonClasses(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}): string {
  const { variant = "primary", size = "md", fullWidth = false, className } = options ?? {};

  return cn(baseClasses, variantClasses[variant], sizeClasses[size], fullWidth && "w-full", className);
}
