"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";
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
import { SelectField } from "@/components/forms/SelectField";
import { applyActionErrors, useZodForm } from "@/components/forms/useZodForm";
import { createApplication } from "@/actions/applications";
import { applicationCreate } from "@/schemas";
import { STAGE_LABEL, STAGES } from "@/lib/stages";
import type { Company } from "@/db/schema";
import { ROLE_TYPE_OPTIONS, SOURCE_OPTIONS, WORK_MODE_OPTIONS } from "./constants";

const STAGE_OPTIONS = STAGES.filter((s) => s !== "closed").map((s) => ({ value: s, label: STAGE_LABEL[s] }));
const PRIORITY_OPTIONS = [1, 2, 3, 4, 5].map((p) => ({ value: String(p), label: `P${p}${p === 1 ? " – top" : p === 5 ? " – low" : ""}` }));
const NEW = "__new";

export type ApplicationInitial = {
  companyId?: string;
  companyName?: string;
  role: Partial<{
    title: string;
    location: string;
    workMode: "remote" | "hybrid" | "onsite" | null;
    roleType: "fulltime" | "contract" | "freelance" | "internship" | null;
    salaryMin: string;
    salaryMax: string;
    currency: string;
    sourceUrl: string;
    source: "referral" | "linkedin" | "company_site" | "recruiter" | "job_board" | "other";
    jdText: string;
    postedAt: string;
  }>;
};

export function ApplicationDialog({
  companies,
  defaultCompanyId,
  initial,
  trigger,
}: {
  companies: Company[];
  defaultCompanyId?: string;
  /** Prefill from the clipper. */
  initial?: ApplicationInitial;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const startCompany = initial?.companyId ?? defaultCompanyId ?? (initial?.companyName ? NEW : companies.length ? companies[0].id : NEW);
  const [companyChoice, setCompanyChoice] = useState<string>(startCompany);
  const [newCompanyName, setNewCompanyName] = useState(initial?.companyName ?? "");
  const router = useRouter();

  const form = useZodForm(applicationCreate, {
    defaultValues: {
      company: startCompany === NEW ? { name: initial?.companyName ?? "" } : { id: startCompany },
      role: { title: "", location: "", sourceUrl: "", source: "other", currency: "INR", jdText: "", ...initial?.role },
      stage: "saved",
      priority: 3,
      note: "",
    },
  });
  const { register, handleSubmit, formState, setError, control, reset, setValue } = form;
  const errors = formState.errors;

  const chooseCompany = (v: string | null) => {
    const value = v ?? NEW;
    setCompanyChoice(value);
    if (value === NEW) setValue("company", { name: newCompanyName });
    else setValue("company", { id: value });
  };

  const onSubmit = handleSubmit((values) =>
    start(async () => {
      setServerError(null);
      const payload = companyChoice === NEW ? { ...values, company: { name: newCompanyName } } : values;
      const result = await createApplication(payload);
      const err = applyActionErrors(result, setError as never);
      if (err) return setServerError(err);
      toast.success("Application added");
      setOpen(false);
      reset();
      setNewCompanyName("");
      router.push(`/applications/${result.ok ? result.data.app.id : ""}`);
    }),
  );

  const companyOptions = [...companies.map((c) => ({ value: c.id, label: c.name })), { value: NEW, label: "+ New company" }];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus className="h-4 w-4" /> Add application
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add application</DialogTitle>
            <DialogDescription>Company, role and where it stands. Paste the JD now and the AI tools can use it later.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" htmlFor="company" error={(errors.company as { message?: string } | undefined)?.message}>
              <SelectField id="company" value={companyChoice} onChange={chooseCompany} options={companyOptions} />
            </Field>
            {companyChoice === NEW ? (
              <Field label="New company name" htmlFor="newCompany" error={(errors.company as { name?: { message?: string } } | undefined)?.name?.message}>
                <Input
                  id="newCompany"
                  value={newCompanyName}
                  onChange={(e) => {
                    setNewCompanyName(e.target.value);
                    setValue("company", { name: e.target.value }, { shouldValidate: true });
                  }}
                  required
                />
              </Field>
            ) : (
              <div />
            )}

            <Field label="Role title" htmlFor="title" error={errors.role?.title?.message} className="sm:col-span-2">
              <Input id="title" autoFocus {...register("role.title")} />
            </Field>

            <Field label="Stage" htmlFor="stage">
              <Controller
                control={control}
                name="stage"
                render={({ field }) => <SelectField id="stage" value={field.value} onChange={(v) => field.onChange(v ?? "saved")} options={STAGE_OPTIONS} />}
              />
            </Field>
            <Field label="Priority" htmlFor="priority">
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <SelectField id="priority" value={String(field.value ?? 3)} onChange={(v) => field.onChange(Number(v ?? 3))} options={PRIORITY_OPTIONS} />
                )}
              />
            </Field>

            <Field label="Source" htmlFor="source">
              <Controller
                control={control}
                name="role.source"
                render={({ field }) => <SelectField id="source" value={field.value} onChange={(v) => field.onChange(v ?? "other")} options={SOURCE_OPTIONS} />}
              />
            </Field>
            <Field label="Job URL" htmlFor="sourceUrl" error={errors.role?.sourceUrl?.message}>
              <Input id="sourceUrl" placeholder="https://" {...register("role.sourceUrl")} />
            </Field>

            <Field label="Location" htmlFor="location">
              <Input id="location" {...register("role.location")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Work mode" htmlFor="workMode">
                <Controller
                  control={control}
                  name="role.workMode"
                  render={({ field }) => <SelectField id="workMode" value={field.value} onChange={field.onChange} options={WORK_MODE_OPTIONS} allowEmpty />}
                />
              </Field>
              <Field label="Type" htmlFor="roleType">
                <Controller
                  control={control}
                  name="role.roleType"
                  render={({ field }) => <SelectField id="roleType" value={field.value} onChange={field.onChange} options={ROLE_TYPE_OPTIONS} allowEmpty />}
                />
              </Field>
            </div>

            <Field label="Salary min" htmlFor="salaryMin" error={errors.role?.salaryMin?.message}>
              <Input id="salaryMin" inputMode="numeric" placeholder="e.g. 2400000" {...register("role.salaryMin")} />
            </Field>
            <Field label="Salary max" htmlFor="salaryMax" error={errors.role?.salaryMax?.message}>
              <Input id="salaryMax" inputMode="numeric" {...register("role.salaryMax")} />
            </Field>

            <Field label="Job description" htmlFor="jdText" className="sm:col-span-2">
              <Textarea id="jdText" rows={5} placeholder="Paste the JD text here" {...register("role.jdText")} />
            </Field>
            <Field label="Note" htmlFor="note" className="sm:col-span-2" hint="Recorded on the first history entry.">
              <Input id="note" {...register("note")} />
            </Field>
          </div>

          <FormError message={serverError} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Add application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
