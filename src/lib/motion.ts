import type { Transition, Variants } from "motion/react";

/** Spring presets tuned to feel like iOS: quick settle, slight overshoot only on `pop`. */
export const springs = {
  snappy: { type: "spring", stiffness: 500, damping: 35, mass: 0.8 } satisfies Transition,
  gentle: { type: "spring", stiffness: 170, damping: 26 } satisfies Transition,
  pop: { type: "spring", stiffness: 700, damping: 20 } satisfies Transition,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: springs.gentle },
};

export const hoverLift = {
  whileHover: { y: -2, scale: 1.01 },
  whileTap: { scale: 0.99 },
  transition: springs.snappy,
} as const;
