"use client";

import { useState, useTransition } from "react";
import { Controller } from "react-hook-form";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/forms/Field";
import { SelectField } from "@/components/forms/SelectField";
import { applyActionErrors, useZodForm } from "@/components/forms/useZodForm";
import { createQuestion, updateQuestion } from "@/actions/notes";
import { parseTags } from "@/components/notes/constants";
import { questionInput } from "@/schemas";
import type { Question } from "@/db/schema";

const DIFFICULTY = [1, 2, 3, 4, 5].map((d) => ({ value: String(d), label: `${d} ${d === 1 ? "– easy" : d === 5 ? "– hard" : ""}`.trim() }));

export function QuestionDialog({
  question,
  companies,
  applicationId,
  companyId,
  trigger,
}: {
  question?: Question;
  companies: { id: string; name: string }[];
  applicationId?: string | null;
  companyId?: string | null;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tagsText, setTagsText] = useState(question?.tags.join(", ") ?? "");
  const form = useZodForm(questionInput, {
    defaultValues: {
      prompt: question?.prompt ?? "",
      answerMd: question?.answerMd ?? "",
      tags: question?.tags ?? [],
      difficulty: question?.difficulty ?? null,
      companyId: question?.companyId ?? companyId ?? null,
      applicationId: question?.applicationId ?? applicationId ?? null,
    },
  });
  const { register, handleSubmit, formState, setError, control, reset } = form;

  const onSubmit = handleSubmit((values) =>
    start(async () => {
      setServerError(null);
      const payload = { ...values, tags: parseTags(tagsText) };
      const result = question ? await updateQuestion({ id: question.id, ...payload }) : await createQuestion(payload);
      const err = applyActionErrors(result, setError as never);
      if (err) return setServerError(err);
      toast.success(question ? "Question saved" : "Question added");
      setOpen(false);
      if (!question) {
        reset();
        setTagsText("");
      }
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button><Plus className="h-4 w-4" /> Add question</Button>} />
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{question ? "Edit question" : "Add question"}</DialogTitle>
            <DialogDescription>Write the answer you wish you had given. Tag it so it resurfaces before the next round.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Question" htmlFor="prompt" error={formState.errors.prompt?.message} className="sm:col-span-2">
              <Textarea id="prompt" rows={2} autoFocus {...register("prompt")} />
            </Field>
            <Field label="Your answer" htmlFor="answerMd" className="sm:col-span-2">
              <Textarea id="answerMd" rows={8} {...register("answerMd")} />
            </Field>
            <Field label="Tags" htmlFor="tags" hint="comma separated">
              <Input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="react, leadership" />
            </Field>
            <Field label="Difficulty" htmlFor="difficulty">
              <Controller
                control={control}
                name="difficulty"
                render={({ field }) => <SelectField id="difficulty" value={field.value == null ? null : String(field.value)} onChange={(v) => field.onChange(v == null ? null : Number(v))} options={DIFFICULTY} allowEmpty />}
              />
            </Field>
            <Field label="Company" htmlFor="companyId" className="sm:col-span-2">
              <Controller
                control={control}
                name="companyId"
                render={({ field }) => <SelectField id="companyId" value={field.value ?? null} onChange={field.onChange} options={companies.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Any company" />}
              />
            </Field>
          </div>
          <FormError message={serverError} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{question ? "Save" : "Add question"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
