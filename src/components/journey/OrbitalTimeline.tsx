"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/motion";
import { STAGE_DOT, STAGE_TONE } from "@/components/pipeline/constants";
import { shortDate } from "@/lib/format";
import type { Milestone } from "@/lib/queries/milestones";

/**
 * Milestones orbit a centre node ("Day N"). Hover or focus a node to read it;
 * click to open the application. Below `sm` the same data renders as a list.
 * Swap target: 21st.dev `jatin-yadav05/radial-orbital-timeline` once the
 * registry key is available; this version keeps the same props.
 */
export function OrbitalTimeline({ milestones, day }: { milestones: Milestone[]; day: number }) {
  const [active, setActive] = useState<string | null>(milestones.at(-1)?.id ?? null);
  const reduce = useReducedMotion();
  const size = 420;
  const r = 165;
  const current = milestones.find((m) => m.id === active) ?? milestones.at(-1);

  if (milestones.length === 0) {
    return <p className="text-sm text-muted-foreground">Milestones appear as the search progresses: first application, first interview, offers.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
      {/* Orbit (tablet and up) */}
      <div className="relative mx-auto hidden sm:block" style={{ width: size, height: size }}>
        <div className="absolute inset-[18%] rounded-full border border-dashed border-glass-border" />
        <div className="absolute inset-[6%] rounded-full border border-glass-border/70" />
        <motion.div
          className="absolute inset-[6%] rounded-full"
          style={{ background: "conic-gradient(from 0deg, var(--accent-500) 0deg, transparent 60deg)" , opacity: 0.12, maskImage: "radial-gradient(circle, transparent 62%, black 63%)" }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 24, ease: "linear", repeat: Infinity }}
        />
        {/* centre */}
        <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-card shadow-float ring-1 ring-glass-border">
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Day</span>
          <span className="text-stat tabular leading-none">{day}</span>
        </div>
        {milestones.map((m, i) => {
          const angle = -90 + (i / milestones.length) * 360;
          const rad = (angle * Math.PI) / 180;
          const x = size / 2 + r * Math.cos(rad);
          const y = size / 2 + r * Math.sin(rad);
          const isActive = m.id === active;
          return (
            <motion.button
              key={m.id}
              type="button"
              onMouseEnter={() => setActive(m.id)}
              onFocus={() => setActive(m.id)}
              onClick={() => setActive(m.id)}
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...springs.pop, delay: reduce ? 0 : 0.08 * i }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card transition-transform focus:outline-none focus-visible:ring-primary",
                STAGE_DOT[m.stage],
                isActive ? "h-6 w-6 scale-110 shadow-[0_0_0_6px_var(--accent-50)] dark:shadow-[0_0_18px_var(--stage-interview-glow)]" : "h-4 w-4 hover:scale-125",
              )}
              style={{ left: x, top: y }}
              aria-label={`${m.title}, ${shortDate(m.date)}`}
            />
          );
        })}
      </div>

      {/* Detail card (tablet and up) */}
      {current && (
        <motion.div key={current.id} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={springs.gentle} className="hidden sm:block">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{shortDate(current.date)}</p>
          <h3 className="mt-1 text-section">{current.title}</h3>
          {current.subtitle && <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>}
          <div className="mt-3 flex items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STAGE_TONE[current.stage])}>{current.stage}</span>
            <Link href={current.href} className="text-sm font-medium text-primary hover:underline">Open application →</Link>
          </div>
          <ol className="mt-5 flex flex-wrap gap-1.5">
            {milestones.map((m, i) => (
              <li key={m.id}>
                <button type="button" onClick={() => setActive(m.id)} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors", m.id === active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
        </motion.div>
      )}

      {/* Phone: plain milestone list */}
      <ol className="space-y-2 sm:hidden">
        {milestones.map((m) => (
          <li key={m.id}>
            <Link href={m.href} className="flex items-center gap-3 rounded-xl border border-glass-border bg-card px-3 py-2.5 shadow-card">
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STAGE_DOT[m.stage])} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{m.title}</span>
                {m.subtitle && <span className="block truncate text-xs text-muted-foreground">{m.subtitle}</span>}
              </span>
              <span className="text-xs text-muted-foreground">{shortDate(m.date)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
