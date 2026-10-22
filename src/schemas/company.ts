import { z } from "zod";
import { id, optionalText, optionalUrl } from "./common";

export const companyInput = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  website: optionalUrl,
  domain: optionalText,
  industry: optionalText,
  size: optionalText,
  hqLocation: optionalText,
  linkedinUrl: optionalUrl,
  notes: optionalText,
});
export type CompanyInput = z.infer<typeof companyInput>;
export const companyUpdate = companyInput.partial().extend({ id });
