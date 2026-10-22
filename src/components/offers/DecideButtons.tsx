"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { decideOffer } from "@/actions/offers";
import { fireConfetti } from "@/lib/confetti";
import type { Offer } from "@/db/schema";

export function DecideButtons({ offer }: { offer: Offer }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const run = (decision: "accepted" | "declined" | "negotiating") =>
    start(async () => {
      const r = await decideOffer({ id: offer.id, decision });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(decision === "accepted" ? "Congratulations. Search closed." : decision === "declined" ? "Declined" : "Marked as negotiating");
        if (decision === "accepted") void fireConfetti();
      }
      setOpen(false);
    });
  if (offer.status === "accepted" || offer.status === "declined") return null;
  return (
    <div className="flex flex-wrap gap-2">
      {offer.status !== "negotiating" && <Button size="sm" variant="outline" disabled={pending} onClick={() => run("negotiating")}>Negotiating</Button>}
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run("declined")}>Decline</Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button size="sm" disabled={pending}>Accept</Button>} />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept this offer?</AlertDialogTitle>
            <AlertDialogDescription>This closes the application as accepted, withdraws every other open application, and declines other offers. The history keeps everything.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={() => run("accepted")}>Accept offer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
