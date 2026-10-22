import { z } from "zod";
import { applicationStageEnum, closeReasonEnum } from "@/db/schema";
import { id, optionalDate, optionalText } from "./common";
import { companyInput } from "./company";
import { roleInput } from "./role";

/** Create an application, optionally creating the company and role inline. */
export const applicationCreate = z.object({
  company: z.union([z.object({ id }), companyInput]),
  role: roleInput.omit({ companyId: true }),
  stage: z.enum(applicationStageEnum.enumValues).default("saved"),
  priority: z.coerce.number().int().min(1).max(5).default(3),
  appliedAt: optionalDate,
  referredByContactId: id.nullable().optional(),
  resumeDocumentId: id.nullable().optional(),
  coverLetterDocumentId: id.nullable().optional(),
  note: optionalText,
});
export type ApplicationCreate = z.infer<typeof applicationCreate>;

export const applicationUpdate = z.object({
  id,
  priority: z.coerce.number().int().min(1).max(5).optional(),
  appliedAt: optionalDate,
  referredByContactId: id.nullable().optional(),
  resumeDocumentId: id.nullable().optional(),
  coverLetterDocumentId: id.nullable().optional(),
});

export const stageTransition = z.object({
  id,
  to: z.enum(applicationStageEnum.enumValues),
  closeReason: z.enum(closeReasonEnum.enumValues).nullable().optional(),
  roundLabel: optionalText,
  occurredAt: optionalDate,
  /** When moving to Interview: creates a dated interview task. */
  interviewAt: optionalDate,
  note: optionalText,
});
export type StageTransition = z.infer<typeof stageTransition>;
