"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { applications, offers } from "@/db/schema";
import { action, ActionError } from "@/lib/action";
import { getProfile } from "@/lib/auth";
import { createRow, findOne, scoped, softDeleteRow, updateRow } from "@/lib/repo";
import { ne } from "drizzle-orm";
import { id, offerInput, offerUpdate } from "@/schemas";
import { applyTransition } from "./applications";

function ctcTotal(o: { baseAnnual?: string | null; variableAnnual?: string | null; equityValueAnnual?: string | null; signOn?: string | null }) {
  const n = (v: string | null | undefined) => (v ? Number(v) : 0);
  const total = n(o.baseAnnual) + n(o.variableAnnual) + n(o.equityValueAnnual);
  return total ? total.toFixed(2) : null;
}

/** `date` columns take YYYY-MM-DD strings; the zod schema yields Date objects. */
function dateOnly(d: Date | null | undefined): string | null | undefined {
  if (d === undefined) return undefined;
  if (d === null) return null;
  return d.toISOString().slice(0, 10);
}

function revalidate(applicationId?: string) {
  revalidatePath("/offers");
  revalidatePath("/pipeline");
  revalidatePath("/journey");
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
}

/** Recording an offer also moves the application to the offer stage if it is not there yet. */
export const createOffer = action(offerInput, async (input, ctx) => {
  const profile = await getProfile(ctx.userId);
  const row = await db.transaction(async (tx) => {
    const c = { userId: ctx.userId, db: tx };
    const app = await findOne(c, applications, input.applicationId);
    if (!app) throw new ActionError("Application not found");
    const offer = await createRow(c, offers, { ...input, joiningDate: dateOnly(input.joiningDate), ctcTotal: ctcTotal(input) });
    if (app.stage !== "offer" && app.stage !== "closed") {
      await applyTransition(c, { id: app.id, to: "offer", note: "Offer received" }, { followUpDays: profile.followUpDays, timezone: profile.timezone });
    }
    return offer;
  });
  revalidate(row.applicationId);
  return row;
});

export const updateOffer = action(offerUpdate, async ({ id, ...patch }, ctx) => {
  const existing = await findOne(ctx, offers, id);
  if (!existing) throw new ActionError("Offer not found");
  const merged = { ...existing, ...patch };
  const row = await updateRow(ctx, offers, id, { ...patch, joiningDate: dateOnly(patch.joiningDate), ctcTotal: ctcTotal(merged) });
  revalidate(row.applicationId);
  return row;
});

export const deleteOffer = action(z.object({ id }), async ({ id }, ctx) => {
  const row = await findOne(ctx, offers, id);
  await softDeleteRow(ctx, offers, id);
  revalidate(row?.applicationId);
  return { id };
});

/** Accepting closes this application as accepted (which withdraws the rest) and marks other offers declined. */
export const decideOffer = action(
  z.object({ id, decision: z.enum(["accepted", "declined", "negotiating"]) }),
  async ({ id, decision }, ctx) => {
    const profile = await getProfile(ctx.userId);
    const result = await db.transaction(async (tx) => {
      const c = { userId: ctx.userId, db: tx };
      const offer = await findOne(c, offers, id);
      if (!offer) throw new ActionError("Offer not found");
      await updateRow(c, offers, id, { status: decision });
      if (decision === "accepted") {
        await applyTransition(c, { id: offer.applicationId, to: "closed", closeReason: "accepted", note: "Offer accepted" }, { followUpDays: profile.followUpDays, timezone: profile.timezone });
        // every other live offer is implicitly declined
        const others = await tx.select({ id: offers.id }).from(offers).where(scoped(offers, ctx.userId, ne(offers.id, id)));
        for (const o of others) await updateRow(c, offers, o.id, { status: "declined" });
      }
      if (decision === "declined") {
        const app = await findOne(c, applications, offer.applicationId);
        if (app && app.stage !== "closed") {
          await applyTransition(c, { id: app.id, to: "closed", closeReason: "withdrawn", note: "Declined the offer" }, { followUpDays: profile.followUpDays, timezone: profile.timezone });
        }
      }
      return offer;
    });
    revalidate(result.applicationId);
    return result;
  },
);
