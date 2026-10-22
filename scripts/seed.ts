import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applicationStageEvents, applications, companies, contacts, interactions, notes, profiles, questions, roles, tasks, type ApplicationStage } from "@/db/schema";
import { STAGES } from "@/lib/stages";

/**
 * Demo data for a signed-in user so the journey page has something to show.
 *   pnpm seed you@example.com
 * Idempotent-ish: skips if the user already has companies. Writes audit rows
 * through the same tables but bypasses the action layer on purpose (no user
 * session here); it is dev tooling, not a production path.
 */
const email = process.argv[2];
if (!email) {
  console.error("usage: pnpm seed <email-of-existing-user>");
  process.exit(1);
}

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: readonly T[]) => arr[rand(arr.length)];
const daysAgo = (d: number, h = 10) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, 0, 0, 0);
  return t;
};

const COMPANIES = ["Razorpay", "Zepto", "Atlassian", "Groww", "Postman", "Freshworks", "CRED", "Meesho", "Swiggy", "PhonePe", "Zoho", "Chargebee", "BrowserStack", "Hasura", "Juspay"];
const TITLES = ["Senior Frontend Engineer", "Full-stack Engineer", "Staff Engineer", "Engineering Manager", "Senior Software Engineer", "Lead Product Engineer"];
const SOURCES = ["referral", "linkedin", "company_site", "recruiter", "job_board"] as const;
const LOCATIONS = ["Bengaluru", "Chennai", "Hyderabad", "Remote", "Pune"];

async function main() {
  const user = await db.query.profiles.findFirst({ where: eq(profiles.email, email) });
  if (!user) throw new Error(`No profile for ${email}. Sign in once first.`);
  const userId = user.id;
  const existing = await db.query.companies.findFirst({ where: eq(companies.userId, userId) });
  if (existing) {
    console.log("User already has data; not seeding.");
    return;
  }

  for (let i = 0; i < 28; i++) {
    const name = `${COMPANIES[i % COMPANIES.length]}${i >= COMPANIES.length ? " Labs" : ""}`;
    const [company] = await db.insert(companies).values({ userId, name, industry: pick(["Fintech", "SaaS", "E-commerce", "DevTools"]), hqLocation: pick(LOCATIONS) }).returning();
    const source = pick(SOURCES);
    const [role] = await db
      .insert(roles)
      .values({ userId, companyId: company.id, title: pick(TITLES), source, location: pick(LOCATIONS), workMode: pick(["remote", "hybrid", "onsite"] as const), roleType: "fulltime", currency: "INR", salaryMin: String(2_500_000 + rand(20) * 100_000), salaryMax: String(4_000_000 + rand(30) * 100_000), jdText: `We are hiring a ${pick(TITLES)} at ${name}. You will own the web platform, mentor engineers, and ship weekly. Must have: React, TypeScript, Node, Postgres. Nice: Next.js, system design at scale.` })
      .returning();

    // Walk a random distance down the funnel; referrals go further.
    const depth = Math.min(STAGES.length - 1, rand(source === "referral" ? 6 : 4) + (source === "referral" ? 1 : 0));
    const start = 70 - i * 2;
    let stage: ApplicationStage = "saved";
    let at = daysAgo(start);
    const [app] = await db.insert(applications).values({ userId, roleId: role.id, stage: "saved", stageEnteredAt: at, priority: 1 + rand(4), createdAt: at, updatedAt: at }).returning();
    await db.insert(applicationStageEvents).values({ userId, applicationId: app.id, fromStage: null, toStage: "saved", occurredAt: at });

    for (let s = 1; s <= depth; s++) {
      const next = STAGES[s];
      at = new Date(at.getTime() + (1 + rand(9)) * 86_400_000);
      if (at > new Date()) break;
      const closeReason = next === "closed" ? pick(["rejected", "rejected", "ghosted", "withdrawn"] as const) : null;
      await db.insert(applicationStageEvents).values({ userId, applicationId: app.id, fromStage: stage, toStage: next, closeReason, occurredAt: at, roundLabel: next === "interview" ? "Round 1 – technical" : null });
      stage = next;
      await db.update(applications).set({ stage, closeReason, stageEnteredAt: at, appliedAt: s === 1 ? at : undefined, updatedAt: at }).where(eq(applications.id, app.id));
    }

    if (rand(3) === 0) {
      const [c] = await db.insert(contacts).values({ userId, companyId: company.id, fullName: pick(["Riya Menon", "Arjun Rao", "Neha Iyer", "Karthik S", "Divya Pillai"]), title: pick(["Recruiter", "Engineering Manager", "Staff Engineer"]), relationship: pick(["recruiter", "referrer", "interviewer"]), email: `person${i}@example.com`, lastTouchAt: daysAgo(rand(20)), nextFollowUpAt: rand(2) ? daysAgo(-rand(10)) : daysAgo(rand(5)) }).returning();
      await db.insert(interactions).values({ userId, contactId: c.id, applicationId: app.id, kind: pick(["email", "call", "linkedin"] as const), direction: "out", occurredAt: daysAgo(rand(20)), summary: "Reached out about the open role and asked about the team." });
    }
    if (stage === "interview" || stage === "offer") {
      await db.insert(notes).values({ userId, applicationId: app.id, companyId: company.id, kind: "prep", title: `Prep: ${name} round 1`, bodyMd: "- Revise system design for feeds\n- Stories: migration, outage, mentoring", tags: ["system-design"] });
      await db.insert(tasks).values({ userId, kind: "interview", title: `Round 2 at ${name}`, dueAt: daysAgo(-(1 + rand(6)), 11), applicationId: app.id });
    }
    if (stage !== "closed" && stage !== "saved" && rand(2)) {
      await db.insert(tasks).values({ userId, kind: "follow_up", title: `Follow up on ${role.title} @ ${name}`, dueAt: daysAgo(rand(6) - 2, 9), applicationId: app.id });
    }
  }
  await db.insert(questions).values([
    { userId, prompt: "Design a rate limiter for a public API", tags: ["system-design"], difficulty: 4, askedCount: 3 },
    { userId, prompt: "Tell me about a time you pushed back on a deadline", tags: ["behavioural"], difficulty: 2, askedCount: 2 },
    { userId, prompt: "How does React reconcile the tree?", tags: ["react"], difficulty: 3, askedCount: 1 },
  ]);
  console.log(`Seeded 28 applications for ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
