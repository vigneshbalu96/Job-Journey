import "server-only";
import { and, eq } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db";
import { digestSends, profiles } from "@/db/schema";
import { getToday } from "@/lib/queries/today";
import { getProgress } from "@/lib/queries/progress";
import { endOfLocalDay, localDateString, localHour } from "@/lib/time";
import { renderDigest } from "./render";

export type DigestRunResult = { considered: number; sent: number; skipped: number; errors: string[] };

/**
 * Runs hourly. For each user whose local hour matches their digestHour and who
 * has not been sent today's digest, build Today, render, send, and record.
 * The unique (user_id, sent_for_date) index makes retries safe.
 */
export async function runDigest(now = new Date(), opts: { dryRun?: boolean } = {}): Promise<DigestRunResult> {
  const result: DigestRunResult = { considered: 0, sent: 0, skipped: 0, errors: [] };
  const users = await db.select().from(profiles).where(eq(profiles.digestEnabled, true)); // unscoped-ok: system cron over all users
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  for (const u of users) {
    if (localHour(now, u.timezone) !== u.digestHour) continue;
    result.considered++;
    const dateStr = localDateString(now, u.timezone);
    const already = await db
      .select({ id: digestSends.id })
      .from(digestSends)
      .where(and(eq(digestSends.userId, u.id), eq(digestSends.sentForDate, dateStr)))
      .limit(1);
    if (already.length) {
      result.skipped++;
      continue;
    }

    try {
      const data = await getToday(u.id, now, endOfLocalDay(now, u.timezone));
      const progress = await getProgress(u.id, now, u.timezone, u.weeklyTarget);
      const email = renderDigest(data, {
        progress,
        appUrl,
        tz: u.timezone,
        name: u.displayName,
        dateLabel: new Intl.DateTimeFormat("en-IN", { timeZone: u.timezone, weekday: "long", day: "numeric", month: "long" }).format(now),
      });
      if (!email) {
        await db.insert(digestSends).values({ userId: u.id, sentForDate: dateStr, status: "nothing_to_send" });
        result.skipped++;
        continue;
      }
      let messageId: string | null = null;
      if (!opts.dryRun) {
        if (!resend) throw new Error("RESEND_API_KEY not set");
        const { data: sent, error } = await resend.emails.send({
          from: process.env.DIGEST_FROM_EMAIL ?? "Job Journey <digest@localhost>",
          to: u.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
        if (error) throw new Error(error.message);
        messageId = sent?.id ?? null;
      }
      await db.insert(digestSends).values({ userId: u.id, sentForDate: dateStr, resendMessageId: messageId, status: opts.dryRun ? "dry_run" : "sent" });
      result.sent++;
    } catch (e) {
      result.errors.push(`${u.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return result;
}
