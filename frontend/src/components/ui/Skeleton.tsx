import { cn } from "../../lib/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div

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
