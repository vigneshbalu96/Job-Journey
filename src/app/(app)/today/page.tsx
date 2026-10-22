import Link from "next/link";
import { CalendarCheck, Sparkles } from "lucide-react";
import { requireUser, getProfile } from "@/lib/auth";
import { getToday } from "@/lib/queries/today";
import { listPipeline } from "@/lib/queries/applications";
import { endOfLocalDay } from "@/lib/time";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/shell/StatTile";
import { ProgressRing } from "@/components/shell/ProgressRing";
import { NumberTicker } from "@/components/ui/number-ticker";
import { getProgress } from "@/lib/queries/progress";
import { Flame } from "lucide-react";
import { TaskRow } from "@/components/today/TaskRow";
import { TaskDialog } from "@/components/today/TaskDialog";
import { StageBadge } from "@/components/pipeline/StageBadge";
import { daysIn, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const { userId } = await requireUser();
  const profile = await getProfile(userId);
  const now = new Date();
  const [data, pipeline, progress] = await Promise.all([
    getToday(userId, now, endOfLocalDay(now, profile.timezone)),
    listPipeline(userId),
    getProgress(userId, now, profile.timezone, profile.weeklyTarget),
  ]);
  const open = pipeline.filter((p) => p.stage !== "closed");
  const applications = open.map((p) => ({ id: p.id, label: `${p.title} @ ${p.company}` }));
  const nothing = !data.overdue.length && !data.dueToday.length && !data.followUps.length && !data.upcoming.length && !data.stale.length;

  return (
    <>
      <PageHeader
        icon={CalendarCheck}
        title={greeting(now, profile.timezone, profile.displayName)}
        subtitle={`${open.length} open application${open.length === 1 ? "" : "s"} · ${shortDate(now)}`}
        actions={<TaskDialog applications={applications} />}
      />

      {/* Bento: weekly ring, streak, interviews, overdue, going quiet. */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="col-span-2 row-span-2 flex items-center gap-5 rounded-card border border-glass-border bg-card p-5 shadow-card">
          <ProgressRing value={progress.weekPct} size={132}>
            <span className="text-stat tabular leading-none">
              <NumberTicker value={progress.appliedThisWeek} />
              <span className="text-base text-muted-foreground">/{progress.weeklyTarget}</span>
            </span>
            <span className="mt-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">this week</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-section">{progress.weekPct >= 100 ? "Target hit. Nice." : progress.appliedThisWeek === 0 ? "Fresh week." : "Keep going."}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {progress.weekPct >= 100
                ? `${progress.appliedThisWeek} applications sent since Monday.`
                : `${progress.weeklyTarget - progress.appliedThisWeek} more application${progress.weeklyTarget - progress.appliedThisWeek === 1 ? "" : "s"} to hit this week's target of ${progress.weeklyTarget}.`}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Change the target in Settings.</p>
          </div>
        </div>
        <div className={cn("rounded-card border border-glass-border bg-card px-4 py-3.5 shadow-card", progress.streak >= 3 && "bg-gradient-to-br from-card to-tone-mid-soft")}>
          <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"><Flame className={cn("h-3.5 w-3.5", progress.streak >= 3 ? "text-stage-screening" : "")} /> Streak</p>
          <p className="mt-1 text-stat tabular"><NumberTicker value={progress.streak} /><span className="ml-1 text-base font-semibold text-muted-foreground">day{progress.streak === 1 ? "" : "s"}</span></p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">any logged activity counts</p>
        </div>
        <StatTile label="Interviews this week" value={[...data.dueToday, ...data.upcoming].filter((t) => t.kind === "interview").length} tone="good" />
        <StatTile label="Overdue" value={data.overdue.length} tone={data.overdue.length ? "bad" : undefined} />
        <StatTile label="Open" value={open.length} tone="accent" hint={`${pipeline.length - open.length} closed`} />
      </div>

      {nothing && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="font-medium">Nothing due. Go add a role or reach out to someone.</p>
            <p className="text-sm text-muted-foreground mt-1">Follow-ups are created automatically when applications move stages.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Overdue" count={data.overdue.length} tone="overdue">
          {data.overdue.map((t) => <TaskRow key={t.id} task={t} tone="overdue" />)}
        </Section>
        <Section title="Due today" count={data.dueToday.length}>
          {data.dueToday.map((t) => <TaskRow key={t.id} task={t} tone="today" />)}
        </Section>
        <Section title="Contacts to follow up" count={data.followUps.length}>
          {data.followUps.map((c) => (
            <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-glass-border bg-card px-3 py-2.5 shadow-card transition-colors hover:bg-muted/60">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{c.company ?? c.email ?? ""}</p>
              </div>
              <span className="text-xs text-muted-foreground">{shortDate(c.nextFollowUpAt)}</span>
            </Link>
          ))}
        </Section>
        <Section title="Next 7 days" count={data.upcoming.length}>
          {data.upcoming.map((t) => <TaskRow key={t.id} task={t} tone="upcoming" />)}
        </Section>
        <Section title="Going quiet" count={data.stale.length} hint="Open applications with no movement for 10+ days and no follow-up scheduled." className="lg:col-span-2">
          {data.stale.map((a) => (
            <Link key={a.id} href={`/applications/${a.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-glass-border bg-card px-3 py-2.5 shadow-card transition-colors hover:bg-muted/60">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.title} @ {a.company}</p>
                <p className="text-xs text-muted-foreground">{daysIn(a.stageEnteredAt)} days in stage</p>
              </div>
              <StageBadge stage={a.stage} />
            </Link>
          ))}
        </Section>
      </div>
    </>
  );
}

function Section({ title, count, tone, hint, className, children }: { title: string; count: number; tone?: "overdue"; hint?: string; className?: string; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <section className={cn("min-w-0", className)}>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-section">{title}</h2>
        <Badge variant={tone === "overdue" ? "destructive" : "secondary"}>{count}</Badge>
      </div>
      {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function greeting(now: Date, tz: string, name: string | null) {
  const hour = Number(new Intl.DateTimeFormat("en", { hour: "numeric", hour12: false, timeZone: tz }).format(now));
  const word = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${word}, ${name.split(" ")[0]}` : word;
}
