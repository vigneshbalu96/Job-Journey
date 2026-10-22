"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/forms/Field";
import { applyActionErrors, useZodForm } from "@/components/forms/useZodForm";
import { createCompany, updateCompany } from "@/actions/companies";
import { companyInput } from "@/schemas";
import type { Company } from "@/db/schema";

export function CompanyDialog({ company, trigger }: { company?: Company; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useZodForm(companyInput, {
    defaultValues: {
      name: company?.name ?? "",
      website: company?.website ?? "",
      domain: company?.domain ?? "",
      industry: company?.industry ?? "",
      size: company?.size ?? "",
      hqLocation: company?.hqLocation ?? "",
      linkedinUrl: company?.linkedinUrl ?? "",
      notes: company?.notes ?? "",
    },
  });
  const { register, handleSubmit, formState, setError, reset } = form;

  const onSubmit = handleSubmit((values) =>
    start(async () => {
      setServerError(null);
      const result = company ? await updateCompany({ id: company.id, ...values }) : await createCompany(values);
      const err = applyActionErrors(result, setError as never);
      if (err) return setServerError(err);
      toast.success(company ? "Company updated" : "Company added");
      setOpen(false);
      if (!company) reset();
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus className="h-4 w-4" /> Add company
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{company ? "Edit company" : "Add company"}</DialogTitle>
            <DialogDescription>Only the name is required. Fill the rest as you learn it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="name" error={formState.errors.name?.message} className="sm:col-span-2">
              <Input id="name" autoFocus {...register("name")} />
            </Field>
            <Field label="Website" htmlFor="website" error={formState.errors.website?.message}>
              <Input id="website" placeholder="https://" {...register("website")} />
            </Field>
            <Field label="LinkedIn" htmlFor="linkedinUrl" error={formState.errors.linkedinUrl?.message}>
              <Input id="linkedinUrl" placeholder="https://linkedin.com/company/…" {...register("linkedinUrl")} />
            </Field>
            <Field label="Industry" htmlFor="industry">
              <Input id="industry" {...register("industry")} />
            </Field>
            <Field label="Size" htmlFor="size" hint="e.g. 50–200">
              <Input id="size" {...register("size")} />
            </Field>
            <Field label="HQ location" htmlFor="hqLocation" className="sm:col-span-2">
              <Input id="hqLocation" {...register("hqLocation")} />
            </Field>
            <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
              <Textarea id="notes" rows={3} {...register("notes")} />
            </Field>
          </div>
          <FormError message={serverError} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {company ? "Save" : "Add company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
