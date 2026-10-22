import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { ZodType } from "zod";
import { db } from "@/db";
import { aiRuns, type AiTask } from "@/db/schema";

export const AI_MODELS = {
  "claude-sonnet-5-5": { label: "Sonnet 5.5 (default)", input: 2, output: 10, cacheRead: 0.2 },
  "claude-opus-5-5": { label: "Opus 5.5 (deeper)", input: 4, output: 20, cacheRead: 0.2 },
} as const;
export type AiModel = keyof typeof AI_MODELS;

export const DEFAULT_MODEL: AiModel =
  (process.env.AI_DEFAULT_MODEL as AiModel | undefined) && process.env.AI_DEFAULT_MODEL! in AI_MODELS
    ? (process.env.AI_DEFAULT_MODEL as AiModel)
    : "claude-sonnet-5-5";

const DAILY_RUN_CAP = Number(process.env.AI_DAILY_RUN_CAP ?? 60);

export class AiError extends Error {
  constructor(
    message: string,
    public readonly code: "not_configured" | "cap_reached" | "refused" | "no_output" | "api",
  ) {
    super(message);
    this.name = "AiError";
  }
}

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiError("AI is not configured. Add ANTHROPIC_API_KEY to the environment.", "not_configured");
  return (client ??= new Anthropic());
}

export function costUsd(model: AiModel, usage: { input: number; output: number; cacheRead: number }) {
  const p = AI_MODELS[model];
  return (usage.input * p.input + usage.output * p.output + usage.cacheRead * p.cacheRead) / 1_000_000;
}

export type RunInput<T> = {
  userId: string;
  task: AiTask;
  schema: ZodType<T>;
  /** Stable, cacheable instructions. Keep free of anything per-request. */
  system: string;
  /** Stable per-user context (master profile) placed before the volatile part so it caches across runs. */
  context?: string;
  /** The volatile part: JD text, question, etc. */
  prompt: string;
  model?: AiModel;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  applicationId?: string | null;
  roleId?: string | null;
  /** Skip the dedupe cache and call the model again. */
  force?: boolean;
};

export type RunResult<T> = { output: T; runId: string; cached: boolean; model: AiModel; costUsd: number };

/**
 * One function for every AI feature: structured output via messages.parse,
 * prompt caching on the stable prefix, dedupe on an input hash, a daily cap,
 * and an ai_runs row for every call (including refusals and errors).
 */
export async function runAi<T>(input: RunInput<T>): Promise<RunResult<T>> {
  const model = input.model ?? DEFAULT_MODEL;
  const inputHash = createHash("sha256")
    .update([input.task, model, input.system, input.context ?? "", input.prompt].join("\u0000"))
    .digest("hex");

  if (!input.force) {
    const [hit] = await db
      .select()
      .from(aiRuns)
      .where(and(eq(aiRuns.userId, input.userId), eq(aiRuns.inputHash, inputHash), eq(aiRuns.status, "ok")))
      .orderBy(desc(aiRuns.createdAt))
      .limit(1);
    if (hit?.output) {
      const parsed = input.schema.safeParse(hit.output);
      if (parsed.success) return { output: parsed.data, runId: hit.id, cached: true, model, costUsd: 0 };
    }
  }

  const since = new Date(Date.now() - 86_400_000);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiRuns)
    .where(and(eq(aiRuns.userId, input.userId), gte(aiRuns.createdAt, since)));
  if (n >= DAILY_RUN_CAP) throw new AiError(`Daily AI limit reached (${DAILY_RUN_CAP} runs). Try again tomorrow.`, "cap_reached");

  const anthropic = getClient();
  const started = Date.now();
  const base = { userId: input.userId, task: input.task, model, applicationId: input.applicationId ?? null, roleId: input.roleId ?? null, inputHash };

  try {
    const response = await anthropic.messages.parse({
      model,
      max_tokens: input.maxTokens ?? 8000,
      system: [
        { type: "text", text: input.system, cache_control: { type: "ephemeral" } },
        ...(input.context ? [{ type: "text" as const, text: input.context, cache_control: { type: "ephemeral" as const } }] : []),
      ],
      messages: [{ role: "user", content: input.prompt }],
      output_config: { format: zodOutputFormat(input.schema), effort: input.effort ?? "medium" },
    });

    const usage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
    };
    const cost = costUsd(model, usage);
    const durationMs = Date.now() - started;

    if (response.stop_reason === "refusal") {
      await db.insert(aiRuns).values({ ...base, status: "refused", inputTokens: usage.input, outputTokens: usage.output, cacheReadTokens: usage.cacheRead, costUsd: cost.toFixed(6), durationMs, error: response.stop_details?.explanation ?? "refused" });
      throw new AiError("The model declined this request.", "refused");
    }
    const output = response.parsed_output;
    if (!output) {
      await db.insert(aiRuns).values({ ...base, status: "error", inputTokens: usage.input, outputTokens: usage.output, cacheReadTokens: usage.cacheRead, costUsd: cost.toFixed(6), durationMs, error: `no parsed output (stop_reason=${response.stop_reason})` });
      throw new AiError(response.stop_reason === "max_tokens" ? "The answer was too long. Try again with less input." : "The model returned nothing usable.", "no_output");
    }
    const [row] = await db
      .insert(aiRuns)
      .values({ ...base, status: "ok", inputTokens: usage.input, outputTokens: usage.output, cacheReadTokens: usage.cacheRead, costUsd: cost.toFixed(6), durationMs, output: output as unknown as Record<string, unknown> })
      .returning({ id: aiRuns.id });
    return { output, runId: row.id, cached: false, model, costUsd: cost };
  } catch (e) {
    if (e instanceof AiError) throw e;
    const message = e instanceof Anthropic.APIError ? `${e.status ?? ""} ${e.message}`.trim() : e instanceof Error ? e.message : String(e);
    await db.insert(aiRuns).values({ ...base, status: "error", durationMs: Date.now() - started, error: message });
    if (e instanceof Anthropic.RateLimitError) throw new AiError("Rate limited by the AI provider. Wait a minute and retry.", "api");
    if (e instanceof Anthropic.AuthenticationError) throw new AiError("The AI API key was rejected.", "not_configured");
    throw new AiError(`AI request failed: ${message}`, "api");
  }
}

/** Spend for the settings page: this calendar month, in USD. */
export async function monthlyAiSpend(userId: string) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const [row] = await db
    .select({ runs: sql<number>`count(*)::int`, usd: sql<number>`coalesce(sum(${aiRuns.costUsd}), 0)::float` })
    .from(aiRuns)
    .where(and(eq(aiRuns.userId, userId), gte(aiRuns.createdAt, start)));
  return row;
}
