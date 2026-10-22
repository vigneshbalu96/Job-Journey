"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { applicationStageEvents, applications, companies, roles, tasks } from "@/db/schema";
import { action, ActionError } from "@/lib/action";
import { getProfile, type UserContext } from "@/lib/auth";
import { audit, createRow, findOne, softDeleteRow, updateRow, scoped } from "@/lib/repo";
import { APPLY_CHECKLIST, followUpDueAt, STAGE_LABEL, validateTransition } from "@/lib/stages";
import { endOfLocalDay } from "@/lib/time";
import { applicationCreate, applicationUpdate, id, stageTransition, type StageTransition } from "@/schemas";

function revalidateApp(appId?: string) {
  revalidatePath("/pipeline");
  revalidatePath("/today");
  revalidatePath("/journey");
  if (appId) revalidatePath(`/applications/${appId}`);
}

/** Create an application, creating the company and role inline when needed. */
export const createApplication = action(applicationCreate, async (input, ctx) => {
  const profile = await getProfile(ctx.userId);
  const created = await db.transaction(async (tx) => {
    const c = { userId: ctx.userId, db: tx };

    const company =
      "id" in input.company
        ? await findOne(c, companies, input.company.id)
        : await createRow(c, companies, input.company);
    if (!company) throw new ActionError("Company not found");

    const role = await createRow(c, roles, { ...input.role, companyId: company.id });

    const now = new Date();
    const appliedAt = input.appliedAt ?? (input.stage !== "saved" ? now : null);
    const app = await createRow(c, applications, {
      roleId: role.id,
      stage: input.stage,
      stageEnteredAt: now,
      appliedAt,
      priority: input.priority,
      referredByContactId: input.referredByContactId ?? null,
      resumeDocumentId: input.resumeDocumentId ?? null,
      coverLetterDocumentId: input.coverLetterDocumentId ?? null,
    });

    await recordStageEvent(c, {
      applicationId: app.id,
      fromStage: null,
      toStage: input.stage,
      occurredAt: now,
      note: input.note ?? null,
    });
    const label = `${role.title} @ ${company.name}`;
    await scheduleFollowUp(c, app.id, input.stage, now, label, profile.followUpDays);
    if (input.stage === "applied") await createApplyChecklist(c, app.id, label, now, profile.timezone);
    return { app, role, company };
  });
  revalidateApp(created.app.id);
  return created;
});

export const updateApplication = action(applicationUpdate, async ({ id, ...patch }, ctx) => {
  const row = await updateRow(ctx, applications, id, patch);
  revalidateApp(id);
  return row;
});

export const deleteApplication = action(z.object({ id }), async ({ id }, ctx) => {
  await softDeleteRow(ctx, applications, id);
  revalidateApp();
  return { id };
});

/**
 * The single path for stage changes. Validates the move, writes the history
 * event, resets stageEnteredAt, closes stale follow-ups and schedules the next
 * one. Accepting an offer withdraws every other open application.
 */
export const transitionStage = action(stageTransition, async (input, ctx) => {
  const profile = await getProfile(ctx.userId);
  await db.transaction(async (tx) => {
    const c = { userId: ctx.userId, db: tx };
    await applyTransition(c, input, { followUpDays: profile.followUpDays, timezone: profile.timezone });
  });
  revalidateApp(input.id);
  return { id: input.id, stage: input.to };
});

type Ctx = { userId: string; db: UserContext["db"] };

type TransitionSettings = { followUpDays: Parameters<typeof followUpDueAt>[2]; timezone: string };

export async function applyTransition(c: Ctx, input: StageTransition, settings: TransitionSettings) {
  const { followUpDays } = settings;
  const app = await findOne(c, applications, input.id);
  if (!app) throw new ActionError("Application not found");

  const check = validateTransition({ from: app.stage, to: input.to, closeReason: input.closeReason });
  if (!check.ok) throw new ActionError(check.error);

  const occurredAt = input.occurredAt ?? new Date();
  const sameStage = app.stage === input.to;

  if (!sameStage) {
    await updateRow(c, applications, app.id, {
      stage: input.to,
      closeReason: input.to === "closed" ? input.closeReason : null,
      stageEnteredAt: occurredAt,
      appliedAt: app.appliedAt ?? (input.to !== "saved" ? occurredAt : null),
    });
  }

  await recordStageEvent(c, {
    applicationId: app.id,
    fromStage: app.stage,
    toStage: input.to,
    closeReason: input.to === "closed" ? input.closeReason : null,
    roundLabel: input.roundLabel ?? null,
    occurredAt,
    note: input.note ?? null,
  });

  // A stage change means something happened, so pending follow-ups are stale.
  // Closing also retires apply-day chores and interview slots.
  const staleKinds = input.to === "closed" ? inArray(tasks.kind, ["follow_up", "apply", "interview"]) : eq(tasks.kind, "follow_up");
  await c.db
    .update(tasks)
    .set({ completedAt: occurredAt, updatedAt: occurredAt })
    .where(scoped(tasks, c.userId, and(eq(tasks.applicationId, app.id), staleKinds, isNull(tasks.completedAt))));

  if (input.to !== "closed") {
    const role = await findOne(c, roles, app.roleId);
    const company = role ? await findOne(c, companies, role.companyId) : undefined;
    const label = role && company ? `${role.title} @ ${company.name}` : "application";
    await scheduleFollowUp(c, app.id, input.to, occurredAt, label, followUpDays);
    if (input.to === "applied") await createApplyChecklist(c, app.id, label, occurredAt, settings.timezone);
    if (input.to === "interview" && input.interviewAt) {
      await createRow(c, tasks, {
        kind: "interview",
        title: input.roundLabel ? `${input.roundLabel} · ${label}` : `Interview · ${label}`,
        dueAt: input.interviewAt,
        applicationId: app.id,
      });
    }
  }

  if (input.to === "closed" && input.closeReason === "accepted") {
    const others = await c.db
      .select({ id: applications.id })
      .from(applications)
      .where(scoped(applications, c.userId, and(ne(applications.id, app.id), ne(applications.stage, "closed"))));
    for (const other of others) {
      await applyTransition(
        c,
        { id: other.id, to: "closed", closeReason: "withdrawn", occurredAt, note: "Withdrawn after accepting another offer" },
        settings,
      );
    }
  }
}

async function recordStageEvent(
  c: Ctx,
  ev: {
    applicationId: string;
    fromStage: StageTransition["to"] | null;
    toStage: StageTransition["to"];
    closeReason?: StageTransition["closeReason"];
    roundLabel?: string | null;
    occurredAt: Date;
    note: string | null;
  },
) {
  const [row] = await c.db
    .insert(applicationStageEvents)
    .values({ userId: c.userId, ...ev, closeReason: ev.closeReason ?? null })
    .returning();
  await audit(c.db, {
    userId: c.userId,
    tableName: "application_stage_events",
    rowId: row.id,
    action: "create",
    after: row as unknown as Record<string, unknown>,
  });
}

/** Apply-day chores, due by the end of that local day. Skipped if open apply tasks already exist. */
async function createApplyChecklist(c: Ctx, applicationId: string, label: string, at: Date, timezone: string) {
  const existing = await c.db
    .select({ id: tasks.id })
    .from(tasks)
    .where(scoped(tasks, c.userId, and(eq(tasks.applicationId, applicationId), eq(tasks.kind, "apply"), isNull(tasks.completedAt))))
    .limit(1);
  if (existing.length) return;
  const dueAt = endOfLocalDay(at, timezone);
  for (const item of APPLY_CHECKLIST) {
    await createRow(c, tasks, { kind: "apply", title: `${item} · ${label}`, dueAt, applicationId });
  }
}

async function scheduleFollowUp(
  c: Ctx,
  applicationId: string,
  stage: StageTransition["to"],
  enteredAt: Date,
  label: string,
  followUpDays: Parameters<typeof followUpDueAt>[2],
) {
  const dueAt = followUpDueAt(stage, enteredAt, followUpDays);
  if (!dueAt) return;
  await createRow(c, tasks, {
    kind: "follow_up",
    title: `Follow up on ${label} (${STAGE_LABEL[stage]})`,
    dueAt,
    applicationId,
  });
}
