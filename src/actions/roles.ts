"use server";

import { revalidatePath } from "next/cache";
import { roles } from "@/db/schema";
import { action } from "@/lib/action";
import { updateRow } from "@/lib/repo";
import { roleUpdate } from "@/schemas";

/** Edit the posting itself: title, JD, location, salary. Company stays fixed. */
export const updateRole = action(roleUpdate, async ({ id, ...patch }, ctx) => {
  const row = await updateRow(ctx, roles, id, patch);
  revalidatePath("/pipeline");
  revalidatePath(`/companies/${row.companyId}`);
  return row;
});
