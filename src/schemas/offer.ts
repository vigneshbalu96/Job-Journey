import { z } from "zod";
import { offerStatusEnum, workModeEnum } from "@/db/schema";
import { currency, id, optionalDate, optionalMoney, optionalText } from "./common";

export const offerInput = z.object({
  applicationId: id,
  baseAnnual: optionalMoney,
  variableAnnual: optionalMoney,
  equityDescription: optionalText,
  equityValueAnnual: optionalMoney,
  signOn: optionalMoney,
  currency,
  location: optionalText,
  workMode: z.enum(workModeEnum.enumValues).nullable().optional(),
  noticePeriodDays: z.coerce.number().int().min(0).max(365).nullable().optional(),
  joiningDate: optionalDate,
  deadlineAt: optionalDate,
  decisionNotes: optionalText,
  status: z.enum(offerStatusEnum.enumValues).default("received"),
});
export type OfferInput = z.infer<typeof offerInput>;
export const offerUpdate = offerInput.partial().extend({ id });
