import { StageBadge } from "@/components/pipeline/StageBadge";
import { dateTime } from "@/lib/format";
import type { ApplicationStageEvent } from "@/db/schema";

export function StageHistory({ events }: { events: ApplicationStageEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground">No history yet.</p>;
  return (
    <ol className="relative border-l pl-5 space-y-5">
      {events.map((ev) => (
        <li key={ev.id} className="relative">
          <span className="absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={ev.toStage} closeReason={ev.closeReason} />
            {ev.roundLabel && <span className="text-sm font-medium">{ev.roundLabel}</span>}
            <span className="text-xs text-muted-foreground">{dateTime(ev.occurredAt)}</span>
          </div>
          {ev.note && <p className="mt-1 text-sm whitespace-pre-wrap">{ev.note}</p>}
        </li>
      ))}
    </ol>
  );
}
