"use client";

import { motion } from "motion/react";
import { springs } from "@/lib/motion";

/** Re-mounts on every navigation: a short fade/slide so route changes feel intentional. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={springs.gentle}>
      {children}
    </motion.div>
  );
}
