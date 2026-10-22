import { Map } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMetrics, listTimeline } from "@/lib/queries/journey";
import { listMilestones } from "@/lib/queries/milestones";
import { OrbitalTimeline } from "@/components/journey/OrbitalTimeline";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FunnelChart, TimeInStageChart, WeeklyChart } from "@/components/journey/charts";
import { Timeline } from "@/components/journey/Timeline";
import { daysIn } from "@/lib/format";
import { StatTile } from "@/components/shell/StatTile";

export const metadata = { title: "Journey" };

export default async function JourneyPage() {
  const { userId } = await requireUser();
  const [metrics, timeline, milestones] = await Promise.all([getMetrics(userId), listTimeline(userId), listMilestones(userId)]);
  const o = metrics.overall;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : "—");
  const pctSuffix = (a: number, b: number) => (b ? "%" : undefined);
  const days = metrics.startedAt ? daysIn(metrics.startedAt) : 0;

  return (
    <>
      <PageHeader icon={Map} title="Journey" subtitle={metrics.startedAt ? `Day ${days + 1} of the search.` : "Your whole search on one page."} />

      <Card className="mb-6 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">The story so far</CardTitle>
          <CardDescription>Key beats of the search. Hover a node, click to open the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrbitalTimeline milestones={milestones} day={days + 1} />
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6 mb-6">
        <StatTile label="Tracked" value={o.total} />
        <StatTile label="Open" value={o.open} tone="accent" />
        <StatTile label="Applied → response" value={pct(metrics.response.responded, metrics.response.applied)} suffix={pctSuffix(metrics.response.responded, metrics.response.applied)} hint={`${metrics.response.responded} of ${metrics.response.applied}`} />
        <StatTile label="Applied → interview" value={pct(o.interview, o.applied)} suffix={pctSuffix(o.interview, o.applied)} hint={`${o.interview} of ${o.applied}`} tone="good" />
        <StatTile label="Interview → offer" value={pct(o.offer, o.interview)} suffix={pctSuffix(o.offer, o.interview)} hint={`${o.offer} of ${o.interview}`} tone="good" />
        <StatTile label="Closed" value={o.rejected + o.ghosted + o.withdrawn} hint={`${o.rejected} rejected · ${o.ghosted} ghosted · ${o.withdrawn} withdrawn`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funnel</CardTitle>
            <CardDescription>How many applications ever reached each stage.</CardDescription>
          </CardHeader>
          <CardContent>{o.total ? <FunnelChart overall={o} /> : <Empty />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Median days in stage</CardTitle>
            <CardDescription>Where time goes. Long screening medians mean slow companies, long saved medians mean hesitation.</CardDescription>
          </CardHeader>
          <CardContent>{metrics.timeInStage.length ? <TimeInStageChart timeInStage={metrics.timeInStage} /> : <Empty />}</CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Weekly activity</CardTitle>
            <CardDescription>Last 12 weeks. Applications sent, stage moves, and conversations logged.</CardDescription>
          </CardHeader>
          <CardContent><WeeklyChart weekly={metrics.weekly} /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">By source</CardTitle>
            <CardDescription>Which channels actually convert. Referrals usually win; this shows by how much.</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.bySource.length === 0 ? <Empty /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Tracked</TableHead>
                    <TableHead className="text-right">Applied</TableHead>
                    <TableHead className="text-right">Interview</TableHead>
                    <TableHead className="text-right">Offer</TableHead>
                    <TableHead className="text-right">Applied → interview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.bySource.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="capitalize">{r.source.replace("_", " ")}</TableCell>
                      <TableCell className="capitalize">{r.roleType ?? "—"}</TableCell>
                      <TableCell className="text-right">{r.total}</TableCell>
                      <TableCell className="text-right">{r.applied}</TableCell>
                      <TableCell className="text-right">{r.interview}</TableCell>
                      <TableCell className="text-right">{r.offer}</TableCell>
                      <TableCell className="text-right">{r.applied ? `${Math.round((r.interview / r.applied) * 100)}%` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
          <CardDescription>Every stage move, conversation, completed task and offer, newest first.</CardDescription>
        </CardHeader>
        <CardContent><Timeline items={timeline} /></CardContent>
      </Card>
    </>
  );
}

function Empty() {
  return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>;
}
