"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { daysIn, shortDate } from "@/lib/format";
import type { PipelineCard } from "@/lib/queries/applications";
import { StageBadge } from "./StageBadge";

export function PipelineTable({ cards }: { cards: PipelineCard[] }) {
  const [query, setQuery] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => (showClosed || c.stage !== "closed") && (!q || `${c.title} ${c.company} ${c.location ?? ""}`.toLowerCase().includes(q)));
  }, [cards, query, showClosed]);
  const closedCount = cards.filter((c) => c.stage === "closed").length;
  return (
    <>
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by role, company, location" className="pl-8" aria-label="Filter rows" />
      </div>
      <button type="button" onClick={() => setShowClosed((v) => !v)} className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
        {showClosed ? "Hide closed" : `Show closed (${closedCount})`}
      </button>
      <span className="ml-auto text-xs text-muted-foreground">{rows.length} of {cards.length}</span>
    </div>
    <div className="rounded-xl border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>In stage</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">
                <Link href={`/applications/${c.id}`} className="hover:underline">
                  {c.title}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/companies/${c.companyId}`} className="hover:underline">
                  {c.company}
                </Link>
              </TableCell>
              <TableCell>
                <StageBadge stage={c.stage} closeReason={c.closeReason} />
              </TableCell>
              <TableCell>{daysIn(c.stageEnteredAt)}d</TableCell>
              <TableCell>{shortDate(c.appliedAt)}</TableCell>
              <TableCell className="capitalize">{c.source.replace("_", " ")}</TableCell>
              <TableCell className="text-right">P{c.priority}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </>
  );
}
