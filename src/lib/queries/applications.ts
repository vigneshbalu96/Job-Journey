import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { applicationStageEvents, applications, companies, roles } from "@/db/schema";
import { scoped } from "@/lib/repo";

export type PipelineCard = Awaited<ReturnType<typeof listPipeline>>[number];

export async function listPipeline(userId: string) {
  return db
    .select({
      id: applications.id,
      stage: applications.stage,
      closeReason: applications.closeReason,
      stageEnteredAt: applications.stageEnteredAt,
      appliedAt: applications.appliedAt,
      priority: applications.priority,
      fitScore: applications.fitScore,
      updatedAt: applications.updatedAt,
      roleId: roles.id,
      title: roles.title,
      location: roles.location,
      workMode: roles.workMode,
      source: roles.source,
      companyId: companies.id,
      company: companies.name,
      domain: companies.domain,
    })
    .from(applications)
    .innerJoin(roles, eq(roles.id, applications.roleId))
    .innerJoin(companies, eq(companies.id, roles.companyId))
    .where(scoped(applications, userId))
    .orderBy(applications.priority, desc(applications.updatedAt));
}

export async function getApplicationDetail(userId: string, id: string) {
  const [row] = await db
    .select({ application: applications, role: roles, company: companies })
    .from(applications)
    .innerJoin(roles, eq(roles.id, applications.roleId))
    .innerJoin(companies, eq(companies.id, roles.companyId))
    .where(scoped(applications, userId, eq(applications.id, id)))
    .limit(1);
  if (!row) return null;
  const events = await db
    .select()
    .from(applicationStageEvents)
    .where(and(eq(applicationStageEvents.userId, userId), eq(applicationStageEvents.applicationId, id)))
    .orderBy(desc(applicationStageEvents.occurredAt));
  return { ...row, events };
}

export async function listCompanies(userId: string) {
  return db
    .select()
    .from(companies)
    .where(and(eq(companies.userId, userId), isNull(companies.deletedAt)))
    .orderBy(companies.name);
}
