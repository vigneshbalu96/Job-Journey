import { z } from "zod";
import { applicationSourceEnum, roleTypeEnum, workModeEnum } from "@/db/schema";
import { currency, id, optionalDate, optionalMoney, optionalText, optionalUrl } from "./common";

export const roleInput = z.object({
  companyId: id,
  title: z.string().trim().min(1, "Role title is required").max(200),
  roleType: z.enum(roleTypeEnum.enumValues).nullable().optional(),
  workMode: z.enum(workModeEnum.enumValues).nullable().optional(),
  location: optionalText,
  salaryMin: optionalMoney,
  salaryMax: optionalMoney,
  currency,
  sourceUrl: optionalUrl,
  source: z.enum(applicationSourceEnum.enumValues).default("other"),
  jdText: z.string().max(50_000).nullable().optional(),
  postedAt: optionalDate,
});
export type RoleInput = z.infer<typeof roleInput>;
export const roleUpdate = roleInput.partial().extend({ id });
