import type { ApplicationStage } from "@/db/schema";

export const STAGE_TONE: Record<ApplicationStage, string> = {
  saved: "bg-stage-saved-soft text-stage-saved-fg",
  applied: "bg-stage-applied-soft text-stage-applied-fg dark:[box-shadow:0_0_14px_var(--stage-applied-glow)]",
  screening: "bg-stage-screening-soft text-stage-screening-fg dark:[box-shadow:0_0_14px_var(--stage-screening-glow)]",
  interview: "bg-stage-interview-soft text-stage-interview-fg dark:[box-shadow:0_0_14px_var(--stage-interview-glow)]",
  offer: "bg-stage-offer-soft text-stage-offer-fg dark:[box-shadow:0_0_14px_var(--stage-offer-glow)]",
  closed: "bg-stage-closed-soft text-stage-closed-fg",
};

/** Solid dot colour per stage, for column headers and timelines. */
export const STAGE_DOT: Record<ApplicationStage, string> = {
  saved: "bg-stage-saved",
  applied: "bg-stage-applied",
  screening: "bg-stage-screening",
  interview: "bg-stage-interview",
  offer: "bg-stage-offer",
  closed: "bg-stage-closed",
};

export const SOURCE_OPTIONS = [
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "company_site", label: "Company site" },
  { value: "recruiter", label: "Recruiter" },
  { value: "job_board", label: "Job board" },
  { value: "other", label: "Other" },
] as const;

export const WORK_MODE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
] as const;

export const ROLE_TYPE_OPTIONS = [
  { value: "fulltime", label: "Full-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Internship" },
] as const;

export const CLOSE_REASON_OPTIONS = [
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "I withdrew" },
  { value: "ghosted", label: "Ghosted" },
  { value: "accepted", label: "Accepted the offer" },
] as const;
