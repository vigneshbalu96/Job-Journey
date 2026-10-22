import { z } from "zod";
import { taskKindEnum } from "@/db/schema";
import { id, optionalDate } from "./common";

export const taskInput = z.object({
  kind: z.enum(taskKindEnum.enumValues).default("custom"),
  title: z.string().trim().min(1, "Title is required").max(200),
  dueAt: z.union([z.date(), z.string()]).transform((v) => (v instanceof Date ? v : new Date(v))),
  applicationId: id.nullable().optional(),
  contactId: id.nullable().optional(),
});
export type TaskInput = z.infer<typeof taskInput>;
export const taskUpdate = taskInput.partial().extend({ id, snoozedUntil: optionalDate });
