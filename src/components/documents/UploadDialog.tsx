"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/forms/Field";
import { SelectField } from "@/components/forms/SelectField";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { registerDocument } from "@/actions/documents";
import { ALLOWED_DOC_TYPES, MAX_DOC_BYTES } from "@/schemas";
import type { Document } from "@/db/schema";

const KIND_OPTIONS = [
  { value: "resume", label: "Resume" },
  { value: "cover_letter", label: "Cover letter" },
] as const;

/**
 * Three steps, none through our server's memory: ask /api/uploads/sign for a
 * path+token under the user's prefix, upload straight to Storage with it,
 * then register the row (which recomputes the version number).
 */
export function UploadDialog({
  defaultKind = "resume",
  parent,
  trigger,
}: {
  defaultKind?: Document["kind"];
  /** When set, this upload becomes the next version of that document name. */
  parent?: Pick<Document, "id" | "kind" | "name">;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Document["kind"]>(parent?.kind ?? defaultKind);
  const [name, setName] = useState(parent?.name ?? "");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    setFile(f);
    if (f && !parent && !name) setName(f.name.replace(/\.[^.]+$/, ""));
  };

  const submit = () =>
    start(async () => {
      setError(null);
      if (!file) return setError("Choose a file");
      if (!ALLOWED_DOC_TYPES.includes(file.type)) return setError("PDF, DOCX, Markdown or plain text only");
      if (file.size > MAX_DOC_BYTES) return setError("Max 10 MB");

      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
      });
      if (!signRes.ok) return setError("Could not start the upload");
      const { path, token } = (await signRes.json()) as { path: string; token: string };

      const supabase = createSupabaseBrowserClient();
      const { error: upErr } = await supabase.storage.from("documents").uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (upErr) return setError(upErr.message);

      const result = await registerDocument({
        kind,
        name: name.trim(),
        storagePath: path,
        mimeType: file.type,
        sizeBytes: file.size,
        parentId: parent?.id ?? null,
        notes: notes || null,
      });
      if (!result.ok) return setError(result.error);
      toast.success(`Saved ${result.data.name} v${result.data.version}`);
      setOpen(false);
      setFile(null);
      setNotes("");
      if (!parent) setName("");
      if (fileRef.current) fileRef.current.value = "";
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button><Upload className="h-4 w-4" /> Upload</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{parent ? `New version of ${parent.name}` : "Upload a document"}</DialogTitle>
          <DialogDescription>Same name uploads become the next version, so you can see which one went where.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!parent && (
            <Field label="Kind" htmlFor="kind">
              <SelectField id="kind" value={kind} onChange={(v) => setKind(v ?? "resume")} options={KIND_OPTIONS} />
            </Field>
          )}
          <Field label="File" htmlFor="file">
            <Input id="file" ref={fileRef} type="file" accept=".pdf,.docx,.md,.txt" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </Field>
          <Field label="Name" htmlFor="name" hint={parent ? "Fixed for a new version" : "e.g. Frontend resume, Backend resume"}>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!!parent} />
          </Field>
          <Field label="What changed" htmlFor="notes">
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <FormError message={error} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending || !file || !name.trim()}>{pending ? "Uploading…" : "Upload"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
