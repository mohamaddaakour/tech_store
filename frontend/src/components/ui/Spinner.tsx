import { cn } from "../../lib/cn";

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4 rounded-full border-2 border-current border-t-transparent animate-spin-slow",
        className,
      )}
    />
  );
}
