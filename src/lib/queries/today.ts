import "server-only";
import { and, asc, eq, gt, gte, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, companies, contacts, roles, tasks } from "@/db/schema";
import { scoped } from "@/lib/repo";

export type TodayData = Awaited<ReturnType<typeof getToday>>;

/**
 * Everything that needs attention, computed against the user's local day.
 * `dayStart`/`dayEnd` are passed in so the digest can reuse this per timezone.
 */
export async function getToday(userId: string, now: Date, dayEnd: Date, horizonDays = 7) {
  const horizon = new Date(now.getTime() + horizonDays * 86_400_000);
  const taskBase = {
    id: tasks.id,
    kind: tasks.kind,
    title: tasks.title,
    dueAt: tasks.dueAt,
    applicationId: tasks.applicationId,
    contactId: tasks.contactId,
    roleTitle: roles.title,
    company: companies.name,
    contactName: contacts.fullName,
  };
  const openTask = and(isNull(tasks.completedAt), or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, now)));
  const tasksQuery = () =>
    db
      .select(taskBase)
      .from(tasks)
      .leftJoin(applications, eq(applications.id, tasks.applicationId))
      .leftJoin(roles, eq(roles.id, applications.roleId))
      .leftJoin(companies, eq(companies.id, roles.companyId))
      .leftJoin(contacts, eq(contacts.id, tasks.contactId));

  const [overdue, dueToday, upcoming, followUps, stale] = await Promise.all([
    tasksQuery().where(scoped(tasks, userId, and(openTask, lt(tasks.dueAt, now)))).orderBy(asc(tasks.dueAt)),
    tasksQuery().where(scoped(tasks, userId, and(openTask, gte(tasks.dueAt, now), lte(tasks.dueAt, dayEnd)))).orderBy(asc(tasks.dueAt)),
    tasksQuery()
      .where(scoped(tasks, userId, and(openTask, gt(tasks.dueAt, dayEnd), lte(tasks.dueAt, horizon))))
      .orderBy(asc(tasks.dueAt)),
    db
      .select({ id: contacts.id, fullName: contacts.fullName, nextFollowUpAt: contacts.nextFollowUpAt, company: companies.name, email: contacts.email })
      .from(contacts)
      .leftJoin(companies, eq(companies.id, contacts.companyId))
      .where(scoped(contacts, userId, lte(contacts.nextFollowUpAt, dayEnd)))
      .orderBy(asc(contacts.nextFollowUpAt)),
    // Open applications untouched for 10+ days with no open follow-up task.
    db
      .select({ id: applications.id, stage: applications.stage, stageEnteredAt: applications.stageEnteredAt, title: roles.title, company: companies.name })
      .from(applications)
      .innerJoin(roles, eq(roles.id, applications.roleId))
      .innerJoin(companies, eq(companies.id, roles.companyId))
      .where(
        scoped(
          applications,
          userId,
          and(
            sql`${applications.stage} not in ('closed','saved')`,
            lt(applications.stageEnteredAt, new Date(now.getTime() - 10 * 86_400_000)),
            sql`not exists (select 1 from ${tasks} t where t.application_id = ${applications.id} and t.completed_at is null and t.deleted_at is null)`,
          ),
        ),
      )
      .orderBy(asc(applications.stageEnteredAt)),
  ]);

  return { overdue, dueToday, upcoming, followUps, stale };
}
