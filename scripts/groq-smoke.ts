import { config } from "dotenv";
import type { ZodType } from "zod";
import { callGroq } from "@/lib/ai/groq";
import { SYSTEM, TASK_SCHEMAS, type TaskName } from "@/lib/ai/tasks";

config({ path: ".env.local" });

/** Live check of every AI task against Groq: pnpm ai:smoke [task,task] [model] */

const JD = `Senior Backend Engineer, Payments — Razorpay, Bengaluru (hybrid). Build and scale payment APIs in Go and Java handling 10k TPS. Must have: 6+ years backend, distributed systems, PostgreSQL, Kafka, AWS. Nice to have: PCI-DSS, blockchain settlement experience. You will own reconciliation services, mentor engineers, and drive reliability (99.99%). Salary ₹45–60 LPA.`;
const PROFILE = `## Candidate profile\n8 years backend engineering. Built a Hyperledger Fabric settlement network at a bank (Go, Kafka, PostgreSQL) processing 2M tx/day. Led a team of 5. AWS certified. Technical program manager for 2 years on a KYC platform.`;

const tasks = (process.argv[2]?.split(",") ?? Object.keys(TASK_SCHEMAS)) as TaskName[];
const model = process.argv[3] ?? "openai/gpt-oss-120b";
async function main() {
for (const task of tasks) {
  const t = Date.now();
  try {
    const r = await callGroq(model, {
      task,
      schema: TASK_SCHEMAS[task] as ZodType<unknown>,
      system: SYSTEM[task],
      context: task === "jd_parse" || task === "clip_extract" ? undefined : PROFILE,
      prompt: task === "clip_extract" ? `URL: https://razorpay.com/jobs/123\n\n## Page text\nCareers | Cookies\n${JD}\nApply now` : `## Role\n${JD}`,
      effort: task === "jd_parse" || task === "clip_extract" ? "low" : "medium",
      maxTokens: 6000,
    });
    console.log(`${task}: ${r.output ? "OK" : "NO OUTPUT"} stop=${r.stopReason} in=${r.usage.input} out=${r.usage.output} ${Date.now() - t}ms`);
    console.log("  ", JSON.stringify(r.output).slice(0, 220));
  } catch (e) {
    console.log(`${task}: ERROR ${e instanceof Error ? e.message : e}`);
  }
}
}
void main();
