import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

interface CountUpProps {
  value: number;
  /** Milliseconds for the whole count. */
  duration?: number;
  /** Formats the in-progress number, e.g. as currency. Defaults to rounding. */
  format?: (value: number) => string;
}

/**
 * Counts from 0 up to `value` — the "animated statistics" from SUBJECT.md.
 *
 * Driven by `requestAnimationFrame` rather than `setInterval`. rAF is synchronised to
 * the display's refresh rate, so the count is smooth, and the browser suspends it
 * entirely on a background tab instead of burning CPU animating something nobody is
 * looking at.
 *
 * Eased with easeOutQuart so it sprints then settles. A linear count reads as
 * mechanical; decelerating into the final number feels deliberate.
 */
export function CountUp({ value, duration = 1200, format }: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    // Nothing to animate. Returning early — rather than calling setState with the
    // final value — keeps this effect free of the cascading-render problem that
    // setting state inside an effect causes. The reduced-motion case is handled by
    // deriving `displayValue` below instead.
    if (reduceMotion) return;

    let frameId = 0;
    const startTime = performance.now();

    function tick(now: number) {
      const progress = Math.min(1, (now - startTime) / duration);
      // easeOutQuart: fast start, gentle stop.
      const eased = 1 - Math.pow(1 - progress, 4);

      setAnimatedValue(value * eased);

      if (progress < 1) frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    // Cancel on unmount, or when `value` changes mid-flight — otherwise two
    // animations fight over the same state and the number visibly jitters.
    return () => cancelAnimationFrame(frameId);
  }, [value, duration, reduceMotion]);

  /**
   * Derived, not stored.
   *
   * Under reduced motion the target value is rendered immediately; otherwise we show
   * whatever the animation has reached. Deriving it means there is no state to
   * synchronise, so the number is correct on the very first render.
   */
  const displayValue = reduceMotion ? value : animatedValue;

  return <>{format ? format(displayValue) : Math.round(displayValue).toLocaleString()}</>;
}
