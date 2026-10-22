import type { ApplicationStage, CloseReason } from "@/db/schema";

export const STAGES: readonly ApplicationStage[] = ["saved", "applied", "screening", "interview", "offer", "closed"];

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  closed: "Closed",
};

export const CLOSE_REASON_LABEL: Record<CloseReason, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  ghosted: "Ghosted",
};

export const OPEN_STAGES = STAGES.filter((s) => s !== "closed");

export function stageIndex(stage: ApplicationStage) {
  return STAGES.indexOf(stage);
}

export type TransitionInput = {
  from: ApplicationStage;
  to: ApplicationStage;
  closeReason?: CloseReason | null;
};

/**
 * Stage moves are deliberately permissive (a kanban drag can go either way),
 * with two hard rules: closing needs a reason, and nothing else may carry one.
 */
export function validateTransition(input: TransitionInput): { ok: true } | { ok: false; error: string } {
  if (input.from === input.to && input.to !== "interview") {
    return { ok: false, error: "Application is already in that stage" };
  }
  if (input.to === "closed" && !input.closeReason) {
    return { ok: false, error: "Choose why the application closed" };
  }
  if (input.to !== "closed" && input.closeReason) {
    return { ok: false, error: "Only closed applications have a close reason" };
  }
  return { ok: true };
}

/** Default days after entering a stage before a follow-up task is due. */
export const DEFAULT_FOLLOW_UP_DAYS: Partial<Record<ApplicationStage, number>> = {
  applied: 7,
  screening: 5,
  interview: 3,
  offer: 2,
};

export function followUpDueAt(
  stage: ApplicationStage,
  enteredAt: Date,
  overrides?: Partial<Record<ApplicationStage, number>> | null,
): Date | null {
  const days = overrides?.[stage] ?? DEFAULT_FOLLOW_UP_DAYS[stage];
  if (!days) return null;
  const due = new Date(enteredAt);
  due.setDate(due.getDate() + days);
  due.setHours(9, 0, 0, 0);
  return due;
}

/** Chores created the day an application moves to Applied. */
export const APPLY_CHECKLIST = [
  "Attach the resume version you sent",
  "Save the portal login / application ID",
  "Note who to follow up with",
] as const;

export const TASK_KIND_LABEL = {
  follow_up: "Follow-up",
  interview: "Interview",
  deadline: "Deadline",
  apply: "Apply step",
  custom: "Other",
} as const;
