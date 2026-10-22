import Link from "next/link";
import { Pencil, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listOffers } from "@/lib/queries/offers";
import { listPipeline } from "@/lib/queries/applications";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OfferDialog } from "@/components/offers/OfferDialog";
import { DecideButtons } from "@/components/offers/DecideButtons";
import { Podium } from "@/components/offers/Podium";
import { DeleteButton } from "@/components/common/DeleteButton";
import { deleteOffer } from "@/actions/offers";
import { money, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Offers" };

const STATUS_TONE: Record<string, string> = {
  received: "bg-stage-applied-soft text-stage-applied-fg",
  negotiating: "bg-stage-screening-soft text-stage-screening-fg",
  accepted: "bg-stage-offer-soft text-stage-offer-fg",
  declined: "bg-stage-closed-soft text-stage-closed-fg",
};

export default async function OffersPage() {
  const { userId } = await requireUser();
  const [rows, pipeline] = await Promise.all([listOffers(userId), listPipeline(userId)]);
  const candidates = pipeline.filter((p) => p.stage !== "closed").map((p) => ({ id: p.id, label: `${p.title} @ ${p.company}` }));
  const best = Math.max(0, ...rows.map((r) => Number(r.offer.ctcTotal ?? 0)));

  const metrics: { label: string; get: (r: (typeof rows)[number]) => React.ReactNode }[] = [
    { label: "Status", get: (r) => <Badge className={cn("border-0", STATUS_TONE[r.offer.status])}>{r.offer.status}</Badge> },
    { label: "Total CTC", get: (r) => <span className={cn("font-semibold tabular-nums", Number(r.offer.ctcTotal) === best && best > 0 && "text-stage-offer-fg")}>{money(r.offer.ctcTotal, r.offer.currency)}</span> },
    { label: "Base", get: (r) => money(r.offer.baseAnnual, r.offer.currency) },
    { label: "Variable", get: (r) => money(r.offer.variableAnnual, r.offer.currency) },
    { label: "Equity / yr", get: (r) => <span title={r.offer.equityDescription ?? undefined}>{money(r.offer.equityValueAnnual, r.offer.currency)}</span> },
    { label: "Sign-on", get: (r) => money(r.offer.signOn, r.offer.currency) },
    { label: "Location", get: (r) => [r.offer.location, r.offer.workMode].filter(Boolean).join(" · ") || "—" },
    { label: "Notice", get: (r) => (r.offer.noticePeriodDays != null ? `${r.offer.noticePeriodDays}d` : "—") },
    { label: "Joining", get: (r) => shortDate(r.offer.joiningDate) },
    { label: "Decide by", get: (r) => shortDate(r.offer.deadlineAt) },
    { label: "Notes", get: (r) => <span className="text-xs whitespace-pre-wrap">{r.offer.decisionNotes ?? "—"}</span> },
  ];

  return (
    <>
      <PageHeader icon={Trophy} title="Offers" subtitle="Side by side. The numbers are only half of it; write the other half in notes." actions={<OfferDialog applications={candidates} />} />
      {rows.length === 0 ? (
        <EmptyState icon={Trophy} title="No offers yet" description="When one lands, record it here and the application moves to the Offer stage automatically." />
      ) : (
        <>
        <Podium rows={rows} />
        <div className="rounded-card border border-glass-border bg-card overflow-x-auto shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36" />
                {rows.map((r) => (
                  <TableHead key={r.offer.id} className="min-w-56 align-top py-3">
                    <Link href={`/applications/${r.applicationId}`} className="block font-semibold text-foreground hover:underline">{r.company}</Link>
                    <span className="block text-xs font-normal text-muted-foreground">{r.title}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m) => (
                <TableRow key={m.label}>
                  <TableCell className="text-xs font-medium text-muted-foreground">{m.label}</TableCell>
                  {rows.map((r) => <TableCell key={r.offer.id} className="align-top">{m.get(r)}</TableCell>)}
                </TableRow>
              ))}
              <TableRow>
                <TableCell />
                {rows.map((r) => (
                  <TableCell key={r.offer.id} className="align-top space-y-2">
                    <DecideButtons offer={r.offer} />
                    <div className="flex gap-1">
                      <OfferDialog offer={r.offer} applications={candidates} trigger={<Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /> Edit</Button>} />
                      <DeleteButton id={r.offer.id} action={deleteOffer} label="offer" size="icon" />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
        </>
      )}
    </>
  );
}
