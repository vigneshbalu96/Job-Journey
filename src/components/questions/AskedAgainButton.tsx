"use client";

import { useTransition } from "react";
import { Repeat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markQuestionAsked } from "@/actions/notes";

export function AskedAgainButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await markQuestionAsked({ id });
          if (!r.ok) toast.error(r.error);
          else toast.success("Counted");
        })
      }
    >
      <Repeat className="h-4 w-4" /> Asked again
    </Button>
  );
}
