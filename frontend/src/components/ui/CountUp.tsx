import { useEffect, useState } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface CountUpProps {
  value: number;

  duration?: number;

  format?: (value: number) => string;
}

export function CountUp({ value, duration = 1200, format }: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;

    let frameId = 0;
    const startTime = performance.now();

    function tick(now: number) {
      const progress = Math.min(1, (now - startTime) / duration);

      const eased = 1 - Math.pow(1 - progress, 4);

      setAnimatedValue(value * eased);

      if (progress < 1) frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [value, duration, reduceMotion]);

  const displayValue = reduceMotion ? value : animatedValue;

  return <>{format ? format(displayValue) : Math.round(displayValue).toLocaleString()}</>;
}
