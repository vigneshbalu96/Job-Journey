"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Field } from "@/components/forms/Field";
import { SelectField } from "@/components/forms/SelectField";
import { attachDocument } from "@/actions/documents";

type Option = { id: string; kind: "resume" | "cover_letter"; name: string; version: number };

export function AttachDocuments({
  applicationId,
  options,
  resumeDocumentId,
  coverLetterDocumentId,
}: {
  applicationId: string;
  options: Option[];
  resumeDocumentId: string | null;
  coverLetterDocumentId: string | null;
}) {
  const [pending, start] = useTransition();
  const set = (slot: "resume" | "cover_letter", documentId: string | null) =>
    start(async () => {
      const r = await attachDocument({ applicationId, documentId, slot });
      if (!r.ok) toast.error(r.error);
      else toast.success(documentId ? "Attached" : "Detached");
    });
  const opts = (kind: Option["kind"]) =>
    options.filter((o) => o.kind === kind).map((o) => ({ value: o.id, label: `${o.name} v${o.version}` }));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Resume sent" htmlFor="resume">
        <SelectField id="resume" value={resumeDocumentId} onChange={(v) => set("resume", v)} options={opts("resume")} allowEmpty placeholder="None attached" />
      </Field>
      <Field label="Cover letter sent" htmlFor="cover">
        <SelectField id="cover" value={coverLetterDocumentId} onChange={(v) => set("cover_letter", v)} options={opts("cover_letter")} allowEmpty placeholder="None attached" />
      </Field>
      <p className="sm:col-span-2 text-xs text-muted-foreground">
        {pending ? "Saving…" : <>Upload new versions on the <Link href="/documents" className="underline">Documents</Link> page.</>}
      </p>
    </div>
  );
}
