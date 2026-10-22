import { z } from "zod";
import { applicationStageEnum } from "@/db/schema";

export const profileUpdate = z.object({
  displayName: z.string().trim().max(100).nullable().optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  digestHour: z.coerce.number().int().min(0).max(23).optional(),
  digestEnabled: z.boolean().optional(),
  weeklyTarget: z.coerce.number().int().min(1).max(50).optional(),
  masterProfile: z.string().max(20_000).nullable().optional(),
  targetRoles: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  targetLocations: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  followUpDays: z.partialRecord(z.enum(applicationStageEnum.enumValues), z.number().int().min(0).max(60)).optional(),
});
export type ProfileUpdate = z.infer<typeof profileUpdate>;
