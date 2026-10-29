import "server-only";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { modelProvider, runAi, type AiModel } from "@/lib/ai/client";
import { clipExtractSchema, SYSTEM, type ClipExtract } from "@/lib/ai/tasks";

const MAX_CHARS = 40_000;
const GROQ_MAX_CHARS = 10_000;

/** Server fetch + Readability. Returns null when the page is an empty JS shell. */
export async function fetchPageText(url: string): Promise<{ text: string; title: string | null } | null> {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 JobJourneyClipper/1.0",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-IN,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Page returned ${res.status}`);
  const html = await res.text();
  const { document } = parseHTML(html);
  const title = document.querySelector("title")?.textContent?.trim() ?? null;

  // Try JSON-LD JobPosting first: many ATS pages embed the full description there.
  for (const s of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const data = JSON.parse(s.textContent ?? "");
      const posting = findJobPosting(data);
      if (posting) {
        const desc = stripHtml(String(posting.description ?? ""));
        const parts = [
          `Title: ${posting.title ?? ""}`,
          `Company: ${posting.hiringOrganization?.name ?? ""}`,
          `Location: ${describeLocation(posting)}`,
          posting.datePosted ? `Posted: ${posting.datePosted}` : "",
          posting.employmentType ? `Type: ${posting.employmentType}` : "",
          posting.baseSalary ? `Salary: ${JSON.stringify(posting.baseSalary)}` : "",
          "",
          desc,
        ];
        return { text: parts.filter(Boolean).join("\n").slice(0, MAX_CHARS), title };
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }

  const article = new Readability(document as unknown as Document).parse();
  const text = (article?.textContent ?? document.body?.textContent ?? "").replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  if (text.length < 300) return null;
  return { text: text.slice(0, MAX_CHARS), title };
}

type JobPosting = { "@type"?: string; title?: string; description?: string; hiringOrganization?: { name?: string }; jobLocation?: unknown; datePosted?: string; employmentType?: string; baseSalary?: unknown; jobLocationType?: string };
function findJobPosting(data: unknown): JobPosting | null {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data)) return data.map(findJobPosting).find(Boolean) ?? null;
  const obj = data as JobPosting & { "@graph"?: unknown[] };
  if (obj["@type"] === "JobPosting") return obj;
  if (obj["@graph"]) return findJobPosting(obj["@graph"]);
  return null;
}
function describeLocation(p: JobPosting) {
  const loc = p.jobLocation as { address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } } | undefined;
  const a = Array.isArray(loc) ? (loc[0] as typeof loc)?.address : loc?.address;
  const parts = [a?.addressLocality, a?.addressRegion, a?.addressCountry].filter(Boolean);
  return [parts.join(", "), p.jobLocationType].filter(Boolean).join(" · ");
}
function stripHtml(html: string) {
  const { document } = parseHTML(`<body>${html}</body>`);
  return (document.body?.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

export async function extractJob(
  userId: string,
  input: { url?: string | null; text: string; model?: AiModel },
): Promise<{ draft: ClipExtract; cached: boolean; costUsd: number }> {
  // Groq's free tier allows 8K tokens a minute, and the JD has to come back out in jdText too.
  const maxChars = modelProvider(input.model) === "groq" ? GROQ_MAX_CHARS : MAX_CHARS;
  const prompt = `${input.url ? `URL: ${input.url}\n\n` : ""}## Page text\n${input.text.slice(0, maxChars)}`;
  const r = await runAi({
    userId,
    task: "clip_extract",
    schema: clipExtractSchema,
    system: SYSTEM.clip_extract,
    prompt,
    model: input.model,
    effort: "low",
    maxTokens: 12_000,
  });
  return { draft: r.output, cached: r.cached, costUsd: r.costUsd };
}
