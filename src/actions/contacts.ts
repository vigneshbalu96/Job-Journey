"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { contacts, interactions } from "@/db/schema";
import { action } from "@/lib/action";
import { createRow, findOne, softDeleteRow, updateRow } from "@/lib/repo";
import { ActionError } from "@/lib/action";
import { contactInput, contactUpdate, id, interactionInput } from "@/schemas";

function revalidate(contactId?: string, companyId?: string | null) {
  revalidatePath("/contacts");
  revalidatePath("/today");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
  if (companyId) revalidatePath(`/companies/${companyId}`);
}

export const createContact = action(contactInput, async (input, ctx) => {
  const row = await createRow(ctx, contacts, input);
  revalidate(row.id, row.companyId);
  return row;
});

export const updateContact = action(contactUpdate, async ({ id, ...patch }, ctx) => {
  const row = await updateRow(ctx, contacts, id, patch);
  revalidate(row.id, row.companyId);
  return row;
});

export const deleteContact = action(z.object({ id }), async ({ id }, ctx) => {
  const row = await findOne(ctx, contacts, id);
  await softDeleteRow(ctx, contacts, id);
  revalidate(undefined, row?.companyId);
  return { id };
});

/** Log a touch with a contact; bumps lastTouchAt and optionally sets the next follow-up. */
export const logInteraction = action(interactionInput, async ({ nextFollowUpAt, ...input }, ctx) => {
  const result = await db.transaction(async (tx) => {
    const c = { userId: ctx.userId, db: tx };
    const contact = await findOne(c, contacts, input.contactId);
    if (!contact) throw new ActionError("Contact not found");
    const occurredAt = input.occurredAt ?? new Date();
    const row = await createRow(c, interactions, { ...input, occurredAt });
    const patch: Partial<typeof contacts.$inferInsert> = {};
    if (!contact.lastTouchAt || contact.lastTouchAt < occurredAt) patch.lastTouchAt = occurredAt;
    if (nextFollowUpAt !== undefined) patch.nextFollowUpAt = nextFollowUpAt;
    if (Object.keys(patch).length) await updateRow(c, contacts, contact.id, patch);
    return { row, contact };
  });
  revalidate(result.contact.id, result.contact.companyId);
  if (input.applicationId) revalidatePath(`/applications/${input.applicationId}`);
  return result.row;
});

export const deleteInteraction = action(z.object({ id }), async ({ id }, ctx) => {
  const row = await findOne(ctx, interactions, id);
  await softDeleteRow(ctx, interactions, id);
  if (row) revalidate(row.contactId);
  return { id };
});
