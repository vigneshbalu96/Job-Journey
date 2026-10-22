import { z } from "zod";
import { documentKindEnum } from "@/db/schema";
import { id, optionalText } from "./common";

export const ALLOWED_DOC_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/markdown", "text/plain"];
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

export const documentRegister = z.object({
  kind: z.enum(documentKindEnum.enumValues),
  name: z.string().trim().min(1).max(120),
  storagePath: z.string().min(1),
  mimeType: z.string().refine((m) => ALLOWED_DOC_TYPES.includes(m), "Unsupported file type"),
  sizeBytes: z.number().int().positive().max(MAX_DOC_BYTES),
  parentId: id.nullable().optional(),
  notes: optionalText,
});
export type DocumentRegister = z.infer<typeof documentRegister>;

export const uploadSignRequest = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.string().refine((m) => ALLOWED_DOC_TYPES.includes(m), "Unsupported file type"),
  sizeBytes: z.number().int().positive().max(MAX_DOC_BYTES),
});
