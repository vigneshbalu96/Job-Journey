import { z } from "zod";
import { interactionDirectionEnum, interactionKindEnum } from "@/db/schema";
import { id, optionalDate, optionalText, optionalUrl } from "./common";

export const contactInput = z.object({
  companyId: id.nullable().optional(),
  fullName: z.string().trim().min(1, "Name is required").max(200),
  email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.email().nullable())
    .nullable()
    .optional(),
  phone: optionalText,
  linkedinUrl: optionalUrl,
  title: optionalText,
  relationship: optionalText,
  referredByContactId: id.nullable().optional(),
  nextFollowUpAt: optionalDate,
  notes: optionalText,
});
export type ContactInput = z.infer<typeof contactInput>;
export const contactUpdate = contactInput.partial().extend({ id });

export const interactionInput = z.object({
  contactId: id,
  applicationId: id.nullable().optional(),
  kind: z.enum(interactionKindEnum.enumValues),
  direction: z.enum(interactionDirectionEnum.enumValues).default("out"),
  occurredAt: optionalDate,
  summary: z.string().trim().min(1, "Say what happened").max(5000),
  nextFollowUpAt: optionalDate,
});
export type InteractionInput = z.infer<typeof interactionInput>;
