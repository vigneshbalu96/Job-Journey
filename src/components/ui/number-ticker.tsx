"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Counts from 0 to `value` with an ease-out curve. Server renders the final
 * value (no flash of zeros for crawlers or reduced-motion users); the client
 * replays the count once on mount.
 */
export function NumberTicker({
  value,
  duration = 900,
  format = (n: number) => Math.round(n).toLocaleString("en-IN"),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    // The hook can report `false` on the very first render before it reads the
    // media query, so check it synchronously too.
    const prefersReduce = reduce || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (prefersReduce || started.current || value === 0) return;
    started.current = true;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);

  return (
    <span className={className} suppressHydrationWarning>
      {format(shown)}
    </span>
  );
}
