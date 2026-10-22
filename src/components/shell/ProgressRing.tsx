"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Apple-Activity-style ring. Pure SVG; the arc animates from 0 to `value`
 * once on mount unless the user prefers reduced motion. Swap target for the
 * 21st.dev `diceui/circular-progress` component once the registry key is set.
 */
export function ProgressRing({
  value,
  size = 120,
  stroke = 12,
  className,
  children,
}: {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    const prefersReduce = reduce || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (prefersReduce) return setShown(value);
    const t = setTimeout(() => setShown(value), 40);
    return () => clearTimeout(t);
  }, [value, reduce]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, shown));
  const done = value >= 100;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }} role="img" aria-label={`${Math.round(value)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? "var(--stage-offer)" : "var(--accent-500)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2, 0, 0, 1)", filter: done ? "drop-shadow(0 0 6px var(--stage-offer-glow))" : undefined }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
