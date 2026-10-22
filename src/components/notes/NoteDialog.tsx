"use client";

import { useState, useTransition } from "react";
import { Controller } from "react-hook-form";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/forms/Field";
import { SelectField } from "@/components/forms/SelectField";
import { applyActionErrors, useZodForm } from "@/components/forms/useZodForm";
import { createNote, updateNote } from "@/actions/notes";
import { noteInput } from "@/schemas";
import type { Note } from "@/db/schema";
import { NOTE_KIND_OPTIONS, parseTags } from "./constants";

export function NoteDialog({
  note,
  applicationId,
  companyId,
  defaultKind = "general",
  trigger,
}: {
  note?: Note;
  applicationId?: string | null;
  companyId?: string | null;
  defaultKind?: Note["kind"];
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tagsText, setTagsText] = useState(note?.tags.join(", ") ?? "");
  const form = useZodForm(noteInput, {
    defaultValues: {
      kind: note?.kind ?? defaultKind,
      applicationId: note?.applicationId ?? applicationId ?? null,
      companyId: note?.companyId ?? companyId ?? null,
      title: note?.title ?? "",
      bodyMd: note?.bodyMd ?? "",
      tags: note?.tags ?? [],
    },
  });
  const { register, handleSubmit, formState, setError, control, reset } = form;

  const onSubmit = handleSubmit((values) =>
    start(async () => {
      setServerError(null);
      const payload = { ...values, tags: parseTags(tagsText) };
      const result = note ? await updateNote({ id: note.id, ...payload }) : await createNote(payload);
      const err = applyActionErrors(result, setError as never);
      if (err) return setServerError(err);
      toast.success(note ? "Note saved" : "Note added");
      setOpen(false);
      if (!note) {
        reset();
        setTagsText("");
      }
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button size="sm"><Plus className="h-4 w-4" /> Add note</Button>} />
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{note ? "Edit note" : "New note"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kind" htmlFor="kind">
              <Controller control={control} name="kind" render={({ field }) => <SelectField id="kind" value={field.value} onChange={(v) => field.onChange(v ?? "general")} options={NOTE_KIND_OPTIONS} />} />
            </Field>
            <Field label="Tags" htmlFor="tags" hint="comma separated">
              <Input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="system-design, behavioural" />
            </Field>
            <Field label="Title" htmlFor="title" error={formState.errors.title?.message} className="sm:col-span-2">
              <Input id="title" autoFocus {...register("title")} />
            </Field>
            <Field label="Body" htmlFor="bodyMd" hint="Markdown is fine; rendered as plain text for now." className="sm:col-span-2">
              <Textarea id="bodyMd" rows={10} {...register("bodyMd")} />
            </Field>
          </div>
          <FormError message={serverError} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{note ? "Save" : "Add note"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
