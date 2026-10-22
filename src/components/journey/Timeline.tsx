import Link from "next/link";
import { Briefcase, MessageCircle, CheckSquare, Trophy } from "lucide-react";
import { StageBadge } from "@/components/pipeline/StageBadge";
import { dateTime } from "@/lib/format";
import type { TimelineItem } from "@/lib/queries/journey";

const ICON = { stage: Briefcase, interaction: MessageCircle, task: CheckSquare, offer: Trophy } as const;

export function Timeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nothing yet. The first saved role starts the clock.</p>;
  let lastDay = "";
  return (
    <ol className="relative border-l pl-6 space-y-4">
      {items.map((it) => {
        const day = new Date(it.at).toDateString();
        const showDay = day !== lastDay;
        lastDay = day;
        const Icon = ICON[it.kind];
        const body = (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {it.stage ? <StageBadge stage={it.stage} /> : <span className="text-xs uppercase tracking-wide text-muted-foreground">{it.kind}</span>}
              <span className="text-sm font-medium">{it.title}</span>
              <span className="text-xs text-muted-foreground">{dateTime(it.at)}</span>
            </div>
            {it.detail && <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{it.detail}</p>}
          </>
        );
        return (
          <li key={it.id} className="relative">
            {showDay && <p className="mb-2 -ml-6 pl-6 text-xs font-semibold text-muted-foreground">{new Date(it.at).toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>}
            <span className="absolute -left-[1.95rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border bg-background">
              <Icon className="h-3 w-3 text-muted-foreground" />
            </span>
            {it.href ? <Link href={it.href} className="block rounded-md hover:bg-muted/60 -mx-2 px-2 py-1">{body}</Link> : <div className="py-1">{body}</div>}
          </li>
        );
      })}
    </ol>
  );
}
