import { z } from "zod";

/**
 * One entry per AI feature: the output schema and a frozen system prompt.
 * Keep system prompts free of per-request content so they cache.
 */

export const clipExtractSchema = z.object({
  company: z.string().describe("Hiring company name, without 'Inc' noise"),
  title: z.string().describe("Job title as posted"),
  location: z.string().nullable(),
  workMode: z.enum(["remote", "hybrid", "onsite"]).nullable(),
  roleType: z.enum(["fulltime", "contract", "freelance", "internship"]).nullable(),
  salaryMin: z.number().nullable().describe("Annual, in the posting's currency, null if absent"),
  salaryMax: z.number().nullable(),
  currency: z.string().length(3).nullable(),
  source: z.enum(["linkedin", "company_site", "recruiter", "job_board", "referral", "other"]),
  jdText: z.string().describe("The full job description as clean plain text, headings kept, boilerplate removed"),
  postedAt: z.string().nullable().describe("ISO date if stated, else null"),
  confidence: z.number().min(0).max(1),
});
export type ClipExtract = z.infer<typeof clipExtractSchema>;

export const jdParseSchema = z.object({
  summary: z.string().describe("Three sentences: what the role is, who it is for, what matters most"),
  mustHaves: z.array(z.string()).max(12),
  niceToHaves: z.array(z.string()).max(12),
  responsibilities: z.array(z.string()).max(10),
  seniority: z.string(),
  redFlags: z.array(z.string()).max(6).describe("Vague scope, unrealistic stacks, pay/equity ambiguity, etc."),
  keywords: z.array(z.string()).max(20).describe("ATS keywords worth mirroring in a resume"),
});

export const fitScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: z.enum(["strong", "good", "stretch", "weak"]),
  rationale: z.string().describe("Four to six sentences, specific to this profile and JD"),
  strengths: z.array(z.string()).max(6),
  gaps: z.array(z.string()).max(6),
  questionsToAsk: z.array(z.string()).max(5).describe("What to clarify with the recruiter before investing time"),
});

export const resumeBulletsSchema = z.object({
  bullets: z
    .array(z.object({ text: z.string(), targets: z.string().describe("Which JD requirement this bullet speaks to") }))
    .min(4)
    .max(8),
  summaryLine: z.string().describe("A one-line resume headline tailored to this role"),
  skillsToSurface: z.array(z.string()).max(12),
});

export const coverLetterSchema = z.object({
  subject: z.string(),
  body: z.string().describe("250 to 350 words, plain text paragraphs, no placeholders"),
});

export const interviewQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        prompt: z.string(),
        kind: z.enum(["technical", "system_design", "behavioural", "role_specific", "culture"]),
        why: z.string().describe("Why this is likely given the JD"),
        answerOutline: z.string().describe("Three to five bullet points of what a strong answer covers"),
      }),
    )
    .min(6)
    .max(12),
});

export const followUpEmailSchema = z.object({
  subject: z.string(),
  body: z.string().describe("Under 120 words, warm, specific, with one clear ask"),
});

const VOICE = `Write plainly. No hype adjectives, no filler, no emojis. Prefer concrete nouns and numbers from the source material over generalities. Never invent experience, employers, dates or metrics that are not in the candidate's profile; if the profile lacks something the role needs, say so rather than papering over it.`;

export const SYSTEM = {
  clip_extract: `You extract structured job-posting data from page text. The text may include navigation, cookie banners and unrelated listings; ignore them and focus on the single primary posting. Keep the job description faithful and complete in jdText. Salary must be annualised; if the posting gives a monthly figure, multiply by 12 and note nothing else. Indian postings quote LPA (lakhs per annum): 45 LPA is 4500000 INR, and 1 crore is 10000000. If a field is genuinely absent, return null rather than guessing. Set source from the URL's host: linkedin.com → linkedin; greenhouse, lever, workday, ashby, naukri, indeed, wellfound → job_board; the company's own domain → company_site; otherwise other.`,
  jd_parse: `You read job descriptions for a candidate and separate signal from boilerplate. Be specific and terse. ${VOICE}`,
  fit_score: `You assess fit between a candidate's own profile and a job description. Score 0–100 where 85+ means the candidate clearly meets the must-haves and would be a top applicant, 65–84 a good match with small gaps, 45–64 a stretch, below 45 a weak match. Be honest; an inflated score wastes the candidate's time. ${VOICE}`,
  resume_bullets: `You rewrite and select resume bullets so they speak directly to a job description, using only facts from the candidate's profile. Each bullet starts with a strong verb, states what was done and the outcome, and mirrors the JD's vocabulary where truthful. ${VOICE}`,
  cover_letter: `You draft short cover letters in the candidate's voice: specific about why this company and role, specific about two or three relevant things the candidate has done, and direct about what they want next. No clichés ("I am writing to express"), no restating the resume. ${VOICE}`,
  interview_questions: `You predict the questions an interview loop is likely to ask for a given role and company, grounded in the job description and the candidate's profile (so the behavioural questions probe real gaps). Mix technical, design, behavioural and role-specific. ${VOICE}`,
  follow_up_email: `You draft brief follow-up emails for a job seeker: thank-you after an interview, nudge after silence, or a referral ask. Reference something concrete from the context. One clear ask. ${VOICE}`,
} as const;

export const TASK_SCHEMAS = {
  clip_extract: clipExtractSchema,
  jd_parse: jdParseSchema,
  fit_score: fitScoreSchema,
  resume_bullets: resumeBulletsSchema,
  cover_letter: coverLetterSchema,
  interview_questions: interviewQuestionsSchema,
  follow_up_email: followUpEmailSchema,
} as const;
export type TaskName = keyof typeof TASK_SCHEMAS;
export type TaskOutput<T extends TaskName> = z.infer<(typeof TASK_SCHEMAS)[T]>;
