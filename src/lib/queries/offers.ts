import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, companies, offers, roles } from "@/db/schema";
import { scoped } from "@/lib/repo";

export type OfferRow = Awaited<ReturnType<typeof listOffers>>[number];

export async function listOffers(userId: string) {
  return db
    .select({ offer: offers, applicationId: applications.id, stage: applications.stage, title: roles.title, company: companies.name, companyId: companies.id })
    .from(offers)
    .innerJoin(applications, eq(applications.id, offers.applicationId))
    .innerJoin(roles, eq(roles.id, applications.roleId))
    .innerJoin(companies, eq(companies.id, roles.companyId))
    .where(scoped(offers, userId))
    .orderBy(desc(offers.createdAt));
}

export async function getOfferForApplication(userId: string, applicationId: string) {
  const [row] = await db.select().from(offers).where(scoped(offers, userId, eq(offers.applicationId, applicationId))).limit(1);
  return row ?? null;
}
