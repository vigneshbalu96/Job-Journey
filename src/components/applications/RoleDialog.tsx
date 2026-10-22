"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/forms/Field";
import { SelectField } from "@/components/forms/SelectField";
import { applyActionErrors, useZodForm } from "@/components/forms/useZodForm";
import { updateRole } from "@/actions/roles";
import { roleUpdate } from "@/schemas";
import { toInputDate, toInputMoney } from "@/lib/format";
import { ROLE_TYPE_OPTIONS, SOURCE_OPTIONS, WORK_MODE_OPTIONS } from "@/components/pipeline/constants";
import type { Role } from "@/db/schema";

export function RoleDialog({ role, trigger }: { role: Role; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const form = useZodForm(roleUpdate, {
    defaultValues: {
      id: role.id,
      companyId: role.companyId,
      title: role.title,
      roleType: role.roleType,
      workMode: role.workMode,
      location: role.location ?? "",
      salaryMin: toInputMoney(role.salaryMin),
      salaryMax: toInputMoney(role.salaryMax),
      currency: role.currency ?? "INR",
      sourceUrl: role.sourceUrl ?? "",
      source: role.source,
      jdText: role.jdText ?? "",
      postedAt: toInputDate(role.postedAt),
    },
  });
  const { register, handleSubmit, formState, setError, control } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit((values) =>
    start(async () => {
      setServerError(null);
      const result = await updateRole(values);
      const err = applyActionErrors(result, setError as never);
      if (err) return setServerError(err);
      toast.success("Role updated");
      setOpen(false);
      router.refresh();
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> Edit role</Button>} />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>The posting details. The AI tools read the job description from here.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role title" htmlFor="title" error={e.title?.message} className="sm:col-span-2">
              <Input id="title" {...register("title")} />
            </Field>
            <Field label="Source" htmlFor="source">
              <Controller control={control} name="source" render={({ field }) => <SelectField id="source" value={field.value} onChange={(v) => field.onChange(v ?? "other")} options={SOURCE_OPTIONS} />} />
            </Field>
            <Field label="Job URL" htmlFor="sourceUrl" error={e.sourceUrl?.message}>
              <Input id="sourceUrl" placeholder="https://" {...register("sourceUrl")} />
            </Field>
            <Field label="Location" htmlFor="location">
              <Input id="location" {...register("location")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Work mode" htmlFor="workMode">
                <Controller control={control} name="workMode" render={({ field }) => <SelectField id="workMode" value={field.value} onChange={field.onChange} options={WORK_MODE_OPTIONS} allowEmpty />} />
              </Field>
              <Field label="Type" htmlFor="roleType">
                <Controller control={control} name="roleType" render={({ field }) => <SelectField id="roleType" value={field.value} onChange={field.onChange} options={ROLE_TYPE_OPTIONS} allowEmpty />} />
              </Field>
            </div>
            <Field label="Salary min" htmlFor="salaryMin" error={e.salaryMin?.message}>
              <Input id="salaryMin" inputMode="numeric" {...register("salaryMin")} />
            </Field>
            <Field label="Salary max" htmlFor="salaryMax" error={e.salaryMax?.message}>
              <Input id="salaryMax" inputMode="numeric" {...register("salaryMax")} />
            </Field>
            <Field label="Posted on" htmlFor="postedAt">
              <Input id="postedAt" type="date" {...register("postedAt")} />
            </Field>
            <Field label="Currency" htmlFor="currency">
              <Input id="currency" maxLength={3} {...register("currency")} />
            </Field>
            <Field label="Job description" htmlFor="jdText" className="sm:col-span-2">
              <Textarea id="jdText" rows={12} {...register("jdText")} />
            </Field>
          </div>
          <FormError message={serverError} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
