import "server-only"; // unscoped-ok: application_stage_events is insert-only (no deleted_at); every query filters by user_id
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { applicationStageEvents } from "@/db/schema";
import { localDateString, tzOffsetMinutes } from "@/lib/time";
import { startOfLocalWeek, streakDays } from "@/lib/streak";

export type Progress = Awaited<ReturnType<typeof getProgress>>;

/** Weekly target progress and activity streak, computed in the user's zone. */
export async function getProgress(userId: string, now: Date, timezone: string, weeklyTarget: number) {
  const offset = tzOffsetMinutes(now, timezone);
  const weekStart = startOfLocalWeek(now, offset);

  const [{ appliedThisWeek }] = await db
    .select({ appliedThisWeek: sql<number>`count(*)::int` })
    .from(applicationStageEvents)
    .where(and(eq(applicationStageEvents.userId, userId), eq(applicationStageEvents.toStage, "applied"), gte(applicationStageEvents.occurredAt, weekStart)));

  // Distinct local activity dates across stage moves, conversations and done tasks (last 120 days).
  // Raw SQL params must be primitives for postgres-js, so dates go in as ISO strings.
  const since = new Date(now.getTime() - 120 * 86_400_000).toISOString();
  const rows = await db.execute<{ day: string }>(sql`
    select distinct to_char((ts at time zone 'UTC') + make_interval(mins => ${offset}), 'YYYY-MM-DD') as day
    from (
      select occurred_at as ts from application_stage_events where user_id = ${userId} and occurred_at >= ${since}::timestamptz
      union all
      select occurred_at from interactions where user_id = ${userId} and deleted_at is null and occurred_at >= ${since}::timestamptz
      union all
      select completed_at from tasks where user_id = ${userId} and deleted_at is null and completed_at is not null and completed_at >= ${since}::timestamptz
    ) a
  `);
  const days = (rows as unknown as { day: string }[]).map((r) => r.day);
  const streak = streakDays(days, localDateString(now, timezone));

  return {
    appliedThisWeek,
    weeklyTarget,
    weekPct: weeklyTarget > 0 ? Math.min(100, Math.round((appliedThisWeek / weeklyTarget) * 100)) : 0,
    streak,
    weekStart,
  };
}
