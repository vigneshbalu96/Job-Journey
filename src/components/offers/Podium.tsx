import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ShineBorder } from "@/components/ui/shine-border";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";
import type { OfferRow } from "@/lib/queries/offers";

const ORDER = [1, 0, 2] as const; // second, first, third
const HEIGHT = ["h-28", "h-20", "h-14"];
const LABEL = ["1st", "2nd", "3rd"];
const TONE: Record<string, string> = {
  received: "bg-stage-applied-soft text-stage-applied-fg",
  negotiating: "bg-stage-screening-soft text-stage-screening-fg",
  accepted: "bg-stage-offer-soft text-stage-offer-fg",
  declined: "bg-stage-closed-soft text-stage-closed-fg",
};

/**
 * Top three offers by total CTC on a podium. The winner gets a shine border;
 * an accepted offer keeps it permanently.
 * Swap target: 21st.dev `trophyso/leaderboard-podium`.
 */
export function Podium({ rows }: { rows: OfferRow[] }) {
  const ranked = [...rows].filter((r) => r.offer.ctcTotal).sort((a, b) => Number(b.offer.ctcTotal) - Number(a.offer.ctcTotal)).slice(0, 3);
  if (ranked.length < 2) return null;
  const slots = ORDER.map((i) => ranked[i]).filter(Boolean);

  return (
    <div className="mb-6 rounded-card border border-glass-border bg-card p-5 shadow-card">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">By total CTC</p>
      <div className="mt-4 flex items-end justify-center gap-3 sm:gap-6">
        {slots.map((r) => {
          const rank = ranked.indexOf(r);
          const accepted = r.offer.status === "accepted";
          const card = (
            <Link href={`/applications/${r.applicationId}`} className="block rounded-card bg-card p-3 text-center transition-transform hover:-translate-y-0.5">
              <span className={cn("mx-auto flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold", rank === 0 ? "bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_var(--accent-500)]" : "bg-accent-50 text-primary dark:bg-primary/15")}>
                {r.company.slice(0, 2).toUpperCase()}
              </span>
              <p className="mt-2 max-w-[9rem] truncate text-sm font-semibold">{r.company}</p>
              <p className="truncate text-xs text-muted-foreground">{r.title}</p>
              <p className="mt-1.5 text-stat tabular text-[1.35rem] leading-tight">{money(r.offer.ctcTotal, r.offer.currency)}</p>
              <Badge className={cn("mt-2 border-0", TONE[r.offer.status])}>{r.offer.status}</Badge>
            </Link>
          );
          return (
            <div key={r.offer.id} className="flex w-40 flex-col items-center sm:w-48">
              {rank === 0 || accepted ? <ShineBorder className="w-full" speedSec={accepted ? 4 : 7}>{card}</ShineBorder> : <div className="w-full rounded-card border border-glass-border">{card}</div>}
              <div
                className={cn(
                  "mt-2 flex w-full items-start justify-center rounded-t-xl border border-glass-border pt-2 text-xs font-bold tracking-wide text-muted-foreground",
                  HEIGHT[rank],
                  rank === 0 ? "bg-gradient-to-b from-accent-50 to-accent-50/30 text-primary dark:from-primary/25 dark:to-primary/5" : "bg-gradient-to-b from-muted to-muted/30",
                )}
              >
                {LABEL[rank]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
