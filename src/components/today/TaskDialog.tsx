"use client";

import { useState, useTransition } from "react";
import { Controller } from "react-hook-form";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/forms/Field";
import { SelectField } from "@/components/forms/SelectField";
import { applyActionErrors, useZodForm } from "@/components/forms/useZodForm";
import { createTask } from "@/actions/tasks";
import { taskInput } from "@/schemas";

const KIND_OPTIONS = [
  { value: "follow_up", label: "Follow-up" },
  { value: "interview", label: "Interview" },
  { value: "deadline", label: "Deadline" },
  { value: "apply", label: "Apply step" },
  { value: "custom", label: "Other" },
] as const;

export function TaskDialog({
  applicationId,
  contactId,
  applications,
  trigger,
}: {
  applicationId?: string | null;
  contactId?: string | null;
  applications?: { id: string; label: string }[];
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const tomorrow = new Date(Date.now() + 86_400_000);
  tomorrow.setHours(9, 0, 0, 0);
  const form = useZodForm(taskInput, {
    defaultValues: {
      kind: applicationId ? "interview" : "custom",
      title: "",
      dueAt: format(tomorrow, "yyyy-MM-dd'T'HH:mm"),
      applicationId: applicationId ?? null,
      contactId: contactId ?? null,
    },
  });
  const { register, handleSubmit, formState, setError, control, reset } = form;

  const onSubmit = handleSubmit((values) =>
    start(async () => {
      setServerError(null);
      const result = await createTask(values);
      const err = applyActionErrors(result, setError as never);
      if (err) return setServerError(err);
      toast.success("Task added");
      setOpen(false);
      reset();
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button><Plus className="h-4 w-4" /> Add task</Button>} />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add a task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="title" error={formState.errors.title?.message} className="sm:col-span-2">
              <Input id="title" autoFocus placeholder="Round 2 with hiring manager" {...register("title")} />
            </Field>
            <Field label="Kind" htmlFor="kind">
              <Controller control={control} name="kind" render={({ field }) => <SelectField id="kind" value={field.value} onChange={(v) => field.onChange(v ?? "custom")} options={KIND_OPTIONS} />} />
            </Field>
            <Field label="Due" htmlFor="dueAt" error={formState.errors.dueAt?.message as string | undefined}>
              <Input id="dueAt" type="datetime-local" {...register("dueAt")} />
            </Field>
            {applications && applications.length > 0 && !applicationId && (
              <Field label="Application" htmlFor="applicationId" className="sm:col-span-2">
                <Controller
                  control={control}
                  name="applicationId"
                  render={({ field }) => <SelectField id="applicationId" value={field.value ?? null} onChange={field.onChange} options={applications.map((a) => ({ value: a.id, label: a.label }))} allowEmpty placeholder="None" />}
                />
              </Field>
            )}
          </div>
          <FormError message={serverError} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Add task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
