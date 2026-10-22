import "server-only";
import { z, type ZodType } from "zod";
import { applications } from "@/db/schema";
import { getProfile } from "@/lib/auth";
import { getApplicationDetail } from "@/lib/queries/applications";
import { updateRow } from "@/lib/repo";
import { AiError, runAi, type AiModel } from "./client";
import { SYSTEM, TASK_SCHEMAS, type TaskName, type TaskOutput } from "./tasks";

export const aiRequestSchema = z.object({
  task: z.enum(["jd_parse", "fit_score", "resume_bullets", "cover_letter", "interview_questions", "follow_up_email"]),
  applicationId: z.uuid(),
  model: z.enum(["claude-sonnet-5-5", "claude-opus-5-5"]).optional(),
  force: z.boolean().optional(),
  /** For follow_up_email: what kind of note and any specifics. */
  extra: z.string().max(2000).optional(),
});
export type AiRequest = z.infer<typeof aiRequestSchema>;

function profileContext(p: { masterProfile: string | null; targetRoles: string[]; targetLocations: string[] }) {
  const lines = [
    "## Candidate profile (written by the candidate)",
    p.masterProfile?.trim() || "(empty)",
    p.targetRoles.length ? `Target roles: ${p.targetRoles.join(", ")}` : "",
    p.targetLocations.length ? `Target locations: ${p.targetLocations.join(", ")}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

/** Runs one application-scoped AI task; persists the fit score onto the application. */
export async function runApplicationTask<T extends Exclude<TaskName, "clip_extract">>(
  userId: string,
  req: AiRequest & { task: T },
): Promise<{ output: TaskOutput<T>; cached: boolean; model: AiModel; costUsd: number }> {
  const [profile, detail] = await Promise.all([getProfile(userId), getApplicationDetail(userId, req.applicationId)]);
  if (!detail) throw new AiError("Application not found", "api");
  const { application: app, role, company } = detail;
  if (!role.jdText?.trim()) throw new AiError("This role has no job description saved. Paste the JD on the application first.", "api");
  const needsProfile = req.task !== "jd_parse";
  if (needsProfile && !profile.masterProfile?.trim()) {
    throw new AiError("Fill in your master profile under Settings first; the AI scores and writes against it.", "api");
  }

  const header = `## Role\n${role.title} at ${company.name}${role.location ? ` · ${role.location}` : ""}${role.workMode ? ` · ${role.workMode}` : ""}\n\n## Job description\n${role.jdText.trim()}`;
  const prompt =
    req.task === "follow_up_email"
      ? `${header}\n\n## Current stage\n${app.stage}${app.closeReason ? ` (${app.closeReason})` : ""}\n\n## What the email is for\n${req.extra?.trim() || "A polite follow-up after a week of silence."}`
      : header;

  const result = await runAi<unknown>({
    userId,
    task: req.task,
    schema: TASK_SCHEMAS[req.task] as ZodType<unknown>,
    system: SYSTEM[req.task],
    context: needsProfile ? profileContext(profile) : undefined,
    prompt,
    model: req.model,
    effort: req.task === "jd_parse" ? "low" : "medium",
    maxTokens: req.task === "cover_letter" || req.task === "interview_questions" ? 6000 : 4000,
    applicationId: app.id,
    roleId: role.id,
    force: req.force,
  });

  if (req.task === "fit_score") {
    const fit = result.output as TaskOutput<"fit_score">;
    await updateRow({ userId }, applications, app.id, { fitScore: fit.score, fitRationale: fit.rationale });
  }
  return { output: result.output as TaskOutput<T>, cached: result.cached, model: result.model, costUsd: result.costUsd };
}
