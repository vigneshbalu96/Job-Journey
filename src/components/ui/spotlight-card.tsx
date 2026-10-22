"use client";

import { useCallback, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Card with a cursor-following radial glow (accent-tinted). Position is
 * written to CSS variables inside a requestAnimationFrame so hovering a grid
 * of 30 tiles stays cheap. Inert under reduced motion.
 * Swap target: 21st.dev `jahed/spotlight-card`.
 */
export function SpotlightCard({ className, children, radius = 260, ...props }: React.ComponentProps<"div"> & { radius?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const reduce = useReducedMotion();

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduce || !ref.current) return;
      const el = ref.current;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        el.style.setProperty("--spot-x", `${x}px`);
        el.style.setProperty("--spot-y", `${y}px`);
        el.style.setProperty("--spot-o", "1");
      });
    },
    [reduce],
  );
  const onLeave = useCallback(() => ref.current?.style.setProperty("--spot-o", "0"), []);

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("group/spot relative overflow-hidden rounded-card border border-glass-border bg-card shadow-card", className)}
      style={{ "--spot-r": `${radius}px` } as React.CSSProperties}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[var(--spot-o,0)] transition-opacity duration-300 motion-reduce:hidden"
        style={{
          background:
            "radial-gradient(var(--spot-r) circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in oklch, var(--accent-500) 18%, transparent), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-card opacity-[var(--spot-o,0)] transition-opacity duration-300 motion-reduce:hidden"
        style={{
          padding: 1,
          background:
            "radial-gradient(calc(var(--spot-r) * 0.8) circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in oklch, var(--accent-500) 55%, transparent), transparent 70%)",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
