"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { notes, questions } from "@/db/schema";
import { action } from "@/lib/action";
import { createRow, findOne, softDeleteRow, updateRow } from "@/lib/repo";
import { id, noteInput, noteUpdate, questionInput, questionUpdate } from "@/schemas";

function revalidateNote(n: { applicationId: string | null; companyId: string | null } | undefined) {
  if (n?.applicationId) revalidatePath(`/applications/${n.applicationId}`);
  if (n?.companyId) revalidatePath(`/companies/${n.companyId}`);
  revalidatePath("/journey");
}

export const createNote = action(noteInput, async (input, ctx) => {
  const row = await createRow(ctx, notes, input);
  revalidateNote(row);
  return row;
});

export const updateNote = action(noteUpdate, async ({ id, ...patch }, ctx) => {
  const row = await updateRow(ctx, notes, id, patch);
  revalidateNote(row);
  return row;
});

export const deleteNote = action(z.object({ id }), async ({ id }, ctx) => {
  const row = await findOne(ctx, notes, id);
  await softDeleteRow(ctx, notes, id);
  revalidateNote(row);
  return { id };
});

export const createQuestion = action(questionInput, async (input, ctx) => {
  const row = await createRow(ctx, questions, input);
  revalidatePath("/questions");
  revalidateNote(row);
  return row;
});

export const updateQuestion = action(questionUpdate, async ({ id, ...patch }, ctx) => {
  const row = await updateRow(ctx, questions, id, patch);
  revalidatePath("/questions");
  revalidateNote(row);
  return row;
});

export const deleteQuestion = action(z.object({ id }), async ({ id }, ctx) => {
  await softDeleteRow(ctx, questions, id);
  revalidatePath("/questions");
  return { id };
});

/** "This came up again": bump the counter and timestamp. */
export const markQuestionAsked = action(z.object({ id }), async ({ id }, ctx) => {
  const row = await updateRow(ctx, questions, id, {
    askedCount: sql`${questions.askedCount} + 1` as unknown as number,
    lastAskedAt: new Date(),
  });
  revalidatePath("/questions");
  return row;
});
