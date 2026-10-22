"use client";

import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/motion";
import { CLOSE_REASON_LABEL, STAGE_LABEL } from "@/lib/stages";
import type { ApplicationStage, CloseReason } from "@/db/schema";
import { STAGE_TONE } from "./constants";

export function StageBadge({
  stage,
  closeReason,
  className,
  pop,
}: {
  stage: ApplicationStage;
  closeReason?: CloseReason | null;
  className?: string;
  /** Re-animates (scale 0.8 → 1) whenever the stage changes. */
  pop?: boolean;
}) {
  const label = stage === "closed" && closeReason ? CLOSE_REASON_LABEL[closeReason] : STAGE_LABEL[stage];
  const badge = (
    <Badge variant="secondary" className={cn("border-0", STAGE_TONE[stage], className)}>
      {label}
    </Badge>
  );
  if (!pop) return badge;
  return (
    <motion.span key={stage} initial={{ scale: 0.8, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} transition={springs.pop} className="inline-flex">
      {badge}
    </motion.span>
  );
}
