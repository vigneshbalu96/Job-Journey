import "server-only";
import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { applications, companies, contacts, roles, tasks } from "@/db/schema";
import { scoped } from "@/lib/repo";

/** Same row shape as the Today page so TaskRow renders both. */
const base = () =>
  db
    .select({
      id: tasks.id,
      kind: tasks.kind,
      title: tasks.title,
      dueAt: tasks.dueAt,
      completedAt: tasks.completedAt,
      applicationId: tasks.applicationId,
      contactId: tasks.contactId,
      roleTitle: roles.title,
      company: companies.name,
      contactName: contacts.fullName,
    })
    .from(tasks)
    .leftJoin(applications, eq(applications.id, tasks.applicationId))
    .leftJoin(roles, eq(roles.id, applications.roleId))
    .leftJoin(companies, eq(companies.id, roles.companyId))
    .leftJoin(contacts, eq(contacts.id, tasks.contactId));

export async function listTasksForApplication(userId: string, applicationId: string) {
  const [open, done] = await Promise.all([
    base()
      .where(scoped(tasks, userId, and(eq(tasks.applicationId, applicationId), isNull(tasks.completedAt))))
      .orderBy(asc(tasks.dueAt)),
    base()
      .where(scoped(tasks, userId, and(eq(tasks.applicationId, applicationId), isNotNull(tasks.completedAt))))
      .orderBy(desc(tasks.completedAt))
      .limit(10),
  ]);
  return { open, done };
}
