import Link from "next/link";
import { AuroraBackground } from "@/components/shell/AuroraBackground";

export const metadata = { title: "Privacy · Job Journey" };

const CONTACT = "vigneshbalu96@gmail.com";
const UPDATED = "23 October 2026";

// Public page (see PUBLIC_PATHS in src/lib/supabase/middleware.ts). Google's
// consent screen links here, so it must load without a session.
export default function PrivacyPage() {
  return (
    <main className="relative min-h-dvh px-4 py-10">
      <AuroraBackground />
      <article className="mx-auto max-w-2xl space-y-6 text-[15px] leading-relaxed">
        <header className="space-y-1">
          <h1 className="text-display">Privacy policy</h1>
          <p className="text-muted-foreground">Last updated {UPDATED}</p>
        </header>

        <p>
          Job Journey is a personal job-search tracker run by an individual, not a company. This page explains what it
          stores and why.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">What is collected</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Account:</strong> your email address, and your name if you sign in with Google. Google sign-in
              requests only your basic profile and email; no access to Gmail, Drive or contacts.
            </li>
            <li>
              <strong>What you enter:</strong> companies, roles, applications, contacts, notes, tasks, offers and the
              documents you upload.
            </li>
            <li>
              <strong>Change history:</strong> a log of edits to your own records, so mistakes can be undone.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">How it is used</h2>
          <p>
            Only to run the app for you: show your data, send the sign-in links and the optional daily digest you turn
            on in Settings. Nothing is sold, shared for advertising, or used to track you across other sites. There are
            no analytics or ad cookies; the only cookie keeps you signed in.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Where it is stored</h2>
          <p>
            Data lives in a Supabase database and private file storage, and the app is hosted on Vercel. Emails are
            sent through Gmail and Resend. If the optional AI assistant is switched on, the text you choose to analyse
            is sent to Groq to generate the result. Each account can only see its own data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Deleting your data</h2>
          <p>
            Deleting an item in the app hides it from you straight away. To have your account and everything in it
            erased permanently, email <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> from the
            address you signed up with.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p>
            Questions about this policy: <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
        </section>

        <p>
          <Link className="underline" href="/login">
            Back to sign in
          </Link>
        </p>
      </article>
    </main>
  );
}
