import { z } from "zod";
import { noteKindEnum } from "@/db/schema";
import { id, tags } from "./common";

export const noteInput = z.object({
  kind: z.enum(noteKindEnum.enumValues).default("general"),
  companyId: id.nullable().optional(),
  applicationId: id.nullable().optional(),
  title: z.string().trim().min(1, "Title is required").max(200),
  bodyMd: z.string().max(100_000).default(""),
  tags,
});
export type NoteInput = z.infer<typeof noteInput>;
export const noteUpdate = noteInput.partial().extend({ id });

export const questionInput = z.object({
  prompt: z.string().trim().min(1, "Question is required").max(2000),
  answerMd: z.string().max(50_000).nullable().optional(),
  tags,
  difficulty: z.coerce.number().int().min(1).max(5).nullable().optional(),
  companyId: id.nullable().optional(),
  applicationId: id.nullable().optional(),
});
export type QuestionInput = z.infer<typeof questionInput>;
export const questionUpdate = questionInput.partial().extend({ id });
