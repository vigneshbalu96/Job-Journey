"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StageMoveDialog, type PendingMove } from "@/components/pipeline/StageMoveDialog";
import { STAGE_LABEL, STAGES } from "@/lib/stages";
import type { ApplicationStage } from "@/db/schema";

/** "Move to…" menu on the application page. Every move goes through the dialog so a note can be added. */
export function StageActions({ id, title, stage }: { id: string; title: string; stage: ApplicationStage }) {
  const [move, setMove] = useState<PendingMove | null>(null);
  const targets = STAGES.filter((s) => s !== stage || s === "interview");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="sm">
              <ArrowRight className="h-4 w-4" /> Move <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {targets.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setMove({ id, title, from: stage, to: s })}>
                {s === stage && s === "interview" ? "Log another interview round" : STAGE_LABEL[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <StageMoveDialog move={move} onClose={() => setMove(null)} />
    </>
  );
}
