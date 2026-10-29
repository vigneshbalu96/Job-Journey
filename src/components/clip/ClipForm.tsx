"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Link2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field, FormError } from "@/components/forms/Field";
import { ApplicationDialog, type ApplicationInitial } from "@/components/pipeline/ApplicationDialog";
import type { ClipExtract } from "@/lib/ai/tasks";
import type { Company } from "@/db/schema";

export function ClipForm({ companies, initialUrl, initialText, bookmarklet }: { companies: Company[]; initialUrl?: string; initialText?: string; bookmarklet: string }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [text, setText] = useState(initialText ?? "");
  const [draft, setDraft] = useState<ClipExtract | null>(null);
  const [meta, setMeta] = useState<{ cached: boolean; costUsd: number; source: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const bookmarkRef = useRef<HTMLAnchorElement>(null);

  // React refuses `javascript:` hrefs in JSX; a bookmarklet needs one, so set it imperatively.
  useEffect(() => {
    bookmarkRef.current?.setAttribute("href", bookmarklet);
  }, [bookmarklet]);

  const run = () =>
    start(async () => {
      setError(null);
      setDraft(null);
      const res = await fetch("/api/clip", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: url || undefined, text: text || undefined }) });
      const json = await res.json();
      if (!res.ok) return setError(json.error ?? "Something went wrong");
      setDraft(json.draft);
      setMeta({ cached: json.cached, costUsd: json.costUsd, source: json.source });
    });

  // Arriving from the bookmarklet: run immediately.
  useEffect(() => {
    if (initialText && initialText.length > 200) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const existing = draft ? companies.find((c) => c.name.toLowerCase() === draft.company.toLowerCase()) : undefined;
  const initial: ApplicationInitial | undefined = draft
    ? {
        companyId: existing?.id,
        companyName: draft.company,
        role: {
          title: draft.title,
          location: draft.location ?? "",
          workMode: draft.workMode,
          roleType: draft.roleType,
          salaryMin: draft.salaryMin != null ? String(draft.salaryMin) : "",
          salaryMax: draft.salaryMax != null ? String(draft.salaryMax) : "",
          currency: draft.currency ?? "INR",
          sourceUrl: url || "",
          source: draft.source,
          jdText: draft.jdText,
          postedAt: draft.postedAt ?? "",
        },
      }
    : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Clip a posting</CardTitle>
          <CardDescription>Paste the URL. If the site renders with JavaScript (LinkedIn, Workday), paste the description text too, or use the bookmarklet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Job URL" htmlFor="url">
            <Input id="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <Field label="Or paste the description" htmlFor="text" hint={text.length ? `${text.length.toLocaleString()} characters` : undefined}>
            <Textarea id="text" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Select all on the job page, copy, paste here." />
          </Field>
          <FormError message={error} />
          <Button onClick={run} disabled={pending || (!url && text.length < 200)}>
            <Wand2 className="h-4 w-4" /> {pending ? "Extracting…" : "Extract"}
          </Button>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Bookmarklet</CardTitle>
            <CardDescription>Drag this to your bookmarks bar. On any job page, click it to clip with the rendered text.</CardDescription>
          </CardHeader>
          <CardContent>
            <a ref={bookmarkRef} onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-2 rounded-lg border bg-muted px-3 py-2 text-sm font-medium cursor-grab" title="Drag me to the bookmarks bar">
              <Sparkles className="h-4 w-4" /> Clip to Job Journey
            </a>
          </CardContent>
        </Card>

        {draft && initial && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Extracted</CardTitle>
              <CardDescription>
                {Math.round(draft.confidence * 100)}% confidence · {meta?.cached ? "from cache" : "free"} · via {meta?.source}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-semibold">{draft.title}</p>
                <p className="text-muted-foreground">{draft.company}{existing && <Badge variant="secondary" className="ml-2">known company</Badge>}</p>
              </div>
              <p className="text-muted-foreground">{[draft.location, draft.workMode, draft.roleType, draft.salaryMin || draft.salaryMax ? `${draft.currency ?? ""} ${draft.salaryMin ?? "?"}–${draft.salaryMax ?? "?"}` : null].filter(Boolean).join(" · ")}</p>
              <p className="line-clamp-6 whitespace-pre-wrap text-xs">{draft.jdText}</p>
              <ApplicationDialog companies={companies} initial={initial} trigger={<Button className="w-full">Create application</Button>} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
