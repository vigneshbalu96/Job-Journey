"use server";

import { revalidatePath } from "next/cache";
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { applications, documents } from "@/db/schema";
import { action, ActionError } from "@/lib/action";
import { createRow, findOne, softDeleteRow, updateRow, scoped } from "@/lib/repo";
import { documentRegister, id } from "@/schemas";

/**
 * Called after the browser has uploaded to the signed URL. The storage path is
 * trusted only if it sits under the caller's own prefix.
 */
export const registerDocument = action(documentRegister, async (input, ctx) => {
  if (!input.storagePath.startsWith(`${ctx.userId}/`)) throw new ActionError("Invalid storage path");
  const row = await db.transaction(async (tx) => {
    const c = { userId: ctx.userId, db: tx };
    const [{ latest }] = await tx
      .select({ latest: max(documents.version) })
      .from(documents)
      .where(scoped(documents, ctx.userId, and(eq(documents.kind, input.kind), eq(documents.name, input.name))));
    return createRow(c, documents, { ...input, version: (latest ?? 0) + 1 });
  });
  revalidatePath("/documents");
  return row;
});

export const renameDocument = action(z.object({ id, name: z.string().trim().min(1).max(120), notes: z.string().max(2000).nullable().optional() }), async ({ id, ...patch }, ctx) => {
  const row = await updateRow(ctx, documents, id, patch);
  revalidatePath("/documents");
  return row;
});

export const deleteDocument = action(z.object({ id }), async ({ id }, ctx) => {
  await softDeleteRow(ctx, documents, id);
  revalidatePath("/documents");
  return { id };
});

/** Attach a resume / cover letter version to an application. */
export const attachDocument = action(
  z.object({ applicationId: id, documentId: id.nullable() , slot: z.enum(["resume", "cover_letter"]) }),
  async ({ applicationId, documentId, slot }, ctx) => {
    if (documentId) {
      const doc = await findOne(ctx, documents, documentId);
      if (!doc) throw new ActionError("Document not found");
      if (doc.kind !== slot) throw new ActionError(`That file is a ${doc.kind.replace("_", " ")}, not a ${slot.replace("_", " ")}`);
    }
    const patch = slot === "resume" ? { resumeDocumentId: documentId } : { coverLetterDocumentId: documentId };
    const row = await updateRow(ctx, applications, applicationId, patch);
    revalidatePath(`/applications/${applicationId}`);
    return row;
  },
);
