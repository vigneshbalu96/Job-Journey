"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, RefreshCw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/forms/SelectField";
import { ShineBorder } from "@/components/ui/shine-border";
import { createNote, createQuestion } from "@/actions/notes";
import type { AiModel as Model, ModelOption } from "@/lib/ai/models";
import type { TaskOutput } from "@/lib/ai/tasks";

type Task = "jd_parse" | "fit_score" | "resume_bullets" | "cover_letter" | "interview_questions" | "follow_up_email";

const TASKS: { task: Task; label: string; blurb: string }[] = [
  { task: "jd_parse", label: "Parse the JD", blurb: "Must-haves, nice-to-haves, red flags, ATS keywords." },
  { task: "fit_score", label: "Score my fit", blurb: "0–100 against your master profile, with gaps and questions to ask." },
  { task: "resume_bullets", label: "Tailor resume bullets", blurb: "Bullets rewritten to this JD using only your real experience." },
  { task: "cover_letter", label: "Draft cover letter", blurb: "300 words, specific, no clichés. Edit before sending." },
  { task: "interview_questions", label: "Likely questions", blurb: "What this loop will probably ask, with answer outlines." },
  { task: "follow_up_email", label: "Follow-up email", blurb: "Thank-you, nudge, or referral ask." },
];

type Result = { output: unknown; cached: boolean; model: Model; costUsd: number };

export function AiPanel({ applicationId, hasJd, hasProfile, companyName, models, defaultModel }: { applicationId: string; hasJd: boolean; hasProfile: boolean; companyName: string; models: ModelOption[]; defaultModel: Model }) {
  const [model, setModel] = useState<Model>(defaultModel);
  const [results, setResults] = useState<Partial<Record<Task, Result>>>({});
  const [active, setActive] = useState<Task | null>(null);
  const [extra, setExtra] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (task: Task, force = false) =>
    start(async () => {
      setActive(task);
      const res = await fetch(`/api/ai/${task}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ applicationId, model, force, extra: task === "follow_up_email" ? extra : undefined }) });
      const json = await res.json();
      setActive(null);
      if (!res.ok) {
        toast.error(json.error ?? "AI request failed");
        return;
      }
      setResults((r) => ({ ...r, [task]: json }));
      if (task === "fit_score") router.refresh();
    });

  const saveNote = (title: string, body: string, kind: "prep" | "general" = "general") =>
    start(async () => {
      const r = await createNote({ kind, applicationId, title, bodyMd: body, tags: ["ai"] });
      if (!r.ok) toast.error(r.error);
      else toast.success("Saved as a note");
    });

  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success("Copied"));

  if (!hasJd) return <Card><CardContent className="pt-6 text-sm text-muted-foreground">Save the job description on this role first. Everything here reads from it.</CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {hasProfile ? "Runs on Groq's free tier. Every run is logged, and repeated identical runs are served from cache." : "Add your master profile in Settings to unlock scoring and writing. Parsing works without it."}
        </p>
        {models.length > 1 && (
          <div className="w-64">
            <SelectField value={model} onChange={(v) => setModel(v ?? defaultModel)} options={models} />
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TASKS.map(({ task, label, blurb }) => {
          const disabled = pending || (!hasProfile && task !== "jd_parse");
          return (
            <Card key={task} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{label}</CardTitle>
                <CardDescription className="text-xs">{blurb}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-2">
                {task === "follow_up_email" && (
                  <Textarea rows={2} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. thank-you after round 2 with Priya; mention the caching discussion" className="text-xs" />
                )}
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => run(task)} disabled={disabled}>
                    <Sparkles className="h-4 w-4" /> {active === task ? "Running…" : results[task] ? "Run again" : "Run"}
                  </Button>
                  {results[task] && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => run(task, true)} disabled={disabled} title="Ignore cache"><RefreshCw className="h-4 w-4" /></Button>
                      <span className="text-[11px] text-muted-foreground">{results[task]!.cached ? "cached" : "free"}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {TASKS.filter((t) => results[t.task]).map(({ task, label }) => (
        <ShineBorder key={`${task}-${results[task]!.costUsd}-${results[task]!.cached}`} durationMs={2500}>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription>{results[task]!.model}{results[task]!.cached ? " · cached" : ""}</CardDescription>
            </div>
            <ResultActions task={task} output={results[task]!.output} applicationId={applicationId} companyName={companyName} onCopy={copy} onSaveNote={saveNote} />
          </CardHeader>
          <CardContent>
            <ResultView task={task} output={results[task]!.output} />
          </CardContent>
        </Card>
        </ShineBorder>
      ))}
    </div>
  );
}

function ResultActions({ task, output, applicationId, companyName, onCopy, onSaveNote }: { task: Task; output: unknown; applicationId: string; companyName: string; onCopy: (t: string) => void; onSaveNote: (title: string, body: string, kind?: "prep" | "general") => void }) {
  const [pending, start] = useTransition();
  const text = toText(task, output);
  const addQuestions = () =>
    start(async () => {
      const q = (output as TaskOutput<"interview_questions">).questions;
      let ok = 0;
      for (const item of q) {
        const r = await createQuestion({ prompt: item.prompt, answerMd: item.answerOutline, tags: ["ai", item.kind], applicationId, difficulty: null, companyId: null });
        if (r.ok) ok++;
      }
      toast.success(`Added ${ok} questions to the bank`);
    });
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="ghost" onClick={() => onCopy(text)}><Copy className="h-4 w-4" /> Copy</Button>
      {task === "interview_questions" ? (
        <Button size="sm" variant="ghost" onClick={addQuestions} disabled={pending}><Save className="h-4 w-4" /> Add to question bank</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => onSaveNote(`${labelFor(task)} · ${companyName}`, text, task === "jd_parse" || task === "fit_score" ? "prep" : "general")}><Save className="h-4 w-4" /> Save as note</Button>
      )}
    </div>
  );
}

function labelFor(task: Task) {
  return TASKS.find((t) => t.task === task)?.label ?? task;
}

function toText(task: Task, output: unknown): string {
  switch (task) {
    case "jd_parse": {
      const o = output as TaskOutput<"jd_parse">;
      return [o.summary, "", `Seniority: ${o.seniority}`, "", "Must-haves:", ...o.mustHaves.map((x) => `- ${x}`), "", "Nice-to-haves:", ...o.niceToHaves.map((x) => `- ${x}`), "", "Responsibilities:", ...o.responsibilities.map((x) => `- ${x}`), "", "Red flags:", ...o.redFlags.map((x) => `- ${x}`), "", `Keywords: ${o.keywords.join(", ")}`].join("\n");
    }
    case "fit_score": {
      const o = output as TaskOutput<"fit_score">;
      return [`Fit: ${o.score}/100 (${o.verdict})`, "", o.rationale, "", "Strengths:", ...o.strengths.map((x) => `- ${x}`), "", "Gaps:", ...o.gaps.map((x) => `- ${x}`), "", "Ask the recruiter:", ...o.questionsToAsk.map((x) => `- ${x}`)].join("\n");
    }
    case "resume_bullets": {
      const o = output as TaskOutput<"resume_bullets">;
      return [o.summaryLine, "", ...o.bullets.map((b) => `- ${b.text}  (→ ${b.targets})`), "", `Skills to surface: ${o.skillsToSurface.join(", ")}`].join("\n");
    }
    case "cover_letter":
    case "follow_up_email": {
      const o = output as TaskOutput<"cover_letter">;
      return `Subject: ${o.subject}\n\n${o.body}`;
    }
    case "interview_questions": {
      const o = output as TaskOutput<"interview_questions">;
      return o.questions.map((q, i) => `${i + 1}. [${q.kind}] ${q.prompt}\n   Why: ${q.why}\n   Outline: ${q.answerOutline}`).join("\n\n");
    }
  }
}

function ResultView({ task, output }: { task: Task; output: unknown }) {
  if (task === "fit_score") {
    const o = output as TaskOutput<"fit_score">;
    const tone = o.score >= 85 ? "bg-stage-offer-soft text-stage-offer-fg" : o.score >= 65 ? "bg-stage-applied-soft text-stage-applied-fg" : o.score >= 45 ? "bg-tone-mid-soft text-tone-mid-fg" : "bg-tone-high-soft text-tone-high-fg";
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <span className={`rounded-lg px-3 py-1 text-2xl font-semibold tabular-nums ${tone}`}>{o.score}</span>
          <Badge variant="secondary" className="capitalize">{o.verdict}</Badge>
        </div>
        <p className="leading-relaxed">{o.rationale}</p>
        <Lists items={[["Strengths", o.strengths], ["Gaps", o.gaps], ["Ask the recruiter", o.questionsToAsk]]} />
      </div>
    );
  }
  if (task === "jd_parse") {
    const o = output as TaskOutput<"jd_parse">;
    return (
      <div className="space-y-3 text-sm">
        <p className="leading-relaxed">{o.summary}</p>
        <p className="text-muted-foreground">Seniority: {o.seniority}</p>
        <Lists items={[["Must-haves", o.mustHaves], ["Nice-to-haves", o.niceToHaves], ["Responsibilities", o.responsibilities], ["Red flags", o.redFlags]]} />
        <div className="flex flex-wrap gap-1">{o.keywords.map((k) => <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>)}</div>
      </div>
    );
  }
  if (task === "resume_bullets") {
    const o = output as TaskOutput<"resume_bullets">;
    return (
      <div className="space-y-3 text-sm">
        <p className="font-medium">{o.summaryLine}</p>
        <ul className="space-y-2">{o.bullets.map((b, i) => <li key={i} className="rounded-md border px-3 py-2"><p>{b.text}</p><p className="text-xs text-muted-foreground mt-1">→ {b.targets}</p></li>)}</ul>
        <div className="flex flex-wrap gap-1">{o.skillsToSurface.map((k) => <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>)}</div>
      </div>
    );
  }
  if (task === "interview_questions") {
    const o = output as TaskOutput<"interview_questions">;
    return (
      <ol className="space-y-3 text-sm list-decimal pl-5">
        {o.questions.map((q, i) => (
          <li key={i}>
            <p className="font-medium">{q.prompt} <Badge variant="outline" className="ml-1 text-[10px]">{q.kind.replace("_", " ")}</Badge></p>
            <p className="text-xs text-muted-foreground">{q.why}</p>
            <p className="mt-1 whitespace-pre-wrap text-xs">{q.answerOutline}</p>
          </li>
        ))}
      </ol>
    );
  }
  const o = output as TaskOutput<"cover_letter">;
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">Subject: {o.subject}</p>
      <p className="whitespace-pre-wrap leading-relaxed">{o.body}</p>
    </div>
  );
}

function Lists({ items }: { items: [string, string[]][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.filter(([, arr]) => arr.length).map(([title, arr]) => (
        <div key={title}>
          <p className="text-xs font-semibold text-muted-foreground mb-1">{title}</p>
          <ul className="list-disc pl-4 space-y-0.5">{arr.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}
