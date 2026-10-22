"use client";

import Link from "next/link";
import { LayoutGroup, motion } from "motion/react";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type Segment<T extends string> = { value: T; label: React.ReactNode; href?: string; title?: string };

/**
 * iOS segmented control. The highlight slides between segments with a shared
 * layout animation. Pass `href` on segments to navigate instead of selecting.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = "default",
  ariaLabel,
  className,
  id,
}: {
  segments: readonly Segment<T>[];
  value: T;
  onChange?: (v: T) => void;
  size?: "default" | "sm";
  ariaLabel?: string;
  className?: string;
  /** Unique per control so pills don't fly between two controls on one page. */
  id: string;
}) {
  const isLinks = segments.some((s) => s.href);
  return (
    <LayoutGroup id={id}>
      <div
        role={isLinks ? undefined : "radiogroup"}
        aria-label={ariaLabel}
        className={cn("inline-flex items-center rounded-full bg-muted/70 p-1 ring-1 ring-glass-border", className)}
      >
        {segments.map((s) => {
          const active = s.value === value;
          const inner = (
            <>
              {active && (
                <motion.span
                  layoutId={`${id}-pill`}
                  transition={springs.snappy}
                  className="absolute inset-0 rounded-full bg-card shadow-card dark:bg-input/40"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">{s.label}</span>
            </>
          );
          const cls = cn(
            "relative rounded-full font-medium transition-colors select-none",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
            active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          );
          return s.href ? (
            <Link key={s.value} href={s.href} className={cls} aria-current={active ? "page" : undefined} title={s.title}>
              {inner}
            </Link>
          ) : (
            <button key={s.value} type="button" role="radio" aria-checked={active} title={s.title} onClick={() => onChange?.(s.value)} className={cls}>
              {inner}
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
