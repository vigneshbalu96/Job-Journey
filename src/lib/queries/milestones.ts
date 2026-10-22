import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applicationStageEvents, applications, companies, offers, roles } from "@/db/schema";
import { scoped } from "@/lib/repo";
import type { ApplicationStage } from "@/db/schema";

export type Milestone = { id: string; date: Date; title: string; subtitle: string | null; stage: ApplicationStage; href: string };

/**
 * The story of the search in ≤ 12 beats: first save, first application, the
 * first interview at each company (capped), every offer, and the acceptance.
 */
export async function listMilestones(userId: string, cap = 12): Promise<Milestone[]> {
  const events = await db
    .select({
      id: applicationStageEvents.id,
      at: applicationStageEvents.occurredAt,
      toStage: applicationStageEvents.toStage,
      closeReason: applicationStageEvents.closeReason,
      roundLabel: applicationStageEvents.roundLabel,
      applicationId: applicationStageEvents.applicationId,
      title: roles.title,
      company: companies.name,
    })
    .from(applicationStageEvents)
    .innerJoin(applications, eq(applications.id, applicationStageEvents.applicationId))
    .innerJoin(roles, eq(roles.id, applications.roleId))
    .innerJoin(companies, eq(companies.id, roles.companyId))
    .where(scoped(applications, userId))
    .orderBy(asc(applicationStageEvents.occurredAt));

  const out: Milestone[] = [];
  const seenInterview = new Set<string>();
  let firstSaved = false;
  let firstApplied = false;
  for (const e of events) {
    const href = `/applications/${e.applicationId}`;
    if (e.toStage === "saved" && !firstSaved) {
      firstSaved = true;
      out.push({ id: e.id, date: e.at, title: "Search begins", subtitle: `${e.title} @ ${e.company}`, stage: "saved", href });
    } else if (e.toStage === "applied" && !firstApplied) {
      firstApplied = true;
      out.push({ id: e.id, date: e.at, title: "First application", subtitle: `${e.title} @ ${e.company}`, stage: "applied", href });
    } else if (e.toStage === "interview" && !seenInterview.has(e.company) && seenInterview.size < 5) {
      seenInterview.add(e.company);
      out.push({ id: e.id, date: e.at, title: `Interview · ${e.company}`, subtitle: e.roundLabel ?? e.title, stage: "interview", href });
    } else if (e.toStage === "offer") {
      out.push({ id: e.id, date: e.at, title: `Offer · ${e.company}`, subtitle: e.title, stage: "offer", href });
    } else if (e.toStage === "closed" && e.closeReason === "accepted") {
      out.push({ id: e.id, date: e.at, title: `Accepted · ${e.company}`, subtitle: e.title, stage: "offer", href });
    }
  }
  // Offers recorded without a stage event (edge case) still count.
  const offerRows = await db
    .select({ id: offers.id, at: offers.createdAt, applicationId: offers.applicationId, title: roles.title, company: companies.name })
    .from(offers)
    .innerJoin(applications, eq(applications.id, offers.applicationId))
    .innerJoin(roles, eq(roles.id, applications.roleId))
    .innerJoin(companies, eq(companies.id, roles.companyId))
    .where(scoped(offers, userId));
  for (const o of offerRows) {
    if (!out.some((m) => m.href === `/applications/${o.applicationId}` && m.stage === "offer")) {
      out.push({ id: `o-${o.id}`, date: o.at, title: `Offer · ${o.company}`, subtitle: o.title, stage: "offer", href: `/applications/${o.applicationId}` });
    }
  }
  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  if (out.length <= cap) return out;
  // Keep the first two and the most recent beats.
  return [...out.slice(0, 2), ...out.slice(out.length - (cap - 2))];
}
