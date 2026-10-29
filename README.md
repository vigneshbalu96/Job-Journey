# Job Journey

A multi-user command centre for a job search: pipeline kanban with full stage history, companies and contacts, prep notes and a question bank, a journey timeline with funnel metrics, resume versions, follow-up reminders with a daily digest, offer comparison, a job clipper, and AI assistance for the repetitive parts.

Stack: Next.js 15 (App Router), TypeScript, Drizzle ORM on Supabase Postgres, Supabase Auth, Tailwind v4 + shadcn/ui, Vercel + GitHub Actions cron, Resend, Groq (free tier) or Anthropic API for AI.

Two rules hold everywhere: **deletes are soft** (`deleted_at`) and **every mutation writes an `audit_log` row**. Server actions go through `withUser()` and the helpers in `src/lib/repo.ts`; a unit test fails the build if a file selects from the database without `scoped()` or issues a hard `DELETE`.

## 1. One-time setup

### Supabase
1. Create a project at supabase.com (region: ap-south-1 if you are in India).
2. **Authentication → Providers**: enable **Email** (magic link) and **Google**.
   - For Google, create OAuth credentials in Google Cloud Console; the authorised redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Authentication → URL configuration**: set Site URL to `http://localhost:3000` for now, and add `http://localhost:3000/auth/callback` and your Vercel URL + `/auth/callback` to Redirect URLs.
4. **Settings → API**: copy the project URL, anon key and service-role key.
5. **Settings → Database**: copy both connection strings (transaction pooler on 6543, session pooler on 5432).

### Local env
```bash
cp .env.example .env.local
# fill in the Supabase values; leave Resend / Anthropic empty until phases 4 and 5
```

### Database
```bash
pnpm db:migrate     # applies ./drizzle/*.sql using DIRECT_DATABASE_URL
```

### Run
```bash
pnpm dev            # http://localhost:3000 → redirected to /login
```

## 2. Scripts
| Script | What it does |
|---|---|
| `pnpm dev` | Dev server with Turbopack |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest: pure helpers plus repo tests against an in-process Postgres (pglite) migrated with the real SQL |
| `pnpm db:generate` | Generate a migration from `src/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm build` | Production build |

## 3. Layout
```
src/app/(auth)/login          magic link + Google (popup → /auth/google)
src/app/auth/callback         code exchange (magic link, fallback OAuth)
src/app/auth/google           Google popup code → ID token → Supabase session
src/app/(app)/*               authenticated pages (today, pipeline, companies, …)
src/actions/*                 server actions: zod-parsed, user-scoped, audited
src/lib/auth.ts               requireUser / withUser (Supabase SSR)
src/lib/repo.ts               scoped / createRow / updateRow / softDeleteRow / audit
src/lib/stages.ts             stage transition rules and follow-up scheduling
src/lib/queries/*             read queries (always via scoped())
src/schemas/*                 zod schemas shared by forms, actions and AI output
src/db/schema.ts              Drizzle schema; drizzle/ holds generated SQL
```

## 4. Local development with a full Supabase stack

Docker is enough to run Auth, Postgres, Storage and a local mailbox:

```bash
pnpm supabase start -x realtime,imgproxy,studio,edge-runtime,logflare,vector,postgres-meta,supavisor
# copy the printed ANON_KEY / SERVICE_ROLE_KEY / DB_URL into .env.local (see .env.example)
pnpm db:migrate
pnpm dev
```

Magic-link emails land at http://127.0.0.1:54324 (Mailpit); nothing reaches a real inbox. The Google button is hidden unless `NEXT_PUBLIC_AUTH_GOOGLE=1`; to use it locally, follow the commented block at the end of `supabase/config.toml`.

Demo data for the journey page: sign in once, then `pnpm seed you@example.com`. A ready-made local demo account `vignesh.demo@example.com` is already seeded (request a magic link for it on the login page and read it in Mailpit).

End-to-end tests (Playwright) run against this stack: `pnpm e2e`. They sign in through the admin API, so no mailbox is involved.

### Look and feel
Two designed themes share one token set in `src/app/globals.css`: **iOS glass** (light: frosted white surfaces over a cool wash, iOS blue accent) and **aurora** (dark: near-black with a slow violet/pink/teal mesh, glowing stage chips). Everything is driven by CSS variables (`--stage-*`, `--chart-*`, `--glass*`, `--radius-card`, `--shadow-*`), exposed as Tailwind utilities (`bg-stage-offer-soft`, `rounded-card`, `shadow-float`, `glass`, `text-display`). Motion uses `motion` with spring presets in `src/lib/motion.ts`; the OS reduced-motion setting disables route transitions, the aurora, number tickers and confetti. Shared pieces live in `src/components/shell/` (PageHeader, StatTile, SegmentedControl, BottomTabBar, AuroraBackground, GlassCard) and `src/components/ui/` (number-ticker, shimmer-button). 21st.dev components can be swapped in with `pnpm dlx shadcn@latest add "https://21st.dev/r/<author>/<slug>?api_key=$API_KEY_21ST"` if you create a key there (free tier: 2 installs/day).

### 21st.dev components
Set `API_KEY_21ST` in `.env.local` (key from https://21st.dev/mcp; free tier allows 2 installs per day), then from the repo:
```bash
pnpm dlx shadcn@latest add "https://21st.dev/r/<author>/<slug>?api_key=$API_KEY_21ST"
```
Every installed file is adapted before use: colours → our tokens, `framer-motion` → `motion/react`, motion gated by `useReducedMotion`. All five slots currently run on in-house components with the same props, so any can be swapped for the registry version later: `ProgressRing` ↔ `diceui/circular-progress`, `OrbitalTimeline` ↔ `jatin-yadav05/radial-orbital-timeline`, `ui/spotlight-card` ↔ `jahed/spotlight-card`, `ui/shine-border` ↔ `dillionverma/shine-border`, `offers/Podium` ↔ `trophyso/leaderboard-podium`.

### Progress and streaks
Settings has a weekly applications target. Today shows a ring (applications moved to Applied since Monday, in your timezone) and a day streak (any stage move, conversation or completed task; yesterday keeps it alive). The digest repeats the line. Logic in `src/lib/streak.ts` and `src/lib/queries/progress.ts`.

### Day-to-day
- Board and table views have a filter box; closed applications are collapsed behind a toggle (and remain a drop target).
- Every role can be edited from its application page, including pasting the JD later.
- Theme toggle (light / dark / system) sits in the sidebar footer.
- Tasks per application: each application page has a Tasks tab. Moving to Applied creates a three-item apply-day checklist (kind `apply`); moving to Interview with a date creates the interview task; every stage move schedules the next follow-up and retires the previous one; closing retires everything.
- A screenshot sweep for visual review: `SHOTS_DIR=/tmp/shots SHOTS_EMAIL=you@example.com pnpm exec playwright test screenshots`.

## 5. Production notes
- **Email templates**: the default Supabase templates use `{{ .ConfirmationURL }}`, which goes through `/auth/callback` (PKCE, same browser). For links that must work on another device, point the template at `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink`. On the free plan, editing templates requires a custom SMTP server (see §6).
- **Storage**: run `pnpm storage:setup` once per project to create the private `documents` bucket.
- **Cron**: Vercel Hobby only allows daily crons, so `.github/workflows/digest.yml` calls `/api/cron/digest` hourly. Set `CRON_SECRET` in Vercel and the same value plus `APP_URL` as GitHub repo secrets. The route picks users whose local hour has reached their digest hour and never sends twice for one day, so a late run still delivers. The hourly hit also keeps a free Supabase project from pausing.
- **AI**: set `GROQ_API_KEY` (free tier, default model `openai/gpt-oss-120b`, `openai/gpt-oss-20b` also selectable) and/or `ANTHROPIC_API_KEY` (`claude-sonnet-5-5`, Opus selectable). Only models whose key is set appear in the picker; `AI_DEFAULT_MODEL` overrides the default. Groq's free tier allows roughly 30 runs a minute, 1,000 a day and 8K tokens a minute, so clipped pages are cut to 10K characters on Groq. Every call is logged in `ai_runs` with cost; identical inputs are served from that log. `AI_DAILY_RUN_CAP` (default 60) bounds spend.
- **Clipper**: the bookmarklet is on the Clip page. It sends the rendered page text, which is the only reliable path for LinkedIn/Workday.

## 6. Free deploy (personal use)
Vercel Hobby + Supabase Free + Gmail SMTP + Resend Free, all at no cost. AI runs free on Groq once `GROQ_API_KEY` is set; Anthropic is the optional paid upgrade.

1. **Supabase**: create a project and keep Vercel's function region next to it (this one is in Sydney, ap-southeast-2, so `vercel.json` uses `syd1`). Pick a database password without `@ : / #` so it drops into connection strings unescaped.
   - Auth → URL configuration: Site URL `https://<app>.vercel.app`; redirect URLs `…/auth/callback` and `…/auth/confirm`.
2. **Sign-in email via Gmail SMTP**: the built-in mailer only reaches project team members, is rate-limited, and on the free plan blocks template edits. With a custom SMTP server all three go away.
   - Google Account → 2-Step Verification on → App passwords → create one (16 characters).
   - Auth → SMTP settings: host `smtp.gmail.com`, port `587`, user and sender = your Gmail, password = the app password, sender name `Job Journey`. Raise the email rate limit to 30/hour.
   - Auth → Email templates → Magic Link: link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink` (works on any device, unlike the default `{{ .ConfirmationURL }}`, which needs the same browser). Confirm signup: same with `type=email`.
3. **Google sign-in** (optional):
   - Google Cloud → Google Auth Platform → Branding: app name, support email, home page `https://<app>.vercel.app`, privacy policy `https://<app>.vercel.app/privacy` (a public page in this app), authorized domains `<ref>.supabase.co` and `<app>.vercel.app`.
   - Audience: External. Either stay in Testing and list each allowed Google account as a test user, or Publish (needs the home page and privacy links; basic scopes need no review).
   - Clients → Web application: JavaScript origin `https://<app>.vercel.app` (all the popup flow needs); redirect URI `https://<ref>.supabase.co/auth/v1/callback` (only for the fallback redirect flow).
   - Supabase Auth → Providers → Google: paste the client ID and secret (Supabase checks the ID token's audience against this client ID).
   - Vercel: `NEXT_PUBLIC_AUTH_GOOGLE=1`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client id>`, `GOOGLE_CLIENT_SECRET=<client secret>` (sensitive), then redeploy (`NEXT_PUBLIC_*` values are read at build time).
   - How it works: the login page's own button opens Google's popup (GIS code client, `src/components/auth/GoogleSignInButton.tsx`); the one-time code is posted to `/auth/google`, which checks the request `Origin`, exchanges the code for Google's ID token with the client secret, and calls `signInWithIdToken`. Google never redirects through `<ref>.supabase.co`, so its account chooser says "to continue to <app>.vercel.app". Without `NEXT_PUBLIC_GOOGLE_CLIENT_ID` the page falls back to the standard Supabase redirect, which names the Supabase domain.
   - To show the name "Job Journey" rather than the address, complete brand verification in Google Cloud → Verification Center (verify site ownership in Search Console and drop the `supabase.co` authorized domain first).
4. **Schema and bucket** from your machine (command-line values win over `.env.local`, so the local stack is untouched):
   ```bash
   DIRECT_DATABASE_URL='<session pooler, 5432>' pnpm db:migrate
   NEXT_PUBLIC_SUPABASE_URL='https://<ref>.supabase.co' SUPABASE_SERVICE_ROLE_KEY='<service role>' pnpm storage:setup
   ```
   Newly reset database passwords can take a minute to reach the pooler; retry if authentication fails straight after a reset.
5. **Resend** (daily digest): create a sending-only API key. Without a verified domain it sends only from `onboarding@resend.dev` to your Resend signup email, so the digest reaches that one account.
6. **Vercel**: import the repo (install the Vercel GitHub app and connect it under Project → Settings → Git so pushes to `main` deploy). Environment variables:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (transaction pooler, 6543), `NEXT_PUBLIC_APP_URL`, `CRON_SECRET` (`openssl rand -hex 32`), `RESEND_API_KEY`, `DIGEST_FROM_EMAIL="Job Journey <onboarding@resend.dev>"`, and, if Google is on, `NEXT_PUBLIC_AUTH_GOOGLE=1`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. `.vercelignore` keeps local `.env*` files out of CLI uploads.
7. **GitHub Actions**: Settings → Secrets and variables → Actions → **Repository secrets** (not environment secrets, which this workflow cannot read): `APP_URL` = `https://<app>.vercel.app`, `CRON_SECRET` = the Vercel value. Run the `digest` workflow once from the Actions tab; a failed run names the missing or wrong secret.
8. **Sign-ups**: this deployment leaves them open so several of your own addresses can join. To close them, turn off Supabase Auth → "Allow new users to sign up" (existing accounts keep working).

### Install on a phone
The app ships a web manifest (`src/app/manifest.ts`) and icons (`public/icons`, drawn from `public/icons/icon.svg`), so it installs like an app at no cost, with no Play Store needed. Android Chrome: ⋮ → Install app. iPhone Safari: Share → Add to Home Screen. It opens full screen on Today; it still needs a connection (no offline mode) and reminders arrive by email, not push.

## 7. Phases
See `docs/PLAN.md` for the full plan. All eight phases are implemented:
- [x] Phase 0: scaffold, Supabase Auth, scoping + audit helpers, migrations
- [x] Phase 1: companies, roles, applications, kanban, stage history, follow-up tasks
- [x] Phase 2: contacts, interactions, notes, questions, documents with signed uploads
- [x] Phase 3: journey timeline + funnel / weekly / time-in-stage metrics
- [x] Phase 4: Today view, settings, hourly digest (Resend + GitHub Actions cron)
- [x] Phase 5: job clipper (JSON-LD → Readability → paste) + bookmarklet
- [x] Phase 6: AI assist (JD parse, fit score, resume bullets, cover letter, likely questions, follow-up email)
- [x] Phase 7: offers with side-by-side comparison and accept/decline flow

Running against real services: Supabase Auth with Gmail SMTP (magic link), Google OAuth, Vercel, GitHub Actions cron and Resend. AI assist is verified live on Groq's free tier (`pnpm ai:smoke` runs every task); the Anthropic path is still unverified because no Anthropic key is configured.
