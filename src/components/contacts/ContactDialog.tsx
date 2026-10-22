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
import { createContact, updateContact } from "@/actions/contacts";
import { contactInput } from "@/schemas";
import { toInputDate } from "@/lib/format";
import type { Contact } from "@/db/schema";

type CompanyOption = { id: string; name: string };

export function ContactDialog({
  companies,
  contact,
  defaultCompanyId,
  trigger,
}: {
  companies: CompanyOption[];
  contact?: Contact;
  defaultCompanyId?: string | null;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useZodForm(contactInput, {
    defaultValues: {
      companyId: contact?.companyId ?? defaultCompanyId ?? null,
      fullName: contact?.fullName ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      linkedinUrl: contact?.linkedinUrl ?? "",
      title: contact?.title ?? "",
      relationship: contact?.relationship ?? "",
      nextFollowUpAt: toInputDate(contact?.nextFollowUpAt),
      notes: contact?.notes ?? "",
    },
  });
  const { register, handleSubmit, formState, setError, control, reset } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit((values) =>
    start(async () => {
      setServerError(null);
      const result = contact ? await updateContact({ id: contact.id, ...values }) : await createContact(values);
      const err = applyActionErrors(result, setError as never);
      if (err) return setServerError(err);
      toast.success(contact ? "Contact updated" : "Contact added");
      setOpen(false);
      if (!contact) reset();
    }),
  );

  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus className="h-4 w-4" /> Add contact
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{contact ? "Edit contact" : "Add contact"}</DialogTitle>
            <DialogDescription>Recruiters, referrers, interviewers, alumni. Keep how to reach them in one place.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="fullName" error={e.fullName?.message} className="sm:col-span-2">
              <Input id="fullName" autoFocus {...register("fullName")} />
            </Field>
            <Field label="Company" htmlFor="companyId">
              <Controller
                control={control}
                name="companyId"
                render={({ field }) => (
                  <SelectField id="companyId" value={field.value ?? null} onChange={field.onChange} options={companyOptions} allowEmpty placeholder="No company" />
                )}
              />
            </Field>
            <Field label="Title" htmlFor="title">
              <Input id="title" placeholder="Engineering Manager" {...register("title")} />
            </Field>
            <Field label="Relationship" htmlFor="relationship" hint="recruiter, referrer, interviewer, peer…">
              <Input id="relationship" {...register("relationship")} />
            </Field>
            <Field label="Next follow-up" htmlFor="nextFollowUpAt" error={e.nextFollowUpAt?.message as string | undefined}>
              <Input id="nextFollowUpAt" type="date" {...register("nextFollowUpAt")} />
            </Field>
            <Field label="Email" htmlFor="email" error={e.email?.message}>
              <Input id="email" type="email" {...register("email")} />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" type="tel" {...register("phone")} />
            </Field>
            <Field label="LinkedIn" htmlFor="linkedinUrl" error={e.linkedinUrl?.message} className="sm:col-span-2">
              <Input id="linkedinUrl" placeholder="https://linkedin.com/in/…" {...register("linkedinUrl")} />
            </Field>
            <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
              <Textarea id="notes" rows={3} {...register("notes")} />
            </Field>
          </div>
          <FormError message={serverError} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{contact ? "Save" : "Add contact"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
