"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { action } from "@/lib/action";
import { audit, diffRows } from "@/lib/repo";
import { profileUpdate } from "@/schemas";

/** profiles has no deletedAt and is keyed by the auth id, so it is audited by hand. */
export const updateProfile = action(profileUpdate, async (patch, ctx) => {
  const row = await db.transaction(async (tx) => {
    const [before] = await tx.select().from(profiles).where(eq(profiles.id, ctx.userId)); // unscoped-ok: keyed by own id
    const [after] = await tx
      .update(profiles)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(profiles.id, ctx.userId))
      .returning();
    const diff = diffRows(before as Record<string, unknown>, after as Record<string, unknown>);
    if (Object.keys(diff.after).length) {
      await audit(tx, { userId: ctx.userId, tableName: "profiles", rowId: ctx.userId, action: "update", ...diff });
    }
    return after;
  });
  revalidatePath("/settings");
  revalidatePath("/today");
  return row;
});
