import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { ZodType } from "zod";
import { db } from "@/db";
import { aiRuns, type AiTask } from "@/db/schema";
import { callGroq, GroqError, type ProviderResult } from "./groq";
import { AI_MODEL_IDS, AI_MODELS, type AiModel, type AiProvider, type ModelOption } from "./models";

export { AI_MODELS, type AiModel } from "./models";

const PROVIDER_KEY: Record<AiProvider, string> = { groq: "GROQ_API_KEY", anthropic: "ANTHROPIC_API_KEY" };
const isConfigured = (provider: AiProvider) => !!process.env[PROVIDER_KEY[provider]];

/** Models whose provider has a key, in registry order (free Groq models first). */
export function availableModels(): ModelOption[] {
  return AI_MODEL_IDS.filter((m) => isConfigured(AI_MODELS[m].provider)).map((m) => ({ value: m, label: AI_MODELS[m].label }));
}

/** AI_DEFAULT_MODEL if its provider is configured, else the first configured model. */
export function defaultModel(): AiModel {
  const env = process.env.AI_DEFAULT_MODEL as AiModel | undefined;
  if (env && env in AI_MODELS && isConfigured(AI_MODELS[env].provider)) return env;
  return availableModels()[0]?.value ?? "openai/gpt-oss-120b";
}

export const modelProvider = (model?: AiModel) => AI_MODELS[model ?? defaultModel()].provider;

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
 * One function for every AI feature: structured output (Anthropic messages.parse
 * or Groq strict JSON schema), dedupe on an input hash, a daily cap, and an
 * ai_runs row for every call (including refusals and errors).
 */
export async function runAi<T>(input: RunInput<T>): Promise<RunResult<T>> {
  const model = input.model ?? defaultModel();
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

  const provider = AI_MODELS[model].provider;
  if (!isConfigured(provider)) throw new AiError(`AI is not configured. Add ${PROVIDER_KEY[provider]} to the environment.`, "not_configured");

  const started = Date.now();
  const base = { userId: input.userId, task: input.task, model, applicationId: input.applicationId ?? null, roleId: input.roleId ?? null, inputHash };

  try {
    const call = provider === "groq" ? await callGroq(model, input) : await callAnthropic(model, input);
    const cost = costUsd(model, call.usage);
    const durationMs = Date.now() - started;
    const usageCols = { inputTokens: call.usage.input, outputTokens: call.usage.output, cacheReadTokens: call.usage.cacheRead, costUsd: cost.toFixed(6), durationMs };

    if (call.refusal !== null) {
      await db.insert(aiRuns).values({ ...base, status: "refused", ...usageCols, error: call.refusal || "refused" });
      throw new AiError("The model declined this request.", "refused");
    }
    if (call.output == null) {
      await db.insert(aiRuns).values({ ...base, status: "error", ...usageCols, error: `no parsed output (stop_reason=${call.stopReason})` });
      throw new AiError(call.stopReason === "max_tokens" ? "The answer was too long. Try again with less input." : "The model returned nothing usable.", "no_output");
    }
    const output = call.output;
    const [row] = await db
      .insert(aiRuns)
      .values({ ...base, status: "ok", ...usageCols, output: output as unknown as Record<string, unknown> })
      .returning({ id: aiRuns.id });
    return { output, runId: row.id, cached: false, model, costUsd: cost };
  } catch (e) {
    if (e instanceof AiError) throw e;
    const message =
      e instanceof Anthropic.APIError ? `${e.status ?? ""} ${e.message}`.trim() : e instanceof GroqError ? `${e.status} ${e.message}` : e instanceof Error ? e.message : String(e);
    await db.insert(aiRuns).values({ ...base, status: "error", durationMs: Date.now() - started, error: message });
    if (e instanceof Anthropic.RateLimitError || (e instanceof GroqError && e.status === 429))
      throw new AiError("Rate limited by the AI provider (Groq free tier allows about 30 runs a minute). Wait a minute and retry.", "api");
    if (e instanceof GroqError && e.status === 413) throw new AiError("That input is too large for the free tier. Shorten the job description or profile and retry.", "api");
    if (e instanceof Anthropic.AuthenticationError || (e instanceof GroqError && e.status === 401)) throw new AiError("The AI API key was rejected.", "not_configured");
    throw new AiError(`AI request failed: ${message}`, "api");
  }
}


async function callAnthropic<T>(model: AiModel, input: RunInput<T>): Promise<ProviderResult<T>> {
  const response = await getClient().messages.parse({
    model,
    max_tokens: input.maxTokens ?? 8000,
    system: [
      { type: "text", text: input.system, cache_control: { type: "ephemeral" } },
      ...(input.context ? [{ type: "text" as const, text: input.context, cache_control: { type: "ephemeral" as const } }] : []),
    ],
    messages: [{ role: "user", content: input.prompt }],
    output_config: { format: zodOutputFormat(input.schema), effort: input.effort ?? "medium" },
  });
  return {
    output: response.parsed_output ?? null,
    refusal: response.stop_reason === "refusal" ? (response.stop_details?.explanation ?? "") : null,
    stopReason: response.stop_reason,
    usage: { input: response.usage.input_tokens, output: response.usage.output_tokens, cacheRead: response.usage.cache_read_input_tokens ?? 0 },
  };
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
