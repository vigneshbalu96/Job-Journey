"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action";

/** Soft-delete confirm. The row is hidden, never destroyed, so the copy says "remove". */
export function DeleteButton({
  id,
  action,
  label,
  redirectTo,
  warning,
  size = "sm",
}: {
  id: string;
  action: (input: { id: string }) => Promise<ActionResult<unknown>>;
  label: string;
  redirectTo?: string;
  warning?: string;
  size?: "sm" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const confirm = () =>
    start(async () => {
      const result = await action({ id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Removed ${label}`);
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size={size} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            {size === "sm" && "Remove"}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            It is hidden from your lists and kept in your history for the audit trail. {warning}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={pending}>
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
