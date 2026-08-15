import { cn } from "./cn";

/** Visual weight, which should match how important the action is. */
export type ButtonVariant =
  | "primary"    /** the one thing we want you to do on this screen */
  | "secondary"  /** a real but secondary action */
  | "ghost"      /** low emphasis: cancel, icon buttons */
  | "danger";    /** destructive: remove, cancel an order */

export type ButtonSize = "sm" | "md" | "lg";

/**
 * Shared base classes.
 *
 * `active:scale-[0.97]` is the whole tactile feel of the app — a control that visibly
 * compresses confirms the press landed, which matters most on touch where there is no
 * hover state to fall back on.
 *
 * `disabled:pointer-events-none` accompanies the opacity change so hover styles do not
 * fire on something unclickable, which otherwise reads as broken.
 */
const baseClasses = [
  "inline-flex items-center justify-center gap-2",
  "font-medium whitespace-nowrap select-none",
  // `rounded-control` is generated from `--radius-control` in index.css: Tailwind v4
  // maps the `--radius-*` namespace onto the `rounded-*` utilities.
  "rounded-control",
  "transition-[transform,background-color,color,box-shadow] duration-150 ease-out",
  "active:scale-[0.97]",
  "disabled:opacity-50 disabled:pointer-events-none",
].join(" ");

const variantClasses: Record<ButtonVariant, string> = {
  // Dark text on the bright accent: white-on-green fails contrast, near-black passes.
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

/**
 * Builds the class string for a button-shaped element.
 *
 * Lives in `lib/` rather than beside the `Button` component for a practical reason:
 * Vite's fast refresh only works on modules that export components *exclusively*.
 * Mixing a plain helper export into `Button.tsx` makes every edit to that file trigger
 * a full page reload instead of a hot update (and ESLint's
 * `react-refresh/only-export-components` rule flags it).
 *
 * Exported so a `<Link>` can look exactly like a button, without `Button` needing to
 * become a polymorphic `as`/`asChild` component — that kind of polymorphism is where
 * component libraries drown in TypeScript generics, and the real requirement here is
 * only "share the styling".
 */
export function buttonClasses(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}): string {
  const { variant = "primary", size = "md", fullWidth = false, className } = options ?? {};

  return cn(baseClasses, variantClasses[variant], sizeClasses[size], fullWidth && "w-full", className);
}
