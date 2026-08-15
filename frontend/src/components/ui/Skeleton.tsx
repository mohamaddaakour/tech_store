import { cn } from "../../lib/cn";

interface SkeletonProps {
  className?: string;
}

/**
 * A shimmering grey placeholder shaped like the content that is loading.
 *
 * Why this instead of a centred spinner: a skeleton keeps the page's layout
 * stable. The tiles land exactly where the grey blocks were, so nothing jumps
 * under the user's cursor when data arrives. A spinner that is replaced by
 * content causes a layout shift, which is both jarring and a Core Web Vitals
 * penalty.
 *
 * The shimmer is a gradient wider than the element (`200%`) whose
 * `background-position` is animated across it — see the `shimmer` keyframes in
 * index.css. It signals "working" rather than "frozen".
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      // Decorative: the loading state is announced once by the container
      // (see ProductGrid's aria-busy), not once per grey box.
      aria-hidden="true"
      className={cn(
        "rounded-control bg-surface-2 animate-shimmer",
        "bg-[linear-gradient(90deg,var(--color-surface-2)_25%,var(--color-surface-3)_50%,var(--color-surface-2)_75%)]",
        "bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
