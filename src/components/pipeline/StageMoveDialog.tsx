"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/forms/Field";
import { SelectField } from "@/components/forms/SelectField";
import { transitionStage } from "@/actions/applications";
import { STAGE_LABEL } from "@/lib/stages";
import type { ApplicationStage, CloseReason } from "@/db/schema";
import { CLOSE_REASON_OPTIONS } from "./constants";

export type PendingMove = { id: string; title: string; from: ApplicationStage; to: ApplicationStage };

/**
 * Collects the extra detail a move needs: a close reason, or an optional round
 * label / note for interview rounds. Plain moves skip this dialog entirely.
 */
export function StageMoveDialog({
  move,
  onClose,
  onDone,
}: {
  move: PendingMove | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [closeReason, setCloseReason] = useState<CloseReason | null>(null);
  const [roundLabel, setRoundLabel] = useState("");
  const [interviewAt, setInterviewAt] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reset = () => {
    setCloseReason(null);
    setRoundLabel("");
    setInterviewAt("");
    setNote("");
    setError(null);
  };

  const submit = () =>
    start(async () => {
      if (!move) return;
      setError(null);
      const result = await transitionStage({
        id: move.id,
        to: move.to,
        closeReason: move.to === "closed" ? closeReason : null,
        roundLabel: roundLabel || null,
        interviewAt: move.to === "interview" && interviewAt ? interviewAt : null,
        note: note || null,
      });
      if (!result.ok) return setError(result.error);
      toast.success(`Moved to ${STAGE_LABEL[move.to]}`);
      reset();
      onDone?.();
      onClose();
    });

  const isClose = move?.to === "closed";

  return (
    <Dialog open={!!move} onOpenChange={(o) => !o && (reset(), onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isClose ? "Close application" : `Move to ${move ? STAGE_LABEL[move.to] : ""}`}</DialogTitle>
          <DialogDescription>{move?.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isClose && (
            <Field label="Why did it close?" htmlFor="closeReason">
              <SelectField id="closeReason" value={closeReason} onChange={setCloseReason} options={CLOSE_REASON_OPTIONS} placeholder="Pick a reason" />
              {closeReason === "accepted" && (
                <p className="text-xs text-muted-foreground">
                  Accepting withdraws every other open application and ends the search. Congratulations.
                </p>
              )}
            </Field>
          )}
          {move?.to === "interview" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Round" htmlFor="roundLabel" hint="e.g. Round 2 – system design">
                <Input id="roundLabel" value={roundLabel} onChange={(e) => setRoundLabel(e.target.value)} />
              </Field>
              <Field label="Interview at" htmlFor="interviewAt" hint="Creates a task on Today">
                <Input id="interviewAt" type="datetime-local" value={interviewAt} onChange={(e) => setInterviewAt(e.target.value)} />
              </Field>
            </div>
          )}
          <Field label="Note" htmlFor="note">
            <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened?" />
          </Field>
          <FormError message={error} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => (reset(), onClose())}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || (isClose && !closeReason)}>
            {isClose ? "Close application" : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
