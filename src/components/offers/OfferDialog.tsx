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
import { createOffer, updateOffer } from "@/actions/offers";
import { offerInput } from "@/schemas";
import { toInputDate, toInputMoney } from "@/lib/format";
import { WORK_MODE_OPTIONS } from "@/components/pipeline/constants";
import type { Offer } from "@/db/schema";

export function OfferDialog({
  offer,
  applications,
  applicationId,
  trigger,
}: {
  offer?: Offer;
  applications: { id: string; label: string }[];
  applicationId?: string;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useZodForm(offerInput, {
    defaultValues: {
      applicationId: offer?.applicationId ?? applicationId ?? applications[0]?.id ?? "",
      baseAnnual: toInputMoney(offer?.baseAnnual),
      variableAnnual: toInputMoney(offer?.variableAnnual),
      equityDescription: offer?.equityDescription ?? "",
      equityValueAnnual: toInputMoney(offer?.equityValueAnnual),
      signOn: toInputMoney(offer?.signOn),
      currency: offer?.currency ?? "INR",
      location: offer?.location ?? "",
      workMode: offer?.workMode ?? null,
      noticePeriodDays: offer?.noticePeriodDays ?? null,
      joiningDate: toInputDate(offer?.joiningDate),
      deadlineAt: toInputDate(offer?.deadlineAt),
      decisionNotes: offer?.decisionNotes ?? "",
      status: offer?.status ?? "received",
    },
  });
  const { register, handleSubmit, formState, setError, control, reset } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit((values) =>
    start(async () => {
      setServerError(null);
      const result = offer ? await updateOffer({ id: offer.id, ...values }) : await createOffer(values);
      const err = applyActionErrors(result, setError as never);
      if (err) return setServerError(err);
      toast.success(offer ? "Offer updated" : "Offer recorded");
      setOpen(false);
      if (!offer) reset();
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button><Plus className="h-4 w-4" /> Record offer</Button>} />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{offer ? "Edit offer" : "Record an offer"}</DialogTitle>
            <DialogDescription>Annual figures. Total CTC is computed as base + variable + annualised equity.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            {!offer && (
              <Field label="Application" htmlFor="applicationId" error={e.applicationId?.message} className="sm:col-span-3">
                <Controller control={control} name="applicationId" render={({ field }) => <SelectField id="applicationId" value={field.value} onChange={(v) => field.onChange(v ?? "")} options={applications.map((a) => ({ value: a.id, label: a.label }))} />} />
              </Field>
            )}
            <Field label="Currency" htmlFor="currency"><Input id="currency" maxLength={3} {...register("currency")} /></Field>
            <Field label="Base (annual)" htmlFor="baseAnnual" error={e.baseAnnual?.message}><Input id="baseAnnual" inputMode="numeric" {...register("baseAnnual")} /></Field>
            <Field label="Variable (annual)" htmlFor="variableAnnual" error={e.variableAnnual?.message}><Input id="variableAnnual" inputMode="numeric" {...register("variableAnnual")} /></Field>
            <Field label="Equity (annualised value)" htmlFor="equityValueAnnual" error={e.equityValueAnnual?.message}><Input id="equityValueAnnual" inputMode="numeric" {...register("equityValueAnnual")} /></Field>
            <Field label="Equity details" htmlFor="equityDescription" className="sm:col-span-2"><Input id="equityDescription" placeholder="e.g. 4000 RSUs over 4 years, 1-year cliff" {...register("equityDescription")} /></Field>
            <Field label="Sign-on" htmlFor="signOn" error={e.signOn?.message}><Input id="signOn" inputMode="numeric" {...register("signOn")} /></Field>
            <Field label="Notice period (days)" htmlFor="noticePeriodDays"><Input id="noticePeriodDays" inputMode="numeric" {...register("noticePeriodDays")} /></Field>
            <Field label="Location" htmlFor="location"><Input id="location" {...register("location")} /></Field>
            <Field label="Work mode" htmlFor="workMode">
              <Controller control={control} name="workMode" render={({ field }) => <SelectField id="workMode" value={field.value} onChange={field.onChange} options={WORK_MODE_OPTIONS} allowEmpty />} />
            </Field>
            <Field label="Joining date" htmlFor="joiningDate"><Input id="joiningDate" type="date" {...register("joiningDate")} /></Field>
            <Field label="Decide by" htmlFor="deadlineAt"><Input id="deadlineAt" type="date" {...register("deadlineAt")} /></Field>
            <Field label="Decision notes" htmlFor="decisionNotes" className="sm:col-span-3" hint="Growth, manager, team, commute, anything the numbers miss.">
              <Textarea id="decisionNotes" rows={3} {...register("decisionNotes")} />
            </Field>
          </div>
          <FormError message={serverError} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{offer ? "Save" : "Record offer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
