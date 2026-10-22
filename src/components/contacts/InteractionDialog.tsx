"use client";

import { useState, useTransition } from "react";
import { Controller } from "react-hook-form";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/forms/Field";
import { SelectField } from "@/components/forms/SelectField";
import { applyActionErrors, useZodForm } from "@/components/forms/useZodForm";
import { logInteraction } from "@/actions/contacts";
import { interactionInput } from "@/schemas";

const KIND_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "linkedin", label: "LinkedIn message" },
  { value: "meeting", label: "Meeting / coffee" },
  { value: "interview", label: "Interview" },
  { value: "other", label: "Other" },
] as const;
const DIRECTION_OPTIONS = [
  { value: "out", label: "I reached out" },
  { value: "in", label: "They reached out" },
] as const;

export function InteractionDialog({
  contactId,
  contactName,
  applicationId,
  trigger,
}: {
  contactId: string;
  contactName: string;
  applicationId?: string | null;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useZodForm(interactionInput, {
    defaultValues: {
      contactId,
      applicationId: applicationId ?? null,
      kind: "email",
      direction: "out",
      occurredAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      summary: "",
      nextFollowUpAt: "",
    },
  });
  const { register, handleSubmit, formState, setError, control, reset } = form;

  const onSubmit = handleSubmit((values) =>
    start(async () => {
      setServerError(null);
      const result = await logInteraction(values);
      const err = applyActionErrors(result, setError as never);
      if (err) return setServerError(err);
      toast.success("Logged");
      setOpen(false);
      reset();
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="sm">
              <MessageSquarePlus className="h-4 w-4" /> Log interaction
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Log an interaction</DialogTitle>
            <DialogDescription>with {contactName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kind" htmlFor="kind">
              <Controller control={control} name="kind" render={({ field }) => <SelectField id="kind" value={field.value} onChange={(v) => field.onChange(v ?? "other")} options={KIND_OPTIONS} />} />
            </Field>
            <Field label="Direction" htmlFor="direction">
              <Controller control={control} name="direction" render={({ field }) => <SelectField id="direction" value={field.value} onChange={(v) => field.onChange(v ?? "out")} options={DIRECTION_OPTIONS} />} />
            </Field>
            <Field label="When" htmlFor="occurredAt" className="sm:col-span-2">
              <Input id="occurredAt" type="datetime-local" {...register("occurredAt")} />
            </Field>
            <Field label="What happened" htmlFor="summary" error={formState.errors.summary?.message} className="sm:col-span-2">
              <Textarea id="summary" rows={4} autoFocus {...register("summary")} />
            </Field>
            <Field label="Next follow-up" htmlFor="nextFollowUpAt" hint="Leave empty to keep the current date" className="sm:col-span-2">
              <Input id="nextFollowUpAt" type="date" {...register("nextFollowUpAt")} />
            </Field>
          </div>
          <FormError message={serverError} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Log</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
