"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { STAGE_LABEL } from "@/lib/stages";
import type { Metrics } from "@/lib/queries/journey";

// Palette: validated categorical slots 1–3 (blue, orange, aqua) and an ordinal
// blue ramp for the funnel. Text stays in text tokens; colour only on marks.
const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
const FUNNEL_RAMP = ["var(--chart-ramp-1)", "var(--chart-ramp-2)", "var(--chart-ramp-3)", "var(--chart-ramp-4)", "var(--chart-ramp-5)"];
const GRID = "var(--border)";
const INK = "var(--muted-foreground)";

const tooltipStyle = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--glass-border)", borderRadius: 12, fontSize: 12, color: "var(--popover-foreground)", boxShadow: "var(--shadow-float)", backdropFilter: "blur(12px)" },
  labelStyle: { color: "var(--popover-foreground)", fontWeight: 600 },
  cursor: { fill: "var(--muted)", opacity: 0.5 },
};

export function FunnelChart({ overall }: { overall: Metrics["overall"] }) {
  const data = [
    { stage: "Saved", n: overall.total },
    { stage: "Applied", n: overall.applied },
    { stage: "Screening", n: overall.screening },
    { stage: "Interview", n: overall.interview },
    { stage: "Offer", n: overall.offer },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="2 4" />
        <XAxis type="number" allowDecimals={false} tick={{ fill: INK, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="stage" width={72} tick={{ fill: INK, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v) => [v as number, "applications"]} />
        <Bar dataKey="n" radius={[0, 4, 4, 0]} barSize={14} label={{ position: "right", fill: INK, fontSize: 11 }} shape={(p: unknown) => <FunnelBar {...(p as FunnelBarProps)} />} />
      </BarChart>
    </ResponsiveContainer>
  );
}
type FunnelBarProps = { x: number; y: number; width: number; height: number; index: number };
function FunnelBar({ x, y, width, height, index }: FunnelBarProps) {
  return <rect x={x} y={y} width={Math.max(width, 0)} height={height} rx={4} fill={FUNNEL_RAMP[index] ?? FUNNEL_RAMP.at(-1)} />;
}

export function WeeklyChart({ weekly }: { weekly: Metrics["weekly"] }) {
  const data = weekly.map((w) => ({ ...w, label: new Date(w.week).toLocaleDateString("en", { day: "numeric", month: "short" }) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 4" />
        <XAxis dataKey="label" tick={{ fill: INK, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: INK, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: INK }} />
        <Line type="monotone" dataKey="applied" name="Applications sent" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="moves" name="Stage moves" stroke={SERIES[1]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="interactions" name="Conversations" stroke={SERIES[2]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TimeInStageChart({ timeInStage }: { timeInStage: Metrics["timeInStage"] }) {
  const order = ["saved", "applied", "screening", "interview", "offer"] as const;
  const data = order
    .map((s) => timeInStage.find((t) => t.stage === s))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => ({ stage: STAGE_LABEL[t.stage], days: t.median_days, n: t.n }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: -16, right: 8, top: 16, bottom: 0 }} barCategoryGap={12}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 4" />
        <XAxis dataKey="stage" tick={{ fill: INK, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: INK, fontSize: 11 }} axisLine={false} tickLine={false} unit="d" />
        <Tooltip {...tooltipStyle} formatter={(v, _n, item) => [`${v} days median (${(item.payload as { n: number }).n} moves)`, "time in stage"]} />
        <Bar dataKey="days" fill={SERIES[0]} radius={[4, 4, 0, 0]} barSize={28} label={{ position: "top", fill: INK, fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
