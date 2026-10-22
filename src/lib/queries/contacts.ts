import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, companies, contacts, interactions, roles } from "@/db/schema";
import { scoped } from "@/lib/repo";

export type ContactRow = Awaited<ReturnType<typeof listContacts>>[number];

export async function listContacts(userId: string, opts: { companyId?: string } = {}) {
  const touches = db
    .select({ contactId: interactions.contactId, touchesN: sql<number>`count(*)::int`.as("touches_n") })
    .from(interactions)
    .where(scoped(interactions, userId))
    .groupBy(interactions.contactId)
    .as("t");
  return db
    .select({
      id: contacts.id,
      fullName: contacts.fullName,
      email: contacts.email,
      phone: contacts.phone,
      linkedinUrl: contacts.linkedinUrl,
      title: contacts.title,
      relationship: contacts.relationship,
      lastTouchAt: contacts.lastTouchAt,
      nextFollowUpAt: contacts.nextFollowUpAt,
      companyId: contacts.companyId,
      company: companies.name,
      touches: sql<number>`coalesce(${touches.touchesN}, 0)`,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .leftJoin(touches, eq(touches.contactId, contacts.id))
    .where(scoped(contacts, userId, opts.companyId ? eq(contacts.companyId, opts.companyId) : undefined))
    .orderBy(sql`${contacts.nextFollowUpAt} asc nulls last`, contacts.fullName);
}

export async function getContact(userId: string, id: string) {
  const [row] = await db
    .select({ contact: contacts, company: companies })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .where(scoped(contacts, userId, eq(contacts.id, id)))
    .limit(1);
  if (!row) return null;

  const log = await db
    .select()
    .from(interactions)
    .where(scoped(interactions, userId, eq(interactions.contactId, id)))
    .orderBy(desc(interactions.occurredAt));

  const relatedApplications = row.contact.companyId
    ? await db
        .select({ id: applications.id, stage: applications.stage, title: roles.title })
        .from(applications)
        .innerJoin(roles, eq(roles.id, applications.roleId))
        .where(and(scoped(applications, userId), eq(roles.companyId, row.contact.companyId)))
    : [];

  const referrer = row.contact.referredByContactId
    ? (
        await db
          .select({ id: contacts.id, fullName: contacts.fullName })
          .from(contacts)
          .where(scoped(contacts, userId, eq(contacts.id, row.contact.referredByContactId)))
      )[0]
    : null;

  return { ...row, interactions: log, applications: relatedApplications, referrer };
}

/** Lightweight list for selects. */
export async function listContactOptions(userId: string) {
  return db
    .select({ id: contacts.id, fullName: contacts.fullName, companyId: contacts.companyId })
    .from(contacts)
    .where(scoped(contacts, userId))
    .orderBy(contacts.fullName);
}
