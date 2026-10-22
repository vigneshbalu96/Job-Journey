"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Animated gradient border that sweeps around the box. `colors` default to the
 * accent in light and the aurora trio in dark. With `durationMs`, the sweep
 * stops after that long and leaves a static accent ring.
 * Swap target: 21st.dev `dillionverma/shine-border`.
 */
export function ShineBorder({
  className,
  children,
  borderWidth = 1.5,
  speedSec = 6,
  durationMs,
  colors,
  ...props
}: React.ComponentProps<"div"> & { borderWidth?: number; speedSec?: number; durationMs?: number; colors?: string[] }) {
  const [active, setActive] = useState(true);
  useEffect(() => {
    if (!durationMs) return;
    const t = setTimeout(() => setActive(false), durationMs);
    return () => clearTimeout(t);
  }, [durationMs]);
  const stops = (colors ?? ["var(--accent-500)", "var(--aurora-2)", "var(--aurora-3)", "var(--accent-500)"]).join(", ");

  return (
    <div className={cn("relative rounded-card", className)} {...props}>
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-700", active ? "opacity-100" : "opacity-0")}
        style={{
          padding: borderWidth,
          background: `conic-gradient(from var(--shine-angle, 0deg), ${stops})`,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          animation: `shine-spin ${speedSec}s linear infinite`,
        }}
      />
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-primary/40 transition-opacity duration-700", active ? "opacity-0" : "opacity-100")} />
      <div className="relative rounded-[inherit]">{children}</div>
    </div>
  );
}
