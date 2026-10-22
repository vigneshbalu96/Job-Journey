"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";

/** Theme + motion config for the whole app. `reducedMotion="user"` honours the OS setting everywhere. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
