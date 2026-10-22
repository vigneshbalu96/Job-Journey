# Job Search Journey app — implementation plan

## Context

Vignesh wants one place to manage and *map* their job search end to end, from first saved role to accepted offer. Existing trackers (Teal, Huntr, Simplify, Notion templates) cover the kanban but not the journey: no whole-search timeline, no funnel metrics by source, no prep notes tied to contacts and applications, no reflection loop, and no automation of the repetitive work (JD parsing, tailoring, follow-up drafts).

Decision taken with the user: **build a lean custom app, multi-user from day one**, on the stack they already ship (Next.js 15 App Router, Drizzle, Supabase Postgres, Tailwind v4 + shadcn, Vercel). It also serves as a live portfolio piece during the search.

Confirmed scope (all of it, phased): applications pipeline with stage history · companies/roles · contacts & referrals with emails, phones, follow-ups · interview prep, question bank, reflections, rejection learnings · journey timeline + metrics · resume/cover-letter versions with uploads · reminders (Today view + daily email digest) · offer comparison · job clipper + bookmarklet · AI assist for the time sinks.

Standing rules carried over from the user's other apps: **all deletes are soft** (`deletedAt`, filtered from reads) and **every create/update/delete writes an `audit_log` row**.

## Assumptions (say so if wrong)

- New repo at `/home/vignesh/Projects/job-journey`, package manager **pnpm** (9.15 installed; Node 22.12).
- A **new Supabase project** (not Nestara's) and a new Vercel project under whichever account you choose. Vercel + Supabase CLIs get installed in Phase 0.
- Email digest via **Resend** from a subdomain of a domain you control (e.g. `mail.cnde.in`); domain verification is a manual step for you.
- AI calls use the Anthropic API, default model `claude-sonnet-5-5`, with `claude-opus-5-5` opt-in per run.

## What to reuse from Nestara (`/home/vignesh/Projects/nestara-pg/Booking-Application`)

Copy as-is or near-as-is:
- `src/db/index.ts` — `postgres()` client cached on `globalThis` (no pool leaks in dev).
- `src/lib/supabase-storage.ts` — Storage REST upload with service-role key, idempotent private-bucket creation.
- `components.json` (new-york, neutral, CSS vars, lucide) and the `src/components/ui/*` shadcn primitives; `src/components/portal/{EmptyState,PageError,PageSkeleton,PortalPageHeader,TablePagination}.tsx` and the `PortalShell` sidebar layout (without its client-side auth gate).
- The `logAudit(dbOrTx, input)` idea from `src/lib/audit-log.ts` (accepting db or a transaction), upgraded to `jsonb` + `timestamptz`.
- `src/lib/utils.ts`, the Anthropic SDK call shape from `src/lib/id-verification-ai.ts`.

Do fresh (Nestara's versions are not suitable): auth (hand-rolled HMAC cookies, no middleware), migrations (hand-written scripts), validation (zod installed but unused), user scoping (one route leaks other users' data), lint/test tooling (none).

## Architecture

### Auth: Supabase Auth via `@supabase/ssr` (Google + magic link)
One JWT covers Postgres, Storage and optional RLS; cookie handling is one `middleware.ts` plus a `createServerClient` helper. Auth.js would add a second table set and session model for no gain. Read the user with `supabase.auth.getUser()` server-side (never `getSession()`); create the `profiles` row lazily on first authenticated request.

### Data layer (Drizzle, `src/db/schema.ts`, drizzle-kit migrations in `./drizzle`)
Conventions: `uuid` PKs (`gen_random_uuid()`), every table has `userId`, `createdAt`, `updatedAt`, `deletedAt timestamptz NULL`; composite indexes start with `(userId, …)`; **unique constraints are partial `WHERE deleted_at IS NULL`** so a soft-deleted company can be re-created. Money = `numeric(14,2)` + `currency char(3)`.

Enums: `application_stage` (saved, applied, screening, interview, offer, closed) · `close_reason` (accepted, rejected, withdrawn, ghosted) · `application_source` (referral, linkedin, company_site, recruiter, job_board, other) · `role_type` · `work_mode` · `interaction_kind` (email, call, linkedin, meeting, interview, other) · `note_kind` (prep, reflection, rejection_learning, general) · `task_kind` (follow_up, interview, deadline, custom) · `document_kind` (resume, cover_letter) · `audit_action` (create, update, delete, restore) · `ai_task` (clip_extract, jd_parse, fit_score, resume_bullets, cover_letter, interview_questions, follow_up_email).

Tables:
- `profiles` — id = auth.users.id, email, displayName, timezone, digestHour (default 8), digestEnabled, masterProfile text (what AI scores against), targetRoles[], targetLocations[].
- `companies` — name, website, domain, industry, size, hqLocation, linkedinUrl, notes. Idx `(userId, lower(name))`.
- `roles` — companyId, title, roleType, workMode, location, salaryMin/Max, currency, sourceUrl, source, jdText, jdSummary, postedAt, clippedAt, rawHtmlPath.
- `applications` — roleId (unique per user, non-deleted), stage, closeReason, **stageEnteredAt** (denormalised for time-in-stage), appliedAt, resumeDocumentId, coverLetterDocumentId, referredByContactId, priority, fitScore, fitRationale. Idx `(userId, stage)`.
- `application_stage_events` — applicationId, fromStage, toStage, closeReason, roundLabel ("Round 2 – system design"), occurredAt, note. Insert-only.
- `contacts` — companyId NULL, fullName, **email, phone**, linkedinUrl, title, relationship, referredByContactId (self), lastTouchAt, **nextFollowUpAt**, notes. Partial idx `(userId, nextFollowUpAt)`.
- `interactions` — contactId, applicationId NULL, kind, direction (in/out), occurredAt, summary. Writing one bumps `contacts.lastTouchAt`.
- `notes` — kind, companyId NULL, applicationId NULL, title, bodyMd, tags[]. One polymorphic table instead of prep/reflection tables.
- `questions` — prompt, answerMd, tags[] (GIN), difficulty, companyId/applicationId NULL, askedCount, lastAskedAt.
- `documents` — kind, name, version, storagePath, mimeType, sizeBytes, parentId (version lineage), notes. Unique `(userId, kind, name, version)`. Resumes and cover letters share one table.
- `offers` — applicationId unique, baseAnnual, variableAnnual, equityDescription, equityValueAnnual, signOn, ctcTotal, currency, location, workMode, noticePeriodDays, joiningDate, deadlineAt, decisionNotes, status (received/negotiating/accepted/declined).
- `tasks` — kind, title, dueAt, completedAt, snoozedUntil, applicationId/contactId NULL. Partial idx `(userId, dueAt) WHERE completed_at IS NULL`. Backs reminders, interview slots and Today.
- `audit_log` — bigserial id, userId, tableName, rowId, action, before jsonb, after jsonb (changed columns only), at. Insert-only, no deletedAt.
- `ai_runs` — task, model, applicationId/roleId NULL, inputHash, input/output/cacheRead tokens, costUsd, durationMs, status (ok/error/refused), output jsonb, error.
- `digest_sends` — sentForDate, resendMessageId, status. Unique `(userId, sentForDate)` makes the cron idempotent.

The journey timeline is a query unioning stage events, interactions, completed tasks and offers, not a table.

### Server conventions
- **Server actions** (`src/actions/*.ts`) for all UI CRUD. **Route handlers** only for cron, bookmarklet (cross-origin), signed uploads, clip ingest, streaming AI.
- `withUser(fn)` in `src/lib/auth.ts` resolves the Supabase user or throws; every action/handler is wrapped.
- `src/lib/repo.ts`: `scoped(table, userId)` base where-clause (`userId = ? AND deletedAt IS NULL`); `mutate()` does select-before → write → `audit()` in one transaction so callers cannot forget; `softDelete()` sets `deletedAt` and audits.
- One zod schema per entity in `src/schemas/*.ts`, shared by react-hook-form resolvers, server-action entry parsing, and AI structured outputs. Actions return `{ ok, data } | { ok:false, fieldErrors }`.
- `transitionStage()` is the single path for stage changes: validates allowed moves, writes a stage event, updates `stageEnteredAt`, auto-creates a follow-up `task` (days-per-stage configurable in settings). Accepting an offer closes all other open applications as `withdrawn` with events.
- RLS enabled with `user_id = auth.uid()` as defense-in-depth (matters for direct Storage access); Drizzle connects via service role and relies on app scoping. A vitest test greps `src/actions` and `src/app/api` for raw `db.select(`/`db.delete(` outside `repo.ts` and fails.
- AI (`src/lib/ai/client.ts`): structured outputs via `messages.parse()` + `zodOutputFormat()`; master profile + frozen system prompt first with `cache_control`; `effort: "low"` for extraction; per-task `max_tokens` caps; dedupe on `inputHash`; log every run with cost; show monthly spend in settings.

### Route map
```
app/(auth)/login, app/auth/callback/route.ts
app/(app)/layout.tsx                 sidebar + Today badge
app/(app)/today                      overdue follow-ups, upcoming interviews, due tasks
app/(app)/pipeline                   kanban (dnd-kit); ?view=table
app/(app)/applications/[id]          tabs: overview · stages · notes/prep · contacts · files · AI
app/(app)/companies, companies/[id]  dossier: roles, people, notes
app/(app)/contacts, contacts/[id]    interaction log, follow-up
app/(app)/questions                  question bank
app/(app)/documents                  resume / cover-letter versions
app/(app)/offers                     side-by-side comparison
app/(app)/journey                    timeline + metrics (funnel by source/role, weekly activity, time-in-stage, response rate)
app/(app)/clip                       paste URL / bookmarklet target → prefilled role form
app/(app)/settings                   profile, master profile, digest prefs, AI spend
api/cron/digest/route.ts             hourly Vercel Cron, CRON_SECRET; picks users whose local hour == digestHour
api/clip/route.ts                    POST {url | text}: fetch + readability + LLM extract
api/clip/bookmarklet/route.ts        serves bookmarklet JS (sends rendered innerText to /clip)
api/uploads/sign/route.ts            signed upload URL, path forced to {userId}/…
api/ai/[task]/route.ts               streaming SSE
```

## Phases (each ends demo-able)

| # | Scope | Effort | Demo |
|---|---|---|---|
| 0 | Scaffold (`create-next-app`, Tailwind v4, shadcn, eslint/prettier/vitest/playwright), Drizzle + migrations, Supabase Auth + middleware, `withUser`, `repo.ts`, profiles, copy Nestara helpers | 1–1.5 d | Google/magic-link login, empty shell, audit row on profile create |
| 1 | companies, roles, applications, stage events, kanban + table, detail page, `transitionStage`, time-in-stage | 3 d | Drag card across stages, history + durations visible, soft delete works |
| 2 | contacts, interactions, notes, questions, documents + signed upload, link docs to application | 2.5 d | Full company dossier: people, prep notes, resume v3 attached |
| 3 | journey timeline, funnel by source/role type, weekly counts, response rates (dataviz skill for charts) | 1.5 d | Journey page over seeded data |
| 4 | tasks, Today view, settings, hourly cron digest via Resend, `digest_sends` | 1.5 d | Overdue list in app; digest arrives at local 08:00 |
| 5 | clipper: bookmarklet → fetch/readability fallback → paste-JD fallback; LLM extraction; `ai_runs` logging | 1.5 d | Paste URL, get prefilled role form |
| 6 | AI assist tab: JD parse, fit score, tailored resume bullets, cover-letter draft, likely questions, follow-up email drafts; streaming; cost caps | 3 d | All six outputs on one application |
| 7 | offers CRUD + comparison, accept → close others | 1 d | Compare two offers, accept one |

Total ≈ 15–16 developer days. Deploy to Vercel from Phase 0 so the public URL exists from day one.

## Risks & decisions
- **JS-rendered job pages** (LinkedIn, Workday): bookmarklet with rendered text is the primary path; server fetch is a fallback; paste-JD is the last resort. No headless browser in v1.
- **Email deliverability**: SPF/DKIM on a Resend subdomain; idempotent sends; hourly cron matched to user timezone.
- **Scoping**: app-level scoping is the enforced layer; RLS is backup; upload paths are prefixed `{userId}/` and checked on sign.
- **AI cost**: Sonnet default, prompt caching, dedupe, caps, visible monthly spend.
- **Audit volume**: kanban drags create many updates; store changed columns only.

## Verification
- **Phase 0**: `pnpm drizzle-kit migrate`; sign in via both providers; `profiles` + `audit_log` rows in Supabase Studio; unauthenticated action → 401.
- **Phase 1**: company → role → application; drag through every stage; check `application_stage_events` count and `stageEnteredAt`; delete → `deletedAt` set, hidden from list, audit row present.
- **Phase 2**: upload a PDF, confirm Storage path prefix and signed download; add contact with follow-up date.
- **Phase 3**: seed script with ~30 applications; compare funnel totals against a SQL count.
- **Phase 4**: set a follow-up to yesterday → appears in Today; `curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/digest` → email arrives, second call is a no-op.
- **Phase 5**: clip a static careers page, a Greenhouse page, and LinkedIn via bookmarklet; check fields + `ai_runs` row.
- **Phase 6**: run each AI task once; second fit-score shows non-zero cache-read tokens; `costUsd` recorded.
- **Phase 7**: two offers, compare, accept one → others closed/withdrawn with events.
- **Automated**: vitest for `transitionStage` rules, `mutate`/`softDelete`/`audit` transaction behaviour (pglite), zod schemas, digest timezone selection, clipper extraction on fixture HTML with mocked Anthropic client, scoped-query grep test. Playwright smoke: login via test magic link → create application → drag to applied → history entry → soft delete. Run on Vercel preview in CI.

## Critical files (to create)
- `src/db/schema.ts`, `src/db/index.ts` (copied), `drizzle.config.ts`
- `src/lib/auth.ts` (`withUser`, Supabase SSR client), `middleware.ts`
- `src/lib/repo.ts` (`scoped`, `mutate`, `softDelete`, `audit`)
- `src/actions/applications.ts` (`transitionStage`)
- `src/lib/ai/client.ts`, `src/lib/storage.ts` (copied), `src/schemas/*.ts`
