"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { companies } from "@/db/schema";
import { action } from "@/lib/action";
import { createRow, softDeleteRow, updateRow } from "@/lib/repo";
import { companyInput, companyUpdate, id } from "@/schemas";

export const createCompany = action(companyInput, async (input, ctx) => {
  const row = await createRow(ctx, companies, input);
  revalidatePath("/companies");
  return row;
});

export const updateCompany = action(companyUpdate, async ({ id, ...patch }, ctx) => {
  const row = await updateRow(ctx, companies, id, patch);
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  return row;
});

export const deleteCompany = action(z.object({ id }), async ({ id }, ctx) => {
  await softDeleteRow(ctx, companies, id);
  revalidatePath("/companies");
  return { id };
});
