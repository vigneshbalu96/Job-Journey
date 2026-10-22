import "server-only";
import { desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { applications, companies, notes, questions, roles } from "@/db/schema";
import { scoped } from "@/lib/repo";

export async function listNotes(userId: string, where: { applicationId?: string; companyId?: string }) {
  const extra: SQL | undefined = where.applicationId
    ? eq(notes.applicationId, where.applicationId)
    : where.companyId
      ? eq(notes.companyId, where.companyId)
      : undefined;
  return db.select().from(notes).where(scoped(notes, userId, extra)).orderBy(desc(notes.updatedAt));
}

export async function listQuestions(userId: string, opts: { tag?: string; applicationId?: string } = {}) {
  const parts: SQL[] = [];
  if (opts.tag) parts.push(sql`${opts.tag} = any(${questions.tags})`);
  if (opts.applicationId) parts.push(eq(questions.applicationId, opts.applicationId));
  const extra = parts.length ? sql.join(parts, sql` and `) : undefined;
  return db
    .select({
      question: questions,
      company: companies.name,
      roleTitle: roles.title,
    })
    .from(questions)
    .leftJoin(companies, eq(companies.id, questions.companyId))
    .leftJoin(applications, eq(applications.id, questions.applicationId))
    .leftJoin(roles, eq(roles.id, applications.roleId))
    .where(scoped(questions, userId, extra))
    .orderBy(desc(questions.askedCount), desc(questions.updatedAt));
}

export async function listQuestionTags(userId: string) {
  const rows = await db
    .select({ tag: sql<string>`t.tag`, n: sql<number>`count(*)::int` })
    .from(sql`${questions}, unnest(${questions.tags}) as t(tag)`)
    .where(scoped(questions, userId))
    .groupBy(sql`t.tag`)
    .orderBy(sql`count(*) desc`, sql`t.tag`);
  return rows;
}
