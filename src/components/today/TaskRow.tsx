"use client";

import { useTransition } from "react";
import Link from "next/link";
import { AlarmClock, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { completeTask, snoozeTask } from "@/actions/tasks";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TASK_KIND_LABEL } from "@/lib/stages";
import type { TodayData } from "@/lib/queries/today";

type Task = Omit<TodayData["overdue"][number], "completedAt"> & { completedAt?: Date | null };

export function TaskRow({ task, tone }: { task: Task; tone?: "overdue" | "today" | "upcoming" | "done" }) {
  const [pending, start] = useTransition();
  const href = task.applicationId ? `/applications/${task.applicationId}` : task.contactId ? `/contacts/${task.contactId}` : null;
  const context = task.roleTitle ? `${task.roleTitle} @ ${task.company}` : task.contactName;

  const done = () =>
    start(async () => {
      const r = await completeTask({ id: task.id });
      if (!r.ok) toast.error(r.error);
      else toast.success("Done", { icon: <Check className="h-4 w-4" /> });
    });
  const snooze = (days: number) =>
    start(async () => {
      const r = await snoozeTask({ id: task.id, days });
      if (!r.ok) toast.error(r.error);
      else toast.success(`Snoozed ${days}d`);
    });

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-glass-border bg-card px-3 py-2.5 shadow-card transition-colors", pending && "opacity-50", tone === "done" && "opacity-60 line-through decoration-muted-foreground/60")}>
      <Checkbox aria-label="Mark done" checked={tone === "done"} onCheckedChange={(c) => c && done()} disabled={pending || tone === "done"} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          <span className={cn(tone === "overdue" && "text-destructive font-medium")}>{dateTime(task.dueAt)}</span>
          {context && (
            <>
              {" · "}
              {href ? <Link href={href} className="hover:underline">{context}</Link> : context}
            </>
          )}
        </p>
      </div>
      <span className={cn("hidden rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:inline", task.kind === "interview" ? "bg-stage-interview-soft text-stage-interview-fg" : task.kind === "apply" ? "bg-stage-applied-soft text-stage-applied-fg" : task.kind === "deadline" ? "bg-tone-high-soft text-tone-high-fg" : "bg-muted text-muted-foreground")}>{TASK_KIND_LABEL[task.kind]}</span>
      {tone !== "done" && <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label="Snooze"><AlarmClock className="h-4 w-4" /><ChevronDown className="h-3 w-3" /></Button>} />
        <DropdownMenuContent align="end">
          {[1, 2, 3, 7].map((d) => (
            <DropdownMenuItem key={d} onClick={() => snooze(d)}>Snooze {d} day{d > 1 ? "s" : ""}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>}
    </div>
  );
}
