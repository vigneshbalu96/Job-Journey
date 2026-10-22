"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { tasks } from "@/db/schema";
import { action } from "@/lib/action";
import { createRow, softDeleteRow, updateRow } from "@/lib/repo";
import { id, taskInput, taskUpdate } from "@/schemas";

function revalidate(applicationId?: string | null) {
  revalidatePath("/today");
  revalidatePath("/journey");
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
}

export const createTask = action(taskInput, async (input, ctx) => {
  const row = await createRow(ctx, tasks, input);
  revalidate(row.applicationId);
  return row;
});

export const updateTask = action(taskUpdate, async ({ id, ...patch }, ctx) => {
  const row = await updateRow(ctx, tasks, id, patch);
  revalidate(row.applicationId);
  return row;
});

export const completeTask = action(z.object({ id, done: z.boolean().default(true) }), async ({ id, done }, ctx) => {
  const row = await updateRow(ctx, tasks, id, { completedAt: done ? new Date() : null });
  revalidate(row.applicationId);
  return row;
});

export const snoozeTask = action(z.object({ id, days: z.number().int().min(1).max(30) }), async ({ id, days }, ctx) => {
  const until = new Date();
  until.setDate(until.getDate() + days);
  until.setHours(9, 0, 0, 0);
  const row = await updateRow(ctx, tasks, id, { snoozedUntil: until, dueAt: until });
  revalidate(row.applicationId);
  return row;
});

export const deleteTask = action(z.object({ id }), async ({ id }, ctx) => {
  await softDeleteRow(ctx, tasks, id);
  revalidate();
  return { id };
});
