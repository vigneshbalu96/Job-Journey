import { z, type ZodType } from "zod";

type Usage = { input: number; output: number; cacheRead: number };
/** refusal is null unless the model declined; output is null when nothing parseable came back. */
export type ProviderResult<T> = { output: T | null; refusal: string | null; stopReason: string | null; usage: Usage };

export type GroqInput<T> = {
  task: string;
  schema: ZodType<T>;
  system: string;
  context?: string;
  prompt: string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
};

export class GroqError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "GroqError";
  }
}

/** Groq's free tier allows 8K tokens per minute per model, counting the requested completion budget. */
const GROQ_TPM = 8000;

/**
 * Groq via its OpenAI-compatible endpoint with strict JSON schema output.
 * Strict mode rejects length/range keywords, so they move into descriptions
 * and arrays are trimmed to their max before zod validates the result.
 */
export async function callGroq<T>(model: string, input: GroqInput<T>): Promise<ProviderResult<T>> {
  const jsonSchema = z.toJSONSchema(input.schema, { target: "draft-7" }) as JsonSchema;
  delete jsonSchema.$schema;
  const system = input.context ? `${input.system}\n\n${input.context}` : input.system;
  const approxInputTokens = Math.ceil((system.length + input.prompt.length + JSON.stringify(jsonSchema).length) / 3.5);
  const maxCompletion = Math.max(1500, Math.min(input.maxTokens ?? 8000, GROQ_TPM - approxInputTokens - 300));

  const res = await postWithRetry(
    JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: input.prompt },
      ],
      response_format: { type: "json_schema", json_schema: { name: input.task, strict: true, schema: toStrictSchema(jsonSchema) } },
      reasoning_effort: input.effort ?? "medium",
      max_completion_tokens: maxCompletion,
    }),
  );
  const json = (await res.json().catch(() => null)) as GroqResponse | null;
  if (!res.ok) throw new GroqError(res.status, json?.error?.message ?? res.statusText);

  const choice = json?.choices?.[0];
  const usage = { input: json?.usage?.prompt_tokens ?? 0, output: json?.usage?.completion_tokens ?? 0, cacheRead: 0 };
  const stopReason = choice?.finish_reason === "length" ? "max_tokens" : (choice?.finish_reason ?? null);
  if (choice?.message?.refusal) return { output: null, refusal: choice.message.refusal, stopReason, usage };

  let output: T | null = null;
  try {
    const parsed = input.schema.safeParse(trimToSchema(JSON.parse(choice?.message?.content ?? ""), jsonSchema));
    if (parsed.success) output = parsed.data;
  } catch {
    // unparseable JSON falls through as no output
  }
  return { output, refusal: null, stopReason, usage };
}

/** One retry when the per-minute limit says the wait is short; clicking several AI buttons in a row hits it. */
async function postWithRetry(body: string, retried = false): Promise<Response> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}`, "content-type": "application/json" },
    body,
    signal: AbortSignal.timeout(50_000),
  });
  const wait = Number(res.headers.get("retry-after"));
  if (res.status === 429 && !retried && wait > 0 && wait <= 15) {
    await new Promise((r) => setTimeout(r, wait * 1000));
    return postWithRetry(body, true);
  }
  return res;
}

type GroqResponse = {
  choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

type JsonSchema = { [k: string]: unknown; description?: string; properties?: Record<string, JsonSchema>; items?: JsonSchema; anyOf?: JsonSchema[]; maxItems?: number };

const CONSTRAINT_HINTS: Record<string, (v: unknown) => string> = {
  minItems: (v) => `at least ${v} items`,
  maxItems: (v) => `at most ${v} items`,
  minimum: (v) => `minimum ${v}`,
  maximum: (v) => `maximum ${v}`,
  exclusiveMinimum: (v) => `greater than ${v}`,
  exclusiveMaximum: (v) => `less than ${v}`,
  minLength: (v) => `at least ${v} characters`,
  maxLength: (v) => `at most ${v} characters`,
};

/** Copy of the schema without the keywords Groq's strict mode refuses; the limits become description text. */
export function toStrictSchema(schema: JsonSchema): JsonSchema {
  const out: JsonSchema = {};
  const hints: string[] = [];
  for (const [key, value] of Object.entries(schema)) {
    if (key in CONSTRAINT_HINTS) hints.push(CONSTRAINT_HINTS[key](value));
    else if (key === "format" || key === "pattern") continue;
    else if (key === "properties") out.properties = Object.fromEntries(Object.entries(value as Record<string, JsonSchema>).map(([k, v]) => [k, toStrictSchema(v)]));
    else if (key === "items") out.items = toStrictSchema(value as JsonSchema);
    else if (key === "anyOf") out.anyOf = (value as JsonSchema[]).map(toStrictSchema);
    else out[key] = value;
  }
  if (hints.length) out.description = [schema.description, `(${hints.join(", ")})`].filter(Boolean).join(" ");
  return out;
}

/** Trims over-long arrays so a model that writes 13 keywords where 12 are allowed still validates. */
export function trimToSchema(value: unknown, schema: JsonSchema): unknown {
  if (Array.isArray(value)) {
    const items = schema.items ?? schema.anyOf?.find((s) => s.items)?.items;
    const max = schema.maxItems ?? schema.anyOf?.find((s) => s.maxItems)?.maxItems;
    const trimmed = max !== undefined ? value.slice(0, max) : value;
    return items ? trimmed.map((v) => trimToSchema(v, items)) : trimmed;
  }
  if (value && typeof value === "object") {
    const props = schema.properties ?? schema.anyOf?.find((s) => s.properties)?.properties;
    if (!props) return value;
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, props[k] ? trimToSchema(v, props[k]) : v]));
  }
  return value;
}
