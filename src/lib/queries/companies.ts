import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, companies, contacts, roles } from "@/db/schema";
import { scoped } from "@/lib/repo";

export async function listCompaniesWithCounts(userId: string) {
  const rolesCount = db
    .select({ companyId: roles.companyId, rolesN: sql<number>`count(*)::int`.as("roles_n") })
    .from(roles)
    .where(scoped(roles, userId))
    .groupBy(roles.companyId)
    .as("rc");
  const contactsCount = db
    .select({ companyId: contacts.companyId, contactsN: sql<number>`count(*)::int`.as("contacts_n") })
    .from(contacts)
    .where(scoped(contacts, userId))
    .groupBy(contacts.companyId)
    .as("cc");
  const openApps = db
    .select({ companyId: roles.companyId, openN: sql<number>`count(*)::int`.as("open_n") })
    .from(applications)
    .innerJoin(roles, eq(roles.id, applications.roleId))
    .where(and(scoped(applications, userId), sql`${applications.stage} <> 'closed'`))
    .groupBy(roles.companyId)
    .as("oa");

  return db
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain,
      industry: companies.industry,
      hqLocation: companies.hqLocation,
      roles: sql<number>`coalesce(${rolesCount.rolesN}, 0)`,
      contacts: sql<number>`coalesce(${contactsCount.contactsN}, 0)`,
      openApplications: sql<number>`coalesce(${openApps.openN}, 0)`,
    })
    .from(companies)
    .leftJoin(rolesCount, eq(rolesCount.companyId, companies.id))
    .leftJoin(contactsCount, eq(contactsCount.companyId, companies.id))
    .leftJoin(openApps, eq(openApps.companyId, companies.id))
    .where(and(eq(companies.userId, userId), isNull(companies.deletedAt)))
    .orderBy(companies.name);
}

export async function getCompany(userId: string, id: string) {
  const [company] = await db
    .select()
    .from(companies)
    .where(scoped(companies, userId, eq(companies.id, id)))
    .limit(1);
  if (!company) return null;
  const companyRoles = await db
    .select({ role: roles, applicationId: applications.id, stage: applications.stage })
    .from(roles)
    .leftJoin(applications, and(eq(applications.roleId, roles.id), scoped(applications, userId)))
    .where(scoped(roles, userId, eq(roles.companyId, id)));
  const people = await db.select().from(contacts).where(scoped(contacts, userId, eq(contacts.companyId, id)));
  return { company, roles: companyRoles, contacts: people };
}
