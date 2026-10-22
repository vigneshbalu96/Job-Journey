import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, companies, documents, roles } from "@/db/schema";
import { scoped } from "@/lib/repo";

export async function listDocuments(userId: string) {
  const usedAsResume = db
    .select({ docId: applications.resumeDocumentId, resumeN: sql<number>`count(*)::int`.as("resume_n") })
    .from(applications)
    .where(scoped(applications, userId))
    .groupBy(applications.resumeDocumentId)
    .as("ur");
  const usedAsCover = db
    .select({ docId: applications.coverLetterDocumentId, coverN: sql<number>`count(*)::int`.as("cover_n") })
    .from(applications)
    .where(scoped(applications, userId))
    .groupBy(applications.coverLetterDocumentId)
    .as("uc");
  return db
    .select({
      doc: documents,
      usedBy: sql<number>`coalesce(${usedAsResume.resumeN}, 0) + coalesce(${usedAsCover.coverN}, 0)`,
    })
    .from(documents)
    .leftJoin(usedAsResume, eq(usedAsResume.docId, documents.id))
    .leftJoin(usedAsCover, eq(usedAsCover.docId, documents.id))
    .where(scoped(documents, userId))
    .orderBy(documents.kind, documents.name, desc(documents.version));
}

export async function listDocumentOptions(userId: string) {
  return db
    .select({ id: documents.id, kind: documents.kind, name: documents.name, version: documents.version })
    .from(documents)
    .where(scoped(documents, userId))
    .orderBy(documents.name, desc(documents.version));
}

/** Which applications used a given document version. */
export async function listDocumentUsage(userId: string, documentId: string) {
  return db
    .select({ id: applications.id, stage: applications.stage, title: roles.title, company: companies.name })
    .from(applications)
    .innerJoin(roles, eq(roles.id, applications.roleId))
    .innerJoin(companies, eq(companies.id, roles.companyId))
    .where(
      scoped(
        applications,
        userId,
        sql`(${applications.resumeDocumentId} = ${documentId} or ${applications.coverLetterDocumentId} = ${documentId})`,
      ),
    );
}
