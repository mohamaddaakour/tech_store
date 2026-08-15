import { cn } from "../../lib/cn";

interface SpinnerProps {
  className?: string;
}

/**
 * A small indeterminate loading indicator.
 *
 * Built from a bordered circle with one edge left transparent — when it rotates,
 * that gap reads as a spinning arc. It needs no SVG and no image.
 *
 * `currentColor` on the border means the spinner automatically matches the text
 * colour of whatever contains it, so the same component looks right inside a
 * green primary button and on a dark background.
 *
 * `aria-hidden` because it is decorative: a screen reader announcing "image"
 * here is noise. The surrounding element carries the real message — see how
 * `Button` sets `aria-busy` while loading.
 */
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
