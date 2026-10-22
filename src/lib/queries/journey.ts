import "server-only";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { applicationStageEvents, applications, companies, contacts, interactions, offers, roles, tasks } from "@/db/schema";
import { scoped } from "@/lib/repo";
import type { ApplicationStage } from "@/db/schema";

export type TimelineItem = {
  id: string;
  kind: "stage" | "interaction" | "task" | "offer";
  at: Date;
  title: string;
  detail: string | null;
  href: string | null;
  stage?: ApplicationStage;
};

/** Everything that happened, newest first. Built from four sources, no extra table. */
export async function listTimeline(userId: string, limit = 200): Promise<TimelineItem[]> {
  const [stageRows, interactionRows, taskRows, offerRows] = await Promise.all([
    db
      .select({
        id: applicationStageEvents.id,
        at: applicationStageEvents.occurredAt,
        toStage: applicationStageEvents.toStage,
        closeReason: applicationStageEvents.closeReason,
        roundLabel: applicationStageEvents.roundLabel,
        note: applicationStageEvents.note,
        applicationId: applicationStageEvents.applicationId,
        title: roles.title,
        company: companies.name,
      })
      .from(applicationStageEvents)
      .innerJoin(applications, eq(applications.id, applicationStageEvents.applicationId))
      .innerJoin(roles, eq(roles.id, applications.roleId))
      .innerJoin(companies, eq(companies.id, roles.companyId))
      .where(and(eq(applicationStageEvents.userId, userId), scoped(applications, userId)))
      .orderBy(desc(applicationStageEvents.occurredAt))
      .limit(limit),
    db
      .select({
        id: interactions.id,
        at: interactions.occurredAt,
        kind: interactions.kind,
        direction: interactions.direction,
        summary: interactions.summary,
        contactId: contacts.id,
        contactName: contacts.fullName,
        company: companies.name,
      })
      .from(interactions)
      .innerJoin(contacts, eq(contacts.id, interactions.contactId))
      .leftJoin(companies, eq(companies.id, contacts.companyId))
      .where(scoped(interactions, userId))
      .orderBy(desc(interactions.occurredAt))
      .limit(limit),
    db
      .select({ id: tasks.id, at: tasks.completedAt, title: tasks.title, kind: tasks.kind, applicationId: tasks.applicationId })
      .from(tasks)
      .where(scoped(tasks, userId, isNotNull(tasks.completedAt)))
      .orderBy(desc(tasks.completedAt))
      .limit(limit),
    db
      .select({ id: offers.id, at: offers.createdAt, status: offers.status, ctc: offers.ctcTotal, currency: offers.currency, applicationId: offers.applicationId, title: roles.title, company: companies.name })
      .from(offers)
      .innerJoin(applications, eq(applications.id, offers.applicationId))
      .innerJoin(roles, eq(roles.id, applications.roleId))
      .innerJoin(companies, eq(companies.id, roles.companyId))
      .where(scoped(offers, userId))
      .orderBy(desc(offers.createdAt))
      .limit(limit),
  ]);

  const items: TimelineItem[] = [
    ...stageRows.map((r) => ({
      id: `s-${r.id}`,
      kind: "stage" as const,
      at: r.at,
      stage: r.toStage,
      title: `${r.title} @ ${r.company}`,
      detail: [r.roundLabel, r.closeReason, r.note].filter(Boolean).join(" · ") || null,
      href: `/applications/${r.applicationId}`,
    })),
    ...interactionRows.map((r) => ({
      id: `i-${r.id}`,
      kind: "interaction" as const,
      at: r.at,
      title: `${r.direction === "out" ? "Reached out to" : "Heard from"} ${r.contactName}${r.company ? ` (${r.company})` : ""}`,
      detail: `${r.kind}: ${r.summary}`,
      href: `/contacts/${r.contactId}`,
    })),
    ...taskRows.map((r) => ({
      id: `t-${r.id}`,
      kind: "task" as const,
      at: r.at!,
      title: r.title,
      detail: r.kind.replace("_", " "),
      href: r.applicationId ? `/applications/${r.applicationId}` : null,
    })),
    ...offerRows.map((r) => ({
      id: `o-${r.id}`,
      kind: "offer" as const,
      at: r.at,
      title: `Offer from ${r.company} for ${r.title}`,
      detail: r.ctc ? `${r.currency} ${Number(r.ctc).toLocaleString("en-IN")} · ${r.status}` : r.status,
      href: `/applications/${r.applicationId}`,
    })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

export type Metrics = Awaited<ReturnType<typeof getMetrics>>;

export async function getMetrics(userId: string) {
  // Furthest stage each application ever reached (not just where it is now),
  // so a rejected-after-interview app still counts as having reached interview.
  const reached = db
    .select({
      applicationId: applicationStageEvents.applicationId,
      applied: sql<boolean>`bool_or(${applicationStageEvents.toStage} in ('applied','screening','interview','offer'))`.as("applied"),
      screening: sql<boolean>`bool_or(${applicationStageEvents.toStage} in ('screening','interview','offer'))`.as("screening"),
      interview: sql<boolean>`bool_or(${applicationStageEvents.toStage} in ('interview','offer'))`.as("interview"),
      offer: sql<boolean>`bool_or(${applicationStageEvents.toStage} = 'offer')`.as("offer"),
      accepted: sql<boolean>`bool_or(${applicationStageEvents.closeReason} = 'accepted')`.as("accepted"),
    })
    .from(applicationStageEvents)
    .where(eq(applicationStageEvents.userId, userId))
    .groupBy(applicationStageEvents.applicationId)
    .as("reached");

  const funnelBase = db
    .select({
      source: roles.source,
      roleType: roles.roleType,
      total: sql<number>`count(*)::int`.as("total"),
      applied: sql<number>`count(*) filter (where ${reached.applied})::int`.as("applied"),
      screening: sql<number>`count(*) filter (where ${reached.screening})::int`.as("screening"),
      interview: sql<number>`count(*) filter (where ${reached.interview})::int`.as("interview"),
      offer: sql<number>`count(*) filter (where ${reached.offer})::int`.as("offer"),
      accepted: sql<number>`count(*) filter (where ${reached.accepted})::int`.as("accepted"),
    })
    .from(applications)
    .innerJoin(roles, eq(roles.id, applications.roleId))
    .leftJoin(reached, eq(reached.applicationId, applications.id))
    .where(scoped(applications, userId));

  const [bySource, overall] = await Promise.all([
    funnelBase.groupBy(roles.source, roles.roleType),
    db
      .select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where ${applications.stage} <> 'closed')::int`,
        applied: sql<number>`count(*) filter (where ${reached.applied})::int`,
        screening: sql<number>`count(*) filter (where ${reached.screening})::int`,
        interview: sql<number>`count(*) filter (where ${reached.interview})::int`,
        offer: sql<number>`count(*) filter (where ${reached.offer})::int`,
        accepted: sql<number>`count(*) filter (where ${reached.accepted})::int`,
        rejected: sql<number>`count(*) filter (where ${applications.closeReason} = 'rejected')::int`,
        ghosted: sql<number>`count(*) filter (where ${applications.closeReason} = 'ghosted')::int`,
        withdrawn: sql<number>`count(*) filter (where ${applications.closeReason} = 'withdrawn')::int`,
      })
      .from(applications)
      .leftJoin(reached, eq(reached.applicationId, applications.id))
      .where(scoped(applications, userId)),
  ]);

  // Weekly activity for the last 12 weeks: applications sent, stage moves, interactions.
  const weekly = await db.execute<{ week: string; applied: number; moves: number; interactions: number }>(sql`
    with weeks as (
      select generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') as week
    ),
    ev as (
      select date_trunc('week', occurred_at) as week,
             count(*) filter (where to_stage = 'applied' and (from_stage is null or from_stage = 'saved'))::int as applied,
             count(*)::int as moves
      from application_stage_events where user_id = ${userId}
      group by 1
    ),
    ix as (
      select date_trunc('week', occurred_at) as week, count(*)::int as interactions
      from interactions where user_id = ${userId} and deleted_at is null
      group by 1
    )
    select to_char(weeks.week, 'YYYY-MM-DD') as week,
           coalesce(ev.applied, 0) as applied,
           coalesce(ev.moves, 0) as moves,
           coalesce(ix.interactions, 0) as interactions
    from weeks left join ev on ev.week = weeks.week left join ix on ix.week = weeks.week
    order by weeks.week
  `);

  // Median days spent in each stage, from consecutive stage events.
  const timeInStage = await db.execute<{ stage: ApplicationStage; median_days: number; n: number }>(sql`
    with ordered as (
      select application_id, to_stage as stage, occurred_at,
             lead(occurred_at) over (partition by application_id order by occurred_at) as next_at
      from application_stage_events where user_id = ${userId}
    )
    select stage,
           round(percentile_cont(0.5) within group (order by extract(epoch from (coalesce(next_at, now()) - occurred_at)) / 86400)::numeric, 1)::float as median_days,
           count(*)::int as n
    from ordered
    where stage <> 'closed'
    group by stage
  `);

  // Response rate: of applications that reached 'applied', how many got any later stage or a rejection.
  const [response] = await db
    .select({
      applied: sql<number>`count(*) filter (where ${reached.applied})::int`,
      responded: sql<number>`count(*) filter (where ${reached.applied} and (${reached.screening} or ${applications.closeReason} = 'rejected'))::int`,
    })
    .from(applications)
    .leftJoin(reached, eq(reached.applicationId, applications.id))
    .where(scoped(applications, userId));

  const [firstEvent] = await db
    .select({ at: sql<Date | null>`min(${applicationStageEvents.occurredAt})` })
    .from(applicationStageEvents)
    .where(eq(applicationStageEvents.userId, userId));

  return {
    overall: overall[0],
    bySource,
    weekly: weekly as unknown as { week: string; applied: number; moves: number; interactions: number }[],
    timeInStage: timeInStage as unknown as { stage: ApplicationStage; median_days: number; n: number }[],
    response,
    startedAt: firstEvent?.at ?? null,
  };
}
