/**
 * Model registry shared by server and client. Both run on Groq's free tier,
 * so there is no per-token price to track.
 */
export const AI_MODELS = {
  "openai/gpt-oss-120b": { label: "GPT-OSS 120B · best quality" },
  "openai/gpt-oss-20b": { label: "GPT-OSS 20B · fastest" },
} as const;
export type AiModel = keyof typeof AI_MODELS;

export const AI_MODEL_IDS = Object.keys(AI_MODELS) as [AiModel, ...AiModel[]];

export type ModelOption = { value: AiModel; label: string };
