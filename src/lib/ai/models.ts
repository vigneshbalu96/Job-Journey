/**
 * Model registry shared by server and client. Prices are USD per million tokens;
 * Groq's free tier costs nothing, so its models are priced at zero.
 */
export const AI_MODELS = {
  "openai/gpt-oss-120b": { provider: "groq", label: "GPT-OSS 120B · free (Groq)", input: 0, output: 0, cacheRead: 0 },
  "openai/gpt-oss-20b": { provider: "groq", label: "GPT-OSS 20B · free, fastest (Groq)", input: 0, output: 0, cacheRead: 0 },
  "claude-sonnet-5-5": { provider: "anthropic", label: "Sonnet 5.5 · fast, cheap", input: 2, output: 10, cacheRead: 0.2 },
  "claude-opus-5-5": { provider: "anthropic", label: "Opus 5.5 · deeper", input: 4, output: 20, cacheRead: 0.2 },
} as const;
export type AiModel = keyof typeof AI_MODELS;
export type AiProvider = (typeof AI_MODELS)[AiModel]["provider"];

export const AI_MODEL_IDS = Object.keys(AI_MODELS) as [AiModel, ...AiModel[]];

export type ModelOption = { value: AiModel; label: string };
